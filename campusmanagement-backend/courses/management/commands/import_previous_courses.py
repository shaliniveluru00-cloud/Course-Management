"""
Loads previously enrolled courses (with grades and attendance) from
database/06_previous_courses.sql.
Run AFTER import_users and import_profiles:   python manage.py import_previous_courses
Safe to run more than once: the earlier previous-course rows are cleared first and the file is loaded
again, so the result is always exactly what is in the SQL file (nothing old is left over, nothing doubled).

The SQL file's rules are checked while importing; a row that breaks one is skipped and reported:
  attendance below 60%  -> grade DX and status Failed
  grade F               -> status Failed
  anything else         -> status Completed
"""
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Faculty, Student
from courses.management.commands.import_courses import parse_rows
from courses.models import PreviousCourse, PreviousEnrollment


def expected_status(grade):
    return "Failed" if grade in ("F", "DX") else "Completed"


class Command(BaseCommand):
    help = "Import previous courses and results from database/06_previous_courses.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "06_previous_courses.sql"),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        # Start clean: an older version of the file may have had different courses and pairings
        PreviousEnrollment.objects.all().delete()
        PreviousCourse.objects.all().delete()
        faculty = Faculty.objects.in_bulk()
        students = Student.objects.in_bulk()
        skipped = 0

        # (id, code, name, credits, faculty_id)
        courses = {}
        for cid, code, name, credits, fid in parse_rows(text, "previous_courses", 5):
            if fid not in faculty:
                skipped += 1
                continue
            courses[cid], _ = PreviousCourse.objects.update_or_create(
                id=cid,
                defaults={"code": code, "name": name, "credits": credits, "faculty": faculty[fid]},
            )
        self.stdout.write(f"Previous courses imported: {len(courses)}")

        # (id, student_id, course_id, grade, classes_held, classes_attended, status)
        count = 0
        for rid, sid, cid, grade, held, attended, status in parse_rows(text, "previous_enrollments", 7):
            if sid not in students or cid not in courses or attended > held:
                skipped += 1
                continue
            low_attendance = attended * 100 / held < 60
            if (grade == "DX") != low_attendance or status != expected_status(grade):
                skipped += 1
                continue
            PreviousEnrollment.objects.update_or_create(
                id=rid,
                defaults={
                    "student": students[sid], "course": courses[cid], "grade": grade,
                    "classes_held": held, "classes_attended": attended, "status": status,
                },
            )
            count += 1
        self.stdout.write(f"Previous enrollments imported: {count}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows (missing parent or broke a rule)"))
