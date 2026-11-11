"""
Loads submissions and grades from database/05_submissions_grades.sql.
Run AFTER import_assignments:   python manage.py import_submissions
Safe to run more than once (rows are updated, not duplicated).

The SQL file has two rules that SQLite enforced with triggers; they are checked here too:
  * a student may only submit to an assignment of a course they are enrolled in
  * marks cannot exceed the assignment's max_marks
Rows that break a rule are skipped and reported.
"""
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Student
from courses.management.commands.import_courses import parse_rows
from courses.models import Assignment, Enrollment, Grade, Submission


class Command(BaseCommand):
    help = "Import submissions and grades from database/05_submissions_grades.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "05_submissions_grades.sql"),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        assignments = Assignment.objects.in_bulk()
        students = Student.objects.in_bulk()
        enrolled = set(Enrollment.objects.values_list("student_id", "course_id"))

        # --- submissions: (id, assignment_id, student_id, submitted_date) ---
        submissions = {}
        count = skipped = 0
        for sid, aid, stu, when in parse_rows(text, "submissions", 4):
            assignment = assignments.get(aid)
            if assignment is None or stu not in students:
                skipped += 1
                continue
            if (stu, assignment.course_id) not in enrolled:   # the "enrolled" rule
                skipped += 1
                continue
            submissions[sid], _ = Submission.objects.update_or_create(
                id=sid,
                defaults={"assignment": assignment, "student": students[stu],
                          "submitted_date": date.fromisoformat(when)},
            )
            count += 1
        self.stdout.write(f"Submissions imported: {count}")

        # --- grades: (id, submission_id, marks, letter_grade, remarks) ---
        count = 0
        for gid, sub_id, marks, letter, remarks in parse_rows(text, "grades", 5):
            submission = submissions.get(sub_id)
            if submission is None:
                skipped += 1
                continue
            if marks > submission.assignment.max_marks:       # the "max marks" rule
                skipped += 1
                continue
            Grade.objects.update_or_create(
                id=gid,
                defaults={"submission": submission, "marks": float(marks),
                          "letter_grade": letter, "remarks": remarks or ""},
            )
            count += 1
        self.stdout.write(f"Grades imported: {count}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows (missing parent or broke a rule)"))
