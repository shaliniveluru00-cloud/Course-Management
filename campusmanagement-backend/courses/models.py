from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from accounts.models import Faculty, Student


class Course(models.Model):
    """One course (from the `courses` SQL table), taught by one faculty member."""

    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=150)
    credits = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    capacity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="courses")

    def __str__(self):
        return f"{self.code} - {self.name}"


class Enrollment(models.Model):
    """A student enrolled in a course (from the `enrollments` SQL table)."""

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enroll_date = models.DateField()

    class Meta:
        # Same student can't enroll in the same course twice (UNIQUE in the SQL file)
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_student_course")
        ]

    def __str__(self):
        return f"{self.student} -> {self.course}"


class Assignment(models.Model):
    """An assignment given in a course (from the `assignments` SQL table)."""

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    max_marks = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    def __str__(self):
        return f"{self.course.code}: {self.title}"


class Submission(models.Model):
    """A student's submission for an assignment (from the `submissions` SQL table)."""

    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="submissions")
    submitted_date = models.DateField()

    class Meta:
        # One submission per student per assignment (UNIQUE in the SQL file)
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"], name="unique_assignment_student"
            )
        ]

    def __str__(self):
        return f"{self.student} -> {self.assignment}"


class Grade(models.Model):
    """Marks given to one submission (from the `grades` SQL table).
    A submission with no Grade row is still ungraded."""

    class Letter(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"
        F = "F", "F"

    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name="grade")
    marks = models.FloatField(validators=[MinValueValidator(0)])
    letter_grade = models.CharField(max_length=1, choices=Letter.choices, null=True, blank=True)
    remarks = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.submission} = {self.marks}"


class CourseSchedule(models.Model):
    """When and where a course is taught (from the `course_schedule` SQL table).
    One daily slot per course: the same time and room every day."""

    course = models.OneToOneField(Course, on_delete=models.CASCADE, related_name="schedule")
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=60)

    class Meta:
        constraints = [
            # Two courses can't use the same room at the same time
            models.UniqueConstraint(fields=["start_time", "room"], name="unique_room_slot"),
            models.CheckConstraint(
                condition=Q(end_time__gt=models.F("start_time")), name="schedule_end_after_start"
            ),
        ]

    def __str__(self):
        return f"{self.course.code}: {self.start_time:%H:%M}-{self.end_time:%H:%M}, {self.room}"


class PreviousCourse(models.Model):
    """A course from an earlier year (from the `previous_courses` SQL table).
    Separate from `Course`: these are finished and can't be enrolled in."""

    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=150)
    credits = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    faculty = models.ForeignKey(Faculty, on_delete=models.PROTECT, related_name="previous_courses")

    def __str__(self):
        return f"{self.code} - {self.name}"


class PreviousEnrollment(models.Model):
    """One student's result in one previous course, with attendance
    (from the `previous_enrollments` SQL table).

    Rules used when the data was made:
      attendance below 60%  -> grade DX and status Failed
      otherwise grade F     -> status Failed
      otherwise             -> status Completed
    """

    class Grade(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"
        F = "F", "F"
        DX = "DX", "DX (attendance below 60%)"

    class Result(models.TextChoices):
        COMPLETED = "Completed", "Completed"
        FAILED = "Failed", "Failed"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="previous_enrollments")
    course = models.ForeignKey(PreviousCourse, on_delete=models.CASCADE, related_name="enrollments")
    grade = models.CharField(max_length=2, choices=Grade.choices)
    classes_held = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    classes_attended = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Result.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_student_previous_course")
        ]

    @property
    def attendance_percent(self):
        return round(self.classes_attended * 100 / self.classes_held, 1)

    def __str__(self):
        return f"{self.student} -> {self.course}: {self.grade}"


class EnrollmentRequest(models.Model):
    """A student's request to join a course outside their own department.
    The course's faculty approves or rejects it. Approving creates the Enrollment row."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollment_requests")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollment_requests")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        Faculty, null=True, blank=True, on_delete=models.SET_NULL, related_name="decided_requests"
    )

    class Meta:
        constraints = [
            # A student can have many old requests for a course (e.g. one rejected),
            # but only one waiting for an answer.
            models.UniqueConstraint(
                fields=["student", "course"],
                condition=Q(status="pending"),
                name="one_pending_request_per_course",
            )
        ]

    def __str__(self):
        return f"{self.student} -> {self.course} ({self.status})"
