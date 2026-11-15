"""
Counts the database queries behind every admin list page. A count close to the
number of rows on the page means a query is repeated once per row (the "N+1" problem).

Run it from the campusmanagement-backend folder (virtual environment active):

    python manage.py shell < profiling/profile_admin.py

It only reads data. Tool used: Django's query capture (CaptureQueriesContext).
"""
import statistics
import time

from django.conf import settings

settings.ALLOWED_HOSTS.append("testserver")
settings.DEBUG = True  # lets Django record every SQL query

from django.db import connection  # noqa: E402
from django.test import Client  # noqa: E402
from django.test.utils import CaptureQueriesContext  # noqa: E402

from accounts.models import User  # noqa: E402

client = Client()
client.force_login(User.objects.get(username="admin01"))

pages = [
    "accounts/user", "accounts/student", "accounts/faculty",
    "courses/course", "courses/courseschedule", "courses/enrollment",
    "courses/enrollmentrequest", "courses/assignment", "courses/submission",
    "courses/grade", "courses/previouscourse", "courses/previousenrollment",
]

results = []
for page in pages:
    url = f"/admin/{page}/"
    client.get(url)  # warm-up
    times = []
    for _ in range(5):
        start = time.perf_counter()
        client.get(url)
        times.append((time.perf_counter() - start) * 1000)
    with CaptureQueriesContext(connection) as queries:
        client.get(url)
    results.append((statistics.median(times), len(queries), page))

print(f"{'median ms':>9} {'queries':>8}  admin list page (first page of results)")
for ms, queries, page in sorted(results, key=lambda row: -row[1]):
    print(f"{ms:9.0f} {queries:8d}  {page}")
