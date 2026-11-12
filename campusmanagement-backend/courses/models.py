from django.core.validators import MinValueValidator
from django.db import models

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
