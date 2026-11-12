from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, F, OuterRef, Subquery
from django.db.models.functions import Greatest
from django.utils import timezone
from rest_framework import status
from rest_framework.filters import SearchFilter
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Faculty, Student
from accounts.permissions import IsFaculty, IsStudent

from .models import Course, Enrollment, EnrollmentRequest, PreviousEnrollment
from .rules import needs_approval
from .serializers import (
    AvailableCourseSerializer,
    CourseSerializer,
    EnrollmentRequestSerializer,
    EnrollSerializer,
    PreviousEnrollmentSerializer,
)

# ---------------------------------------------------------------- student: the three tabs


class StudentCourseList(ListAPIView):
    """
    GET /api/student/courses/            (tab: Enrolled courses)
    GET /api/student/courses/?search=os  search by course name or code
    The courses the logged-in student is enrolled in.
    """

    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    filter_backends = [SearchFilter]
    search_fields = ["code", "name"]

    def get_queryset(self):
        # A Student row shares its primary key with the User, so request.user.pk
        # is the student id. Only this student's enrollments are matched.
        return (
            Course.objects
            .filter(enrollments__student_id=self.request.user.pk)
            .select_related("faculty")
            .order_by("code")
        )


class AvailableCourseList(ListAPIView):
    """
    GET /api/student/courses/available/            (tab: Courses to enroll)
    GET /api/student/courses/available/?search=os  search by course name or code
    Courses the student is NOT enrolled in yet, with seats left, whether joining
    needs the faculty's approval, and the state of any request already sent.
    """

    serializer_class = AvailableCourseSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    filter_backends = [SearchFilter]
    search_fields = ["code", "name"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["student_department"] = (
            Student.objects.filter(pk=self.request.user.pk)
            .values_list("department", flat=True).first() or ""
        )
        return context

    def get_queryset(self):
        student_id = self.request.user.pk
        mine = Enrollment.objects.filter(course=OuterRef("pk"), student_id=student_id)
        latest_request = (
            EnrollmentRequest.objects
            .filter(course=OuterRef("pk"), student_id=student_id)
            .order_by("-requested_at", "-id")
            .values("status")[:1]
        )
        return (
            Course.objects
            .select_related("faculty")
            .annotate(
                is_enrolled=Exists(mine),
                taken=Count("enrollments"),
                department=F("faculty__department"),
                latest_request=Subquery(latest_request),
            )
            .filter(is_enrolled=False)
            # Never negative, even if a course's capacity was later set below its enrolled count
            .annotate(seats_left=Greatest(F("capacity") - F("taken"), 0))
            .order_by("code")
        )


class PreviousCourseList(ListAPIView):
    """
    GET /api/student/courses/previous/            (tab: Previously enrolled)
    GET /api/student/courses/previous/?search=os  search by course name or code
    The student's earlier courses with grade, attendance and Completed / Failed.
    """

    serializer_class = PreviousEnrollmentSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    filter_backends = [SearchFilter]
    search_fields = ["course__code", "course__name"]

    def get_queryset(self):
        return (
            PreviousEnrollment.objects
            .filter(student_id=self.request.user.pk)
            .select_related("course__faculty")
            .order_by("course__code")
        )


# ---------------------------------------------------------------- student: enrolling


def _first_message(errors):
    """Flatten DRF's error dictionary into one message the frontend can show."""
    for messages in errors.values():
        if messages:
            return str(messages[0])
    return "Invalid request."


class StudentEnroll(APIView):
    """
    POST /api/student/enrollments/     body: {"course": "CS202"}

    Own department (or an open elective): the student is enrolled straight away -> 201.
    Another department: a request goes to the course's faculty -> 202.
    The student is never sent in the body: it comes from the token.
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        student = Student.objects.filter(pk=request.user.pk).first()
        if student is None:
            return Response(
                {"message": "No student profile found for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EnrollSerializer(data=request.data, context={"student": student})
        if not serializer.is_valid():
            errors = serializer.errors
            not_found = any(e.code == "not_found" for e in errors.get("course", []))
            return Response(
                {"message": _first_message(errors), "errors": errors},
                status=status.HTTP_404_NOT_FOUND if not_found else status.HTTP_400_BAD_REQUEST,
            )

        course = serializer.validated_data["course"]
        course_data = CourseSerializer(course).data
        try:
            with transaction.atomic():
                if needs_approval(student.department, course.faculty.department):
                    EnrollmentRequest.objects.create(student=student, course=course)
                    return Response(
                        {
                            "status": "requested",
                            "message": f"Request sent to {course.faculty.name} for approval.",
                            "course": course_data,
                        },
                        status=status.HTTP_202_ACCEPTED,
                    )
                Enrollment.objects.create(
                    student=student, course=course, enroll_date=timezone.localdate()
                )
        except IntegrityError:
            # Two clicks at the same moment: the database's unique rule caught the second
            return Response(
                {"message": "You have already enrolled in, or requested, this course."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"status": "enrolled", "message": f"You are now enrolled in {course.code}.",
             "course": course_data},
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------- faculty: the requests


class FacultyRequestList(ListAPIView):
    """
    GET /api/faculty/enrollment-requests/                 pending requests (default)
    GET /api/faculty/enrollment-requests/?status=all      or approved / rejected / pending
    Only requests for courses taught by the logged-in faculty member.
    """

    serializer_class = EnrollmentRequestSerializer
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        queryset = (
            EnrollmentRequest.objects
            .filter(course__faculty_id=self.request.user.pk)
            .select_related("student", "course")
        )
        # A missing or blank ?status= means "pending"
        wanted = (self.request.query_params.get("status") or "pending").strip().lower()
        if wanted != "all":
            queryset = queryset.filter(status=wanted)
        return queryset.order_by("requested_at", "id")


class DecideEnrollmentRequest(APIView):
    """Shared logic for approve and reject. The two views below set `approve`."""

    permission_classes = [IsAuthenticated, IsFaculty]
    approve = None

    def post(self, request, pk):
        # Filtering by the faculty's own courses means a request for someone
        # else's course simply looks like it doesn't exist.
        enrollment_request = (
            EnrollmentRequest.objects
            .select_related("student", "course")
            .filter(pk=pk, course__faculty_id=request.user.pk)
            .first()
        )
        if enrollment_request is None:
            return Response({"message": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        faculty = Faculty.objects.get(pk=request.user.pk)
        with transaction.atomic():
            if enrollment_request.status != EnrollmentRequest.Status.PENDING:
                return Response(
                    {"message": f"This request was already {enrollment_request.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if self.approve:
                course = enrollment_request.course
                if course.enrollments.count() >= course.capacity:
                    return Response(
                        {"message": "This course is full."}, status=status.HTTP_400_BAD_REQUEST
                    )
                # This is the moment the course is added to the student's enrolled courses
                Enrollment.objects.get_or_create(
                    student=enrollment_request.student,
                    course=course,
                    defaults={"enroll_date": timezone.localdate()},
                )
                enrollment_request.status = EnrollmentRequest.Status.APPROVED
            else:
                enrollment_request.status = EnrollmentRequest.Status.REJECTED
            enrollment_request.decided_at = timezone.now()
            enrollment_request.decided_by = faculty
            enrollment_request.save()

        return Response(EnrollmentRequestSerializer(enrollment_request).data)


class ApproveEnrollmentRequest(DecideEnrollmentRequest):
    """POST /api/faculty/enrollment-requests/<id>/approve/"""
    approve = True


class RejectEnrollmentRequest(DecideEnrollmentRequest):
    """POST /api/faculty/enrollment-requests/<id>/reject/"""
    approve = False
