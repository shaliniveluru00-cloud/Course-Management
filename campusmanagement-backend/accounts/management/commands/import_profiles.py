"""
Loads student and faculty details from database/02_students_faculty.sql.
Run AFTER import_users:   python manage.py import_profiles
Safe to run more than once (rows are updated, not duplicated).
"""
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import Faculty, Student, User

# A quoted SQL string ('' inside means a single apostrophe) or a number
VALUE = r"('(?:[^']|'')*'|\d+|NULL)"


def parse_rows(text, table, columns):
    """Return a list of dicts for the INSERT INTO <table> block."""
    block = re.search(rf"INSERT INTO {table}.*?;", text, re.S | re.I)
    if not block:
        return []
    row_re = re.compile(r"\(\s*" + r"\s*,\s*".join([VALUE] * columns) + r"\s*\)")
    rows = []
    for match in row_re.findall(block.group(0).split("VALUES", 1)[1]):
        clean = [
            None if v == "NULL"
            else v[1:-1].replace("''", "'") if v.startswith("'")
            else int(v)
            for v in match
        ]
        rows.append(clean)
    return rows


class Command(BaseCommand):
    help = "Import students and faculty, linked to users by id"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR).parent / "database" / "02_students_faculty.sql"),
        )

    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        users = User.objects.in_bulk()  # {id: user}
        skipped = 0

        count = 0
        for uid, name, email, dept in parse_rows(text, "faculty", 4):
            if uid not in users:
                skipped += 1
                continue
            Faculty.objects.update_or_create(
                user=users[uid], defaults={"name": name, "email": email, "department": dept or ""}
            )
            count += 1
        self.stdout.write(f"Faculty imported: {count}")

        count = 0
        for uid, roll, name, email, dept, year in parse_rows(text, "students", 6):
            if uid not in users:
                skipped += 1
                continue
            Student.objects.update_or_create(
                user=users[uid],
                defaults={"roll_no": roll, "name": name, "email": email,
                          "department": dept or "", "year": year},
            )
            count += 1
        self.stdout.write(f"Students imported: {count}")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped} rows with no matching user"))
