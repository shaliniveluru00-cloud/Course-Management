# Profiling report

Folder layout: `backend/` has the three Python scripts, `frontend/` has the two Node scripts, and this file has the results of both.

**Goal:** use profiling tools to find performance bottlenecks in the backend, the database and the frontend, and fix what can be fixed.

**Environment:** MacBook, Python 3.14, Django 6, SQLite, real project data (163 users, 150 students, 15 courses, 543+ enrollments, 1,003 submissions).

## Tools used

| Tool | What it shows |
|---|---|
| `cProfile` + `pstats` (Python standard library) | which function the time is spent in |
| `CaptureQueriesContext` (Django) | every SQL query a request runs, so repeated queries (the "N+1 problem") are easy to spot |
| `time.perf_counter` | how long a request takes (median of several runs, after a warm-up) |

## How to run it

From the `campusmanagement-backend` folder, with the virtual environment active (the scripts live in `../profiling/backend/`):

```
python manage.py shell < ../profiling/backend/profile_api.py      # time + queries of every API endpoint
python manage.py shell < ../profiling/backend/profile_login.py    # cProfile of the login request
python manage.py shell < ../profiling/backend/profile_admin.py    # queries behind every admin list page
```

To profile a one-off command such as an import:

```
python -m cProfile -o import_users.prof manage.py import_users --file ../database/Users.sql
python -c "import pstats; pstats.Stats('import_users.prof').sort_stats('tottime').print_stats(5)"
```

## Results

### 1. API endpoints (student and faculty): no bottleneck

All 15 endpoints respond in **0.3 to 1.1 ms** and run only **1 to 4 database queries**, because the views use `select_related` and annotations, so there is no repeated query per row.

| Median (ms) | Queries | Rows | Endpoint |
|---:|---:|---:|---|
| 1.1 | 2 | 9 | GET /api/student/courses/available/ |
| 1.0 | 2 | 61 | GET /api/faculty/grades/CS001/students/ |
| 0.9 | 2 | 2 | GET /api/student/courses/CS101/assignments/ |
| 0.7 | 4 | 2 | GET /api/faculty/courses/CS101/assignments/ |
| 0.7 | 1 | 1 | GET /api/faculty/courses/ |
| 0.7 | 2 | 49 | GET /api/faculty/courses/CS101/students/ |
| 0.5 | 1 | 6 | GET /api/student/marks/ |
| 0.5 | 1 | 6 | GET /api/student/courses/previous/ |
| 0.4 | 1 | 0 | GET /api/faculty/enrollment-requests/ |
| 0.4 | 1 | 6 | GET /api/student/schedule/ |
| 0.4 | 1 | 1 | GET /api/faculty/schedule/ |
| 0.4 | 1 | 6 | GET /api/student/courses/ |
| 0.4 | 1 | 6 | GET /api/student/grades/ |
| 0.3 | 1 | 2 | GET /api/faculty/grades/ |
| 0.3 | 1 | 1 | GET /api/faculty/assignments/ |

### 2. Bottleneck: password hashing (login and `import_users`)

* **Login takes about 90 ms**, roughly 90 times longer than any other request.
* `cProfile` shows one function, `_hashlib.pbkdf2_hmac`, using **0.090 s of the 0.092 s** (98%).
* `import_users` takes **15.4 s**, and `pbkdf2_hmac` is called 163 times (once per user) for **14.98 s** (97%). Every other import command takes under 1 s.
* The stored passwords use PBKDF2-SHA256 with **1,500,000 rounds**.

**Decision: keep it.** The slowness is deliberate. It is what makes stolen password hashes very hard to crack. A single login costing 90 ms is acceptable, and the 15 s import runs only once during setup. Lowering the rounds would make it faster but weaker, so we did not change it.

### 3. Bottleneck: repeated queries on the admin Grades list (fixed)

* **Before:** 106 queries, 22 ms. The profiler showed the same `SELECT ... FROM courses_course` repeated **101 times**, once per row.
* **Cause:** each grade's label (`Grade -> Submission -> Assignment -> Course`) shows the course code, and the course was not loaded together with the grade.
* **Fix:** add `submission__assignment__course` to `list_select_related` in `GradeAdmin`.
* **After:** **6 queries, 12 ms.**

### 4. Bottleneck: repeated queries on the admin Faculty list (fixed)

* **Before:** 18 queries. The "Courses" column counted each faculty member's courses with a separate query per row (12 repeats).
* **Fix:** count all courses in the same query with `annotate(Count("courses"))`.
* **After:** **6 queries.** The column still matches the database and can still be sorted.

