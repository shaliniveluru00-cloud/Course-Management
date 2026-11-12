"""
Loads courses and enrollments from database/03_courses_enrollments.sql.
Run AFTER import_users and import_profiles:   python manage.py import_courses
Safe to run more than once (rows are updated, not duplicated).
"""
import re
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Faculty, Student
from courses.models import Course, Enrollment

# A quoted SQL string ('' inside means a single apostrophe) or a number
VALUE = r"('(?:[^']|'')*'|\d+(?:\.\d+)?|NULL)"


def parse_rows(text, table, columns):
    """Return a list of value-lists for the first INSERT INTO <table> block."""
    block = re.search(rf"INSERT INTO {table}\b.*?;", text, re.S | re.I)
    if not block:
        return []
    row_re = re.compile(r"\(\s*" + r"\s*,\s*".join([VALUE] * columns) + r"\s*\)")
    rows = []
    for match in row_re.findall(block.group(0).split("VALUES", 1)[1]):
        rows.append([
            None if v == "NULL"
            else v[1:-1].replace("''", "'") if v.startswith("'")
            else float(v) if "." in v
            else int(v)
            for v in match
        ])
    return rows


class Command(BaseCommand):
    help = "Import courses and enrollments from database/03_courses_enrollments.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "03_courses_enrollments.sql"),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        faculty = Faculty.objects.in_bulk()   # {user_id: Faculty}
        students = Student.objects.in_bulk()  # {user_id: Student}
        skipped = 0

        # --- courses: (id, code, name, credits, capacity, faculty_id) ---
        courses = {}
        count = 0
        for cid, code, name, credits, capacity, fid in parse_rows(text, "courses", 6):
            if fid not in faculty:
                skipped += 1
                continue
            courses[cid], _ = Course.objects.update_or_create(
                id=cid,
                defaults={"code": code, "name": name, "credits": credits,
                          "capacity": capacity, "faculty": faculty[fid]},
            )
            count += 1
        self.stdout.write(f"Courses imported: {count}")

        # --- enrollments: (id, student_id, course_id, enroll_date) ---
        count = 0
        for eid, sid, cid, when in parse_rows(text, "enrollments", 4):
            if sid not in students or cid not in courses:
                skipped += 1
                continue
            Enrollment.objects.update_or_create(
                id=eid,
                defaults={"student": students[sid], "course": courses[cid],
                          "enroll_date": date.fromisoformat(when)},
            )
            count += 1
        self.stdout.write(f"Enrollments imported: {count}")

        # --- the SQL file's last statement: every CSE student also takes DS101 (course 15) ---
        if 15 in courses:
            added = 0
            for student in Student.objects.filter(department="CSE").order_by("pk"):
                if Enrollment.objects.filter(student=student, course=courses[15]).exists():
                    continue
                Enrollment.objects.create(
                    student=student, course=courses[15], enroll_date=date(2026, 8, 23)
                )
                added += 1
            self.stdout.write(f"DS101 elective enrollments added: {added}")

        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows with no matching parent"))
