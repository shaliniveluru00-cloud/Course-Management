"""
Loads the users from data/Users.sql into Django's user table.

Run it with:  python manage.py import_users
Safe to run more than once: existing users are updated, not duplicated.
"""
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import User

# Matches one row like: (13,'student001','Stu@2026_001','STUDENT')
ROW_PATTERN = re.compile(r"\((\d+),'([^']*)','([^']*)','([^']*)'\)")


class Command(BaseCommand):
    help = "Import users from data/Users.sql (passwords get hashed)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            default=str(Path(settings.BASE_DIR) / "data" / "Users.sql"),
            help="Path to the SQL file",
        )

    def handle(self, *args, **options):
        text = Path(options["file"]).read_text()
        rows = ROW_PATTERN.findall(text)

        created = updated = 0
        for _id, username, password, role in rows:
            user, is_new = User.objects.get_or_create(username=username)
            user.role = role
            user.set_password(password)  # stores a hash, never the plain password
            # Admins can also log in to Django's built-in /admin site
            user.is_staff = user.is_superuser = role == User.Role.ADMIN
            user.save()
            created += is_new
            updated += not is_new

        self.stdout.write(
            self.style.SUCCESS(f"Done: {created} created, {updated} updated")
        )
