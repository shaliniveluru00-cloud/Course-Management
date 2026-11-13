#!/usr/bin/env bash
#
# setup.sh - sets up the whole Campus Course Management project in one go.
#
# Run it once after cloning the repository:
#
#       bash setup.sh
#
# What it does:
#   1. checks that Python (3.12+) and Node.js are installed
#   2. creates the Python virtual environment (campusmanagement-backend/venv)
#   3. installs the backend packages (requirements.txt)
#   4. creates the database tables (migrate)
#   5. loads every table from the SQL files in the "database" folder
#   6. checks that the right amount of data was loaded
#   7. installs the frontend packages (package.json)
#
# It is safe to run again: nothing is duplicated.
#
# Options:
#       --skip-frontend   do not install the frontend packages
#       --reset           delete the existing database first and start clean
#       -h, --help        show this help
#
# Works on macOS, Linux, and on Windows with Git Bash.

set -euo pipefail

# ---------------------------------------------------------------- options

SKIP_FRONTEND=false
RESET=false

for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=true ;;
    --reset)         RESET=true ;;
    -h|--help)       sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)"; exit 1 ;;
  esac
done

# Always work from the folder this script is in, wherever it is started from
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/campusmanagement-backend"
FRONTEND="$ROOT/campusmanagement-frontend"

TOTAL=7
step()  { echo; echo "[$1/$TOTAL] $2"; }
fail()  { echo; echo "ERROR: $1" >&2; exit 1; }

# ---------------------------------------------------------------- 1. tools

step 1 "Checking the tools you need"

PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 \
     && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
    PY="$candidate"
    break
  fi
done
[ -n "$PY" ] || fail "Python 3.12 or newer is needed. Install it from https://www.python.org/downloads/ and run this script again."
echo "  Python:  $($PY --version)"

if [ "$SKIP_FRONTEND" = false ]; then
  command -v npm >/dev/null 2>&1 || fail "Node.js (npm) is needed for the frontend. Install it from https://nodejs.org/ or run with --skip-frontend."
  echo "  Node.js: $(node --version)   npm: $(npm --version)"
fi

# ---------------------------------------------------------------- 2. virtual environment

cd "$BACKEND"

if [ "$RESET" = true ] && [ -f db.sqlite3 ]; then
  echo
  echo "  --reset will DELETE the current database (db.sqlite3) and all changes made in it."
  read -r -p "  Type 'yes' to continue: " answer
  if [ "$answer" != "yes" ]; then
    echo "  Cancelled. Nothing was deleted."
    exit 0
  fi
  rm -f db.sqlite3
  echo "  Old database deleted."
fi

step 2 "Creating the Python virtual environment (venv)"

if [ ! -d venv ]; then
  "$PY" -m venv venv
  echo "  Created venv."
else
  echo "  venv already exists, using it."
fi

# The python inside the venv: "bin" on macOS/Linux, "Scripts" on Windows
if   [ -x venv/bin/python ];          then VENV_PY="venv/bin/python"
elif [ -f venv/Scripts/python.exe ];  then VENV_PY="venv/Scripts/python.exe"
else fail "Could not find Python inside venv. Delete the venv folder and run this script again."
fi

# ---------------------------------------------------------------- 3. backend packages

step 3 "Installing the backend packages (requirements.txt)"
"$VENV_PY" -m pip install --quiet --disable-pip-version-check -r requirements.txt
echo "  Done."

# ---------------------------------------------------------------- 4. tables

step 4 "Creating the database tables (migrate)"
"$VENV_PY" manage.py migrate --verbosity 0
echo "  Done."

# ---------------------------------------------------------------- 5. data

step 5 "Loading the data from the SQL files (the user import takes a minute or two)"

# The order matters: later tables point at earlier ones
echo "  - users";            "$VENV_PY" manage.py import_users --file ../database/Users.sql | sed 's/^/      /'
echo "  - students/faculty"; "$VENV_PY" manage.py import_profiles          | sed 's/^/      /'
echo "  - courses";          "$VENV_PY" manage.py import_courses           | sed 's/^/      /'
echo "  - assignments";      "$VENV_PY" manage.py import_assignments       | sed 's/^/      /'
echo "  - submissions";      "$VENV_PY" manage.py import_submissions       | sed 's/^/      /'
echo "  - previous courses"; "$VENV_PY" manage.py import_previous_courses  | sed 's/^/      /'
echo "  - timetable";        "$VENV_PY" manage.py import_schedule          | sed 's/^/      /'

# ---------------------------------------------------------------- 6. check

step 6 "Checking the loaded data"

CHECK_OUTPUT="$("$VENV_PY" manage.py shell -c "
from accounts.models import User, Student, Faculty
from courses.models import (Course, Enrollment, Assignment, Submission, Grade,
                            PreviousCourse, PreviousEnrollment, CourseSchedule)
expected = [
    ('users', User.objects.count(), 163), ('students', Student.objects.count(), 150),
    ('faculty', Faculty.objects.count(), 12), ('courses', Course.objects.count(), 15),
    ('enrollments', Enrollment.objects.count(), 543), ('assignments', Assignment.objects.count(), 30),
    ('submissions', Submission.objects.count(), 1003), ('grades', Grade.objects.count(), 900),
    ('previous courses', PreviousCourse.objects.count(), 36),
    ('previous enrollments', PreviousEnrollment.objects.count(), 900),
    ('timetable rows', CourseSchedule.objects.count(), 15),
]
for name, found, want in expected:
    # Enrollments can grow later, when students enroll on the website
    ok = found >= want if name == 'enrollments' else found == want
    print(('OK   ' if ok else 'WARN ') + name.ljust(22) + str(found).rjust(5) + '  (expected ' + str(want) + ')')
" 2>/dev/null | grep -E '^(OK|WARN)')"

echo "$CHECK_OUTPUT" | sed 's/^/  /'
if echo "$CHECK_OUTPUT" | grep -q '^WARN'; then
  echo
  echo "  Some counts are not what we expected. Run:  bash setup.sh --reset"
fi

# ---------------------------------------------------------------- 7. frontend

step 7 "Installing the frontend packages (package.json)"

if [ "$SKIP_FRONTEND" = true ]; then
  echo "  Skipped (--skip-frontend)."
else
  cd "$FRONTEND"
  npm install --no-audit --no-fund --loglevel=error
  echo "  Done."
fi

# ---------------------------------------------------------------- finish

echo
echo "=============================================================="
echo " Setup complete."
echo
echo " Start the backend   (terminal 1):"
echo "     cd campusmanagement-backend"
if [ -x "$BACKEND/venv/bin/python" ]; then
  echo "     source venv/bin/activate"
else
  echo "     source venv/Scripts/activate        (PowerShell: venv\\Scripts\\activate)"
fi
echo "     python manage.py runserver"
echo
echo " Start the website   (terminal 2):"
echo "     cd campusmanagement-frontend"
echo "     npm run dev"
echo
echo " Admin site: http://127.0.0.1:8000/   (login admin01, password is in database/Users.sql)"
echo " Website:    http://localhost:5173"
echo "=============================================================="
