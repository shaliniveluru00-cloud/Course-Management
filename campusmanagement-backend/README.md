# Campus Course Management System: Backend

This is the backend of our Campus Course Management System. It's a REST API built with Django: the part that stores the data, applies the rules and answers the website's questions. It also gives administrators their own admin site.

Here is what each person can do:

* **Students** can view and enroll in courses, and see their assignments, grades and timetable.
* **Faculty** can see their courses and students, approve or reject enrollment requests, create assignments, and look at the results of earlier courses.
* **Admins** manage everything through Django's built-in admin site (`/admin/`).

The React website lives in `../campusmanagement-frontend`, and the SQL data files are in `../database`.

## Tech stack

| Part | What we use |
|---|---|
| Language / framework | Python 3.12+, Django 6 |
| API | Django REST Framework |
| Login | JWT tokens (djangorestframework-simplejwt) |
| Database | SQLite (`db.sqlite3`), accessed through the Django ORM |
| Cross-origin requests | django-cors-headers (lets the React site on port 5173 call this API on port 8000) |

## Quick start

The easy way: from the project root (the folder that contains `setup.sh`), run

```
bash setup.sh
```

and wait about a minute. It creates the virtual environment, installs the packages, creates the tables, loads all the data, checks that the numbers are right, and installs the frontend packages too. It works on macOS, Linux, and on Windows with Git Bash (not PowerShell's `bash`, which opens WSL). Run `bash setup.sh --help` to see its options (`--skip-frontend`, `--reset`).

### Manual setup

Prefer to do it step by step, or want to see what the script does? Here are the same steps by hand.

macOS / Linux:

```
cd campusmanagement-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
```

Windows (PowerShell):

```
cd campusmanagement-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

Then load the data (see the next section) and start the server:

```
python manage.py runserver
```

The API is now at `http://127.0.0.1:8000/`. Opening that address in a browser takes you to the admin site.

## Loading the data

The starting data lives in the SQL files in `../database`. The `import_*` commands read those files and create the rows through Django, so Django's rules and password hashing apply. Order matters here: run them **in this order**, because later tables point at earlier ones.

```
python manage.py import_users --file ../database/Users.sql
python manage.py import_profiles
python manage.py import_courses
python manage.py import_assignments
python manage.py import_submissions
python manage.py import_previous_courses
python manage.py import_schedule
```

| Command | Loads | Expected result |
|---|---|---|
| `import_users` | login accounts | 163 users (150 student, 12 faculty, 1 admin) |
| `import_profiles` | student and faculty details | 150 students, 12 faculty |
| `import_courses` | courses and enrollments | 15 courses, 543 enrollments |
| `import_assignments` | assignments | 30 assignments |
| `import_submissions` | submissions and grades | 1,003 submissions, 900 grades |
| `import_previous_courses` | earlier courses and results | 36 courses, 900 results |
| `import_schedule` | the daily timetable | 15 rows |

* You can run any command again without worry. They update existing rows and never create duplicates.
* `import_users` takes about 15 seconds (longer on a slow machine), so don't worry if it looks stuck. It hashes every password with PBKDF2, which is slow on purpose (see `profiling/PROFILING.md`).
* To rebuild the database from scratch: delete `db.sqlite3`, then run `migrate` and the imports again (or `bash setup.sh --reset`).

### Sample accounts

All sample logins are in `../database/Users.sql`. The usernames follow a pattern: `student001` to `student150`, `faculty01` to `faculty12`, and `admin01`.

## Project structure

```
campusmanagement-backend/
├── config/                 project settings and the main URL list
│   ├── settings.py
│   └── urls.py             / -> admin site, /admin/, /api/auth/, /api/
├── accounts/               users, login and roles
│   ├── models.py           User (with a role), Student, Faculty
│   ├── serializers.py      login checks and the login response
│   ├── views.py            login and "who am I"
│   ├── permissions.py      IsStudent and IsFaculty
│   ├── admin.py            admin pages for users, students, faculty
│   └── management/commands/   import_users, import_profiles
├── courses/                the academic data and the student/faculty API
│   ├── models.py           courses, enrollments, assignments, grades, ...
│   ├── rules.py            the enrollment approval rule
│   ├── serializers.py      what each endpoint sends and accepts
│   ├── views.py            the endpoints
│   ├── urls.py             the endpoint list
│   ├── admin.py            admin pages for everything else
│   ├── migrations/         the database table definitions
│   └── management/commands/   import_courses, import_assignments, ...
├── profiling/              profiling scripts and report
├── requirements.txt        the Python packages
├── manage.py               Django's command runner
└── db.sqlite3              the local database (created by migrate, not committed)
```

## Roles and access

| Role | How they log in | What they can do |
|---|---|---|
| **Student** | the React site | the `/api/student/...` endpoints |
| **Faculty** | the React site | the `/api/faculty/...` endpoints |
| **Admin** | the admin site at `/admin/` | manage all data |

The rules are enforced here in the backend, not just hidden in the website, so they can't be skipped by editing the page:

* A request without a valid token is refused with **401**.
* A student calling a faculty endpoint (or the other way round) is refused with **403**.
* Only accounts with the ADMIN role can open the admin site.
* A faculty member only ever sees and changes **their own** courses. Another faculty member's course looks like it does not exist (**404**).

## API reference

Base address: `http://localhost:8000`. Every endpoint except login needs the header
`Authorization: Bearer <access token>`. Replies are JSON. Most list endpoints accept `?search=<text>`.

### Authentication

| Method | Address | Description |
|---|---|---|
| POST | `/api/auth/login/` | body `{"username", "password", "role"}` returns `{"access", "refresh", "user"}`. The role must match the account (the React site only offers Student and Faculty) |
| GET | `/api/auth/me/` | who is logged in |
| POST | `/api/auth/refresh/` | body `{"refresh": "..."}` returns a new access token |

Errors have the form `{"message": "..."}`.

### Student endpoints

| Method | Address | Description |
|---|---|---|
| GET | `/api/student/courses/` | the courses I am enrolled in |
| GET | `/api/student/courses/available/` | courses I can still join, with `seats_left`, `needs_approval` and `request_status` |
| GET | `/api/student/courses/previous/` | my earlier courses with grade, attendance and status (Completed / Failed) |
| GET | `/api/student/courses/<code>/assignments/` | the assignments of one of my courses, with status and grade |
| GET | `/api/student/grades/` | my course grades (course, faculty, grade) |
| GET | `/api/student/marks/` | my marks for graded assignments |
| GET | `/api/student/schedule/` | my timetable (time, room, faculty) |
| POST | `/api/student/enrollments/` | enroll in a course (see below) |

**Enroll.** Body: `{"course": "CS202"}`.

| Reply | Meaning |
|---|---|
| `201 {"status": "enrolled", ...}` | enrolled straight away (own department or the open elective) |
| `202 {"status": "requested", ...}` | the course is in another department, so a request was sent to its faculty |
| `400 {"message": ...}` | already enrolled, a request is already pending, or the course is full |
| `404 {"message": ...}` | no such course |

**Assignment status** (computed from the data, never edited by hand):

| Status | When |
|---|---|
| `submitted` | a submission exists |
| `pending` | no submission and the due date is today or later |
| `missing` | no submission and the due date has passed |

`grade` is `null` until the faculty member has graded it.

### Faculty endpoints

| Method | Address | Description |
|---|---|---|
| GET | `/api/faculty/courses/` | my courses with `enrolled_count`, `seats_left`, `pending_requests` |
| GET | `/api/faculty/courses/<code>/students/` | the students enrolled in one of my courses |
| GET | `/api/faculty/enrollment-requests/` | requests for my courses. `?status=pending` (default), `approved`, `rejected` or `all`; `?course=CS201`; `?search=` |
| POST | `/api/faculty/enrollment-requests/<id>/approve/` | approve: the student is enrolled (refused if the course is full) |
| POST | `/api/faculty/enrollment-requests/<id>/reject/` | reject: nothing is added |
| GET | `/api/faculty/schedule/` | my timetable (time, room, number of students) |
| GET | `/api/faculty/grades/` | earlier courses I taught, with the number of students |
| GET | `/api/faculty/grades/<code>/students/` | the results of one earlier course (grade, attendance, status) |
| GET | `/api/faculty/assignments/` | my current courses with their number of assignments |
| GET | `/api/faculty/courses/<code>/assignments/` | the assignments of one course, with submitted and graded counts |
| POST | `/api/faculty/courses/<code>/assignments/` | create an assignment (see below) |

**Create an assignment.** Body: `{"title", "description", "due_date", "max_marks"}`.

* `title` is required and must be unique within the course.
* `description` is optional.
* `due_date` is required, in the format `YYYY-MM-DD`, and cannot be in the past.
* `max_marks` is required and at least 1.
* Reply `201` with the new assignment, or `400 {"message": "Due date: ..."}` naming the field.
* Every enrolled student sees the new assignment at once, as `pending` and not graded.

### Status codes used

`200` OK, `201` created, `202` accepted (a request was raised), `400` invalid input, `401` not logged in, `403` wrong role, `404` not found.

## Data model

```
User (role: STUDENT / FACULTY / ADMIN)
 ├── Student   (same id as the user: roll_no, name, email, department, year)
 └── Faculty   (same id as the user: name, email, department)

Course (code, name, credits, capacity) ── taught by one Faculty
 ├── CourseSchedule   one daily time slot and room
 ├── Enrollment       Student ↔ Course (unique pair)
 ├── EnrollmentRequest  Student → Course, status pending / approved / rejected
 └── Assignment (title, description, due_date, max_marks)
      └── Submission  Student ↔ Assignment (unique pair)
           └── Grade  (marks, letter grade, remarks)

PreviousCourse ── taught by one Faculty
 └── PreviousEnrollment  Student ↔ PreviousCourse (grade, attendance, status)
```

## Business rules

* **Enrollment.** A student enrolls instantly in a course of their own department or in the open elective (DS). For any other department, a request goes to the course's faculty. Seats are checked when the request is made and again when it is approved. A student cannot have two pending requests for the same course.
* **Previous courses.** Attendance below 60% means the grade is `DX` and the status is Failed. A grade of `F` is also Failed. Everything else is Completed.
* **Timetable.** One daily slot per course (the same every day). No room is used by two courses at the same time.
* **Assignments.** Status is computed (see above). A missed deadline is final for the student.

## Admin site

Open `http://127.0.0.1:8000/` (it redirects to `/admin/`) and log in with an admin account, for example `admin01`.

An admin can add and edit users, students, faculty and courses, change a course's faculty and capacity, add or remove enrollments, move a student to another course (by editing the enrollment), and deactivate students or faculty who have left (their login stops working but their records stay). Every table has search and filters.

Safety rules in the admin site:

* A course's capacity cannot be set below the number of students already enrolled.
* An enrollment or transfer cannot go over a course's seats, and a student cannot be in the same course twice.
* A course that has students cannot be deleted, and neither can a faculty member who teaches courses.
* Marks cannot exceed an assignment's maximum; grade `DX` is only allowed with attendance below 60%.
* Enrollment requests are view-only here (faculty decide them on the website).

The admin site keeps you logged in with a browser cookie. Click **Log out** (top right) when you use a shared computer.

## Profiling

`profiling/` has three scripts that measure the API, the login and the admin pages, and `profiling/PROFILING.md` explains the results. For example:

```
python manage.py shell < profiling/profile_api.py
```

## Troubleshooting

If something goes wrong, check this table first.

| Problem | What to do |
|---|---|
| `python` is not found (Windows) | try `py` instead, e.g. `py -m venv venv` |
| PowerShell says scripts are disabled when activating `venv` | run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |
| `import_users` seems stuck | it is hashing 163 passwords; wait for `Done: 163 created` |
| An import says `Skipped ... rows` | an earlier import did not run or did not finish; run the earlier ones first, then repeat |
| Everything is out of date or messy | delete `db.sqlite3`, then `migrate` and the imports again (or `bash setup.sh --reset`) |
| The browser shows "Page not found" at `/` | it redirects to `/admin/`; restart `runserver` so the new URL is loaded |
| The React site sends you back to login | the saved token was rejected, or two logins (student and faculty) share one browser address. Use a private window or `127.0.0.1` for the second login |
| Requests are blocked by CORS | open the website at `http://localhost:5173` or `http://127.0.0.1:5173` (ports 5173 and 5175 are allowed) |
