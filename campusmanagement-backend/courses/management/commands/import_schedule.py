"""
Loads the daily timetable (time slot and room of every course) from database/07_course_schedule.sql.
Run AFTER import_courses:   python manage.py import_schedule
Safe to run more than once (rows are updated, not duplicated).
"""
from datetime import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from courses.management.commands.import_courses import parse_rows
from courses.models import Course, CourseSchedule


def to_time(text):
    hour, minute = text.split(":")[:2]
    return time(int(hour), int(minute))


class Command(BaseCommand):
    help = "Import the course timetable from database/07_course_schedule.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "07_course_schedule.sql"),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        courses = Course.objects.in_bulk()
        count = skipped = 0

        # (id, course_id, start_time, end_time, room)
        for rid, cid, start, end, room in parse_rows(text, "course_schedule", 5):
            if cid not in courses or to_time(end) <= to_time(start):
                skipped += 1
                continue
            CourseSchedule.objects.update_or_create(
                id=rid,
                defaults={
                    "course": courses[cid],
                    "start_time": to_time(start), "end_time": to_time(end), "room": room,
                },
            )
            count += 1
        self.stdout.write(f"Schedule rows imported: {count}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows (missing course or bad time)"))
