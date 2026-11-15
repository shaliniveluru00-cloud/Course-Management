"""
Profiles the login request with Python's cProfile and shows which function
takes the time.

Run it from the campusmanagement-backend folder (virtual environment active):

    python manage.py shell < profiling/profile_login.py

It only logs in (no data is changed). Tool used: cProfile + pstats.
"""
import cProfile
import io
import json
import pstats
import statistics
import time

from django.conf import settings

settings.ALLOWED_HOSTS.append("testserver")

from django.test import Client  # noqa: E402

client = Client()
body = json.dumps({"username": "student001", "password": "Stu@2026_001", "role": "STUDENT"})


def login():
    return client.post("/api/auth/login/", data=body, content_type="application/json")


assert login().status_code == 200, "Login failed - check that the data is imported"

times = []
for _ in range(8):
    start = time.perf_counter()
    login()
    times.append((time.perf_counter() - start) * 1000)
print(f"Login: median {statistics.median(times):.0f} ms over {len(times)} requests\n")

profiler = cProfile.Profile()
profiler.enable()
login()
profiler.disable()

output = io.StringIO()
pstats.Stats(profiler, stream=output).strip_dirs().sort_stats("tottime").print_stats(5)
print("Where the time goes (sorted by time spent inside each function):")
print("\n".join(line for line in output.getvalue().splitlines() if line.strip()))
