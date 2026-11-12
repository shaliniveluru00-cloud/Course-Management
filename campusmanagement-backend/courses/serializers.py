from django.utils import timezone
from rest_framework import serializers

from .models import Assignment, Course, CourseSchedule, Enrollment, EnrollmentRequest, PreviousEnrollment
from .rules import needs_approval


class CourseSerializer(serializers.ModelSerializer):
    # Not a column on Course: pulled from the linked Faculty row
    faculty_name = serializers.CharField(source="faculty.name", read_only=True)

    class Meta:
        model = Course
        fields = ["code", "name", "credits", "faculty_name"]


class AvailableCourseSerializer(CourseSerializer):
    """A course the student could still join ("Courses to enroll").
    The view attaches department, seats_left and latest_request to each course."""

    department = serializers.CharField(read_only=True)
    seats_left = serializers.IntegerField(read_only=True)
    needs_approval = serializers.SerializerMethodField()
    request_status = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + [
            "department", "seats_left", "needs_approval", "request_status",
        ]

    def get_needs_approval(self, course):
        return needs_approval(self.context["student_department"], course.department)

    def get_request_status(self, course):
        # "none", "pending" or "rejected". An approved request means the student is enrolled
        # and the course isn't listed; if the enrollment was removed later, start fresh.
        if course.latest_request in (None, EnrollmentRequest.Status.APPROVED):
            return "none"
        return course.latest_request


class PreviousEnrollmentSerializer(serializers.ModelSerializer):
    """A previously enrolled course with grade, attendance and Completed / Failed."""

    code = serializers.CharField(source="course.code", read_only=True)
    name = serializers.CharField(source="course.name", read_only=True)
    credits = serializers.IntegerField(source="course.credits", read_only=True)
    faculty_name = serializers.CharField(source="course.faculty.name", read_only=True)
    attendance = serializers.FloatField(source="attendance_percent", read_only=True)

    class Meta:
        model = PreviousEnrollment
        fields = [
            "code", "name", "credits", "faculty_name",
            "grade", "classes_held", "classes_attended", "attendance", "status",
        ]


class EnrollSerializer(serializers.Serializer):
    """Checks the body of POST /api/student/enrollments/ :  {"course": "CS202"}"""

    course = serializers.CharField()

    def validate_course(self, code):
        # Runs for the "course" field only. Turns the code into the Course row.
        try:
            return Course.objects.get(code=code.strip().upper())
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found.", code="not_found")

    def validate(self, data):
        # Runs after the field check. The rules that involve this student.
        course = data["course"]
        student = self.context["student"]

        if Enrollment.objects.filter(student=student, course=course).exists():
            raise serializers.ValidationError("Already enrolled in this course.")
        if EnrollmentRequest.objects.filter(
            student=student, course=course, status=EnrollmentRequest.Status.PENDING
        ).exists():
            raise serializers.ValidationError("You already have a pending request for this course.")
        if course.enrollments.count() >= course.capacity:
            raise serializers.ValidationError("This course is full.")
        return data


class EnrollmentRequestSerializer(serializers.ModelSerializer):
    """What a faculty member sees for each request."""

    student_name = serializers.CharField(source="student.name", read_only=True)
    roll_no = serializers.CharField(source="student.roll_no", read_only=True)
    student_department = serializers.CharField(source="student.department", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = EnrollmentRequest
        fields = [
            "id", "student_name", "roll_no", "student_department",
            "course_code", "course_name", "status", "requested_at", "decided_at",
        ]


class StudentAssignmentSerializer(serializers.ModelSerializer):
    """One assignment as the logged-in student sees it. The view attaches
    submitted_date, marks, letter_grade and remarks (all empty if not submitted / not graded)."""

    course_code = serializers.CharField(source="course.code", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    submitted_date = serializers.DateField(read_only=True)
    status = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "course_code", "course_name", "due_date",
            "max_marks", "submitted_date", "status", "grade",
        ]

    def get_status(self, assignment):
        # submitted  -> a Submission row exists
        # pending    -> not submitted, due date still ahead (or no due date)
        # missing    -> not submitted, due date has passed
        if assignment.submitted_date is not None:
            return "submitted"
        if assignment.due_date is None or assignment.due_date >= timezone.localdate():
            return "pending"
        return "missing"

    def get_grade(self, assignment):
        # None until the faculty has graded the submission
        if assignment.marks is None:
            return None
        return {
            "marks": assignment.marks,
            "out_of": assignment.max_marks,
            "letter": assignment.letter_grade,
            "remarks": assignment.remarks,
        }


class StudentGradeSerializer(serializers.ModelSerializer):
    """One row of the student's Grades page: course name, faculty name, grade."""

    course_name = serializers.CharField(source="course.name", read_only=True)
    faculty_name = serializers.CharField(source="course.faculty.name", read_only=True)

    class Meta:
        model = PreviousEnrollment
        fields = ["course_name", "faculty_name", "grade"]


class StudentScheduleSerializer(serializers.ModelSerializer):
    """One class in the student's timetable."""

    course_code = serializers.CharField(source="course.code", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    faculty_name = serializers.CharField(source="course.faculty.name", read_only=True)
    start_time = serializers.TimeField(format="%H:%M", read_only=True)
    end_time = serializers.TimeField(format="%H:%M", read_only=True)

    class Meta:
        model = CourseSchedule
        fields = ["course_code", "course_name", "faculty_name", "start_time", "end_time", "room"]
