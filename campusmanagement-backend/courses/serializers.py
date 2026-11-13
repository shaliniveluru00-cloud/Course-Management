from django.utils import timezone
from rest_framework import serializers

from accounts.models import Student

from .models import Assignment, Course, Grade, PreviousCourse, CourseSchedule, Enrollment, EnrollmentRequest, PreviousEnrollment
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
    seats_left = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentRequest
        fields = [
            "id", "student_name", "roll_no", "student_department",
            "course_code", "course_name", "seats_left", "status", "requested_at", "decided_at",
        ]

    def get_seats_left(self, enrollment_request):
        # The list view attaches `taken` (enrolled count); otherwise count it here
        course = enrollment_request.course
        taken = getattr(enrollment_request, "taken", None)
        if taken is None:
            taken = course.enrollments.count()
        return max(course.capacity - taken, 0)


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
            "id", "title", "description", "course_code", "course_name", "due_date",
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


class StudentMarkSerializer(serializers.ModelSerializer):
    """One graded assignment on the Grades page (Marks section)."""

    assignment = serializers.CharField(source="submission.assignment.title", read_only=True)
    course_code = serializers.CharField(source="submission.assignment.course.code", read_only=True)
    course_name = serializers.CharField(source="submission.assignment.course.name", read_only=True)
    out_of = serializers.IntegerField(source="submission.assignment.max_marks", read_only=True)

    class Meta:
        model = Grade
        fields = ["assignment", "course_code", "course_name", "marks", "out_of", "letter_grade", "remarks"]


class FacultyCourseSerializer(serializers.ModelSerializer):
    """One course on the faculty's My Courses page. The view attaches
    enrolled_count, seats_left and pending_requests."""

    enrolled_count = serializers.IntegerField(read_only=True)
    seats_left = serializers.IntegerField(read_only=True)
    pending_requests = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "code", "name", "credits", "capacity",
            "enrolled_count", "seats_left", "pending_requests",
        ]


class EnrolledStudentSerializer(serializers.ModelSerializer):
    """One enrolled student on the faculty's Students page."""

    class Meta:
        model = Student
        fields = ["roll_no", "name", "email", "department", "year"]


class FacultyScheduleSerializer(serializers.ModelSerializer):
    """One course on the faculty member's Schedule page: when and where it is taught.
    Built from Course, so a course with no timetable yet still appears (time and room empty).
    The view attaches enrolled_count."""

    course_code = serializers.CharField(source="code", read_only=True)
    course_name = serializers.CharField(source="name", read_only=True)
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    room = serializers.SerializerMethodField()
    enrolled_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ["course_code", "course_name", "start_time", "end_time", "room", "enrolled_count"]

    def _slot(self, course):
        return getattr(course, "schedule", None)

    def get_start_time(self, course):
        slot = self._slot(course)
        return slot.start_time.strftime("%H:%M") if slot else None

    def get_end_time(self, course):
        slot = self._slot(course)
        return slot.end_time.strftime("%H:%M") if slot else None

    def get_room(self, course):
        slot = self._slot(course)
        return slot.room if slot else None



class FacultyPreviousCourseSerializer(serializers.ModelSerializer):
    """One earlier course the faculty member taught (Grades page, first level).
    The view attaches student_count."""

    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PreviousCourse
        fields = ["code", "name", "credits", "student_count"]


class FacultyPreviousStudentSerializer(serializers.ModelSerializer):
    """One student's result in an earlier course (Grades page, second level)."""

    roll_no = serializers.CharField(source="student.roll_no", read_only=True)
    name = serializers.CharField(source="student.name", read_only=True)
    department = serializers.CharField(source="student.department", read_only=True)
    attendance = serializers.FloatField(source="attendance_percent", read_only=True)

    class Meta:
        model = PreviousEnrollment
        fields = [
            "roll_no", "name", "department", "grade",
            "classes_held", "classes_attended", "attendance", "status",
        ]


class FacultyAssignmentCourseSerializer(serializers.ModelSerializer):
    """One current course on the faculty Assignments page. The view attaches assignment_count."""

    assignment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ["code", "name", "assignment_count"]


class FacultyAssignmentSerializer(serializers.ModelSerializer):
    """One assignment as its faculty member sees it. The view attaches
    submission_count (handed in) and graded_count; student_count is the size of the course."""

    submission_count = serializers.IntegerField(read_only=True)
    graded_count = serializers.IntegerField(read_only=True)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "description", "due_date", "max_marks",
            "student_count", "submission_count", "graded_count",
        ]

    def get_student_count(self, assignment):
        return self.context["student_count"]


class AssignmentCreateSerializer(serializers.ModelSerializer):
    """Checks the body of POST /api/faculty/courses/<code>/assignments/ :
    {"title": "...", "description": "...", "due_date": "2026-12-01", "max_marks": 20}"""

    # The database allows an empty due date, but then the assignment could never become "missing"
    due_date = serializers.DateField(required=True)

    class Meta:
        model = Assignment
        fields = ["title", "description", "due_date", "max_marks"]

    def validate_title(self, title):
        title = title.strip()
        if not title:
            raise serializers.ValidationError("Give the assignment a title.")
        course = self.context["course"]
        if Assignment.objects.filter(course=course, title__iexact=title).exists():
            raise serializers.ValidationError("This course already has an assignment with that title.")
        return title

    def validate_due_date(self, due_date):
        if due_date < timezone.localdate():
            raise serializers.ValidationError("The due date can't be in the past.")
        return due_date
