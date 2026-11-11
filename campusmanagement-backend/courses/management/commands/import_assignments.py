"""
Loads assignments from database/04_assignments.sql.
Run AFTER import_courses:   python manage.py import_assignments
Safe to run more than once (rows are updated, not duplicated).
"""
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from courses.management.commands.import_courses import parse_rows
from courses.models import Assignment, Course


class Command(BaseCommand):
    help = "Import assignments from database/04_assignments.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "04_assignments.sql"),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        courses = Course.objects.in_bulk()
        count = skipped = 0

        # (id, course_id, title, description, due_date, max_marks)
        for aid, cid, title, desc, due, max_marks in parse_rows(text, "assignments", 6):
            if cid not in courses:
                skipped += 1
                continue
            Assignment.objects.update_or_create(
                id=aid,
                defaults={
                    "course": courses[cid],
                    "title": title,
                    "description": desc or "",
                    "due_date": date.fromisoformat(due) if due else None,
                    "max_marks": max_marks,
                },
            )
            count += 1
        self.stdout.write(f"Assignments imported: {count}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows with no matching course"))