### Admin list pages, before and after

| Page | Queries before | Queries after |
|---|---:|---:|
| courses/grade | **106** | **6** |
| accounts/faculty | **18** | **6** |
| courses/enrollment | 9 | 9 |
| courses/submission | 8 | 8 |
| accounts/student | 7 | 7 |
| courses/course | 7 | 7 |
| courses/previouscourse | 7 | 7 |
| the other 5 pages | 3 to 6 | 3 to 6 |

### Import commands (time includes about 0.2 s for Django to start)

| Command | Time |
|---|---:|
| import_users | 15.4 s (password hashing, see 2) |
| import_submissions | 0.9 s |
| import_previous_courses | 0.6 s |
| import_courses | 0.4 s |
| import_profiles | 0.3 s |
| import_assignments | 0.2 s |
| import_schedule | 0.2 s |

## Frontend profiling

**Goal:** check how fast the website loads, how many backend calls each page makes, and whether any page does needless work.

**Tools:** Lighthouse (Google's audit tool, desktop settings) for load speed, accessibility and best practices; puppeteer (it controls a real Chrome) to log in, click every sidebar page and record each backend call plus the browser's own script, layout and style time. Both ran on the production build (`npm run build`), not the dev server.

**How to run it** (backend running on :8000; the scripts are in `profiling/frontend/` at the project root):

```
cd campusmanagement-frontend
npm run build
npx vite preview --host 127.0.0.1 --port 5175 --strictPort
# in another terminal, from the project root (once: install the two tools)
cd profiling/frontend && npm install
node profile_pages.mjs        # backend calls and browser time for every page
node profile_lighthouse.mjs   # Lighthouse scores for login, student, faculty
```

Set the `CHROME` environment variable if Chrome is not at the default Mac path.

### Build size

| File | Size | Compressed |
|---|---:|---:|
| JavaScript | 331 KB | 100 KB |
| CSS | 31 KB | 6.6 KB |

### Lighthouse

| Page | Performance | Accessibility | Best practices | FCP / LCP | Blocking time | Layout shift |
|---|---:|---:|---:|---|---:|---:|
| Login | 100 | 93 | 100 | 0.2 s / 0.2 s | 0 ms | 0 |
| Student dashboard | 100 | 94 | 100 | 0.2 s / 0.2 s | 0 ms | 0.033 |
| Faculty dashboard | 96 | 94 | 100 | 0.2 s / 0.2 s | 0 ms | 0.119 |

### Page load and navigation

* The browser finishes loading a page in about 25 ms (first paint at 40 to 60 ms). The first load including all backend calls takes about 1 s in the test script, which waits for the network to go quiet.
* **Switching between pages makes no new backend calls.** The data is loaded once and kept in memory (only the faculty Assignments page asks once for its own list). Script time per page click is 1 to 3 ms, layout 0 to 1 ms, style 0 to 4 ms.
* The JavaScript heap stays at about 3 MB. The page grows by roughly 80 DOM nodes per page visited (461 to 944 on the student side), so old pages are not removed from memory when you leave them. This is harmless at this size.

### Findings

| Finding | Where | Impact | Possible fix |
|---|---|---|---|
| `GET /api/student/courses/` is requested **twice** on the first student load | StudentDashboard.jsx, around line 359: the assignment folders load even when the Assignments page is not open | one wasted request per login | load it only when `activeItem === "Assignments"` |
| Layout shift 0.119 on the faculty dashboard | the role panel changes height when its data arrives | costs the 4 missing performance points | give `.role-panel` a `min-height` |
| Low contrast, heading order, no `<main>` on login | login and dashboards | accessibility 93 to 94 | small CSS and tag changes |
| Login.css points to `/campus.jpg`, which does not exist | Login.css, lines 47 to 53 | one failed image request; the gradient still shows | remove the `url(...)` |

None of these is visible to a user, and none has been changed yet. The frontend is not a bottleneck: pages are ready within a quarter of a second. The slowest part of a login is the intentional password hashing on the backend (see above).

## Conclusion

The API and the database are fast: every endpoint takes about 1 ms with at most 4 queries. Profiling found three real costs. One is intentional and was kept (password hashing). Two were repeated-query problems in the admin site, which are now fixed. The method (measure, find the repeated or slow function, fix, measure again) can be repeated with the scripts in `backend/` and `frontend/`.
