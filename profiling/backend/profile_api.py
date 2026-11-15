"""
Profiles every student and faculty API endpoint: how long it takes and how many
database queries it runs.

Run it from the campusmanagement-backend folder (virtual environment active):

    python manage.py shell < profiling/profile_api.py

It only reads data (GET requests), so it is safe to run on your real database.
Tool used: Django's query capture (CaptureQueriesContext) and time.perf_counter.
"""
import statistics
import time

from django.conf import settings

settings.ALLOWED_HOSTS.append("testserver")
settings.DEBUG = True  # lets Django record every SQL query

from django.db import connection  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

from accounts.models import Student, User  # noqa: E402
from courses.models import Course, Enrollment  # noqa: E402

student = Student.objects.get(user__username="student001")
faculty_user = User.objects.get(username="faculty01")

student_course = Enrollment.objects.filter(student=student).first().course.code
faculty_course = Course.objects.filter(faculty_id=faculty_user.pk).first().code
faculty_previous = faculty_user.faculty.previous_courses.first().code


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


S, F = client_for(student.user), client_for(faculty_user)

endpoints = [
    (S, "/api/student/courses/"),
    (S, "/api/student/courses/available/"),
    (S, "/api/student/courses/previous/"),
    (S, f"/api/student/courses/{student_course}/assignments/"),
    (S, "/api/student/grades/"),
    (S, "/api/student/marks/"),
    (S, "/api/student/schedule/"),
    (F, "/api/faculty/courses/"),
    (F, f"/api/faculty/courses/{faculty_course}/students/"),
    (F, "/api/faculty/enrollment-requests/"),
    (F, "/api/faculty/schedule/"),
    (F, "/api/faculty/grades/"),
    (F, f"/api/faculty/grades/{faculty_previous}/students/"),
    (F, "/api/faculty/assignments/"),
    (F, f"/api/faculty/courses/{faculty_course}/assignments/"),
]

results = []
for client, url in endpoints:
    client.get(url)  # warm-up, so the first call's start-up cost is not counted
    times = []
    for _ in range(15):
        start = time.perf_counter()
        client.get(url)
        times.append((time.perf_counter() - start) * 1000)
    with CaptureQueriesContext(connection) as queries:
        response = client.get(url)
    rows = len(response.json()) if isinstance(response.json(), list) else 1
    results.append((statistics.median(times), len(queries), rows, len(response.content), url))

print(f"{'median ms':>9} {'queries':>8} {'rows':>5} {'bytes':>7}  endpoint")
for ms, queries, rows, size, url in sorted(results, reverse=True):
    print(f"{ms:9.1f} {queries:8d} {rows:5d} {size:7d}  GET {url}")
