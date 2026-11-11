from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Our user table. Django's built-in AbstractUser already gives us
    username, password (stored hashed), first_name, email, is_active, etc.
    We only add the one thing our app needs on top: the role.
    """

    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Student"
        FACULTY = "FACULTY", "Faculty"
        ADMIN = "ADMIN", "Admin"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Student(models.Model):
    """
    Details of one student (from the `students` SQL table).
    `user` is a OneToOneField used as the primary key, so students.id is the
    same number as Users.id. That is the link: logged-in user -> their student row.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="student"
    )
    roll_no = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=50, blank=True)
    year = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.roll_no})"


class Faculty(models.Model):
    """Details of one faculty member (from the `faculty` SQL table)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="faculty"
    )
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    department = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name_plural = "faculty"

    def __str__(self):
        return self.name
