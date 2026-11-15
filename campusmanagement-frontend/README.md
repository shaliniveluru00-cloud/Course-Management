# Campus Course Management System: Frontend

This is the website part of our Campus Course Management System, built with React. It's what students and faculty actually see and click on. Behind the scenes it talks to the Django backend in `../campusmanagement-backend`, asking it for data and sending it changes.

Here is what each person can do:

* **Students** can browse and enroll in courses, and keep an eye on their assignments, grades and timetable.
* **Faculty** can see their courses and students, approve or reject enrollment requests, create assignments, and look at the results of earlier courses.
* **Admins** don't use this website. They work in the backend's admin site instead (there's a link to it on the login page).

## Tech stack

| Part | What we use |
|---|---|
| UI library | React 19 |
| Navigation | React Router 7 |
| Build tool and dev server | Vite 8 |
| Icons | lucide-react |
| Styling | plain CSS (one file per area) |
| Code checker | ESLint (with the React Hooks rules and the React Compiler) |
| Talking to the backend | the browser's built-in `fetch` |

The list of packages is in `package.json` (the frontend's equivalent of the backend's `requirements.txt`). `npm install` reads it.

## Quick start

Start the backend first, because the website has nothing to show without it (see `../campusmanagement-backend/README.md`).

If you've just cloned the project, run `bash setup.sh` from the project root. It installs everything, including the frontend packages. If you only want to work on the frontend:

```
cd campusmanagement-frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | starts the development server with live reload |
| `npm run build` | builds the optimized website into `dist/` |
| `npm run preview` | serves the built website, to check it before release |
| `npm run lint` | checks the code with ESLint. It should print nothing |

### Ports and addresses

The backend only trusts the website when it runs on port **5173** or **5175** (on `localhost` or `127.0.0.1`). Here's a trap to know about: if 5173 is already taken, Vite quietly switches to 5174, and then login fails with no obvious reason. To make Vite stop instead of switching, start it like this:

```
npm run dev -- --host 127.0.0.1 --strictPort
```

## Pages

### Everyone

| Page | What it does |
|---|---|
| **Login** | username, password and a Student / Faculty choice. It also has an "Administrator? Open the admin site" link to the backend's admin site |
| **Help & Contact** | the administration office's details |

### Student (`/student`)

| Page | What it does |
|---|---|
| **Dashboard** | a summary: enrolled courses, scheduled classes, grades, with previews |
| **My Courses** | three tabs: **Courses to Enroll** (seats left, and an Enroll or Request button), **Enrolled Courses**, and **Previously Enrolled** (grade, attendance, Completed or Failed). Each tab has its own search |
| **Assignments** | course folders. Opening one lists its assignments with due date, submitted date, status (pending / submitted / missing) and grade |
| **Grades** | the grade of each earlier course, with search |
| **Schedule** | the daily timetable: time, room and faculty |
| **Announcements** | fixed sample announcements (not connected to the backend) |

### Faculty (`/faculty`)

| Page | What it does |
|---|---|
| **Dashboard** | enrolled students, pending requests, completed courses, with previews |
| **My Courses** | current courses (students and seats left) and completed courses |
| **Students** | pick a course to see its enrolled students |
| **Enrollment Requests** | requests for my courses, with **Approve** and **Reject** (Approve is refused if the course is full) |
| **Assignments** | course folders. Opening one lists its assignments, with a **Create assignment** form (title, description, due date, maximum marks). A new assignment appears for every enrolled student at once, as pending |
| **Grades** | pick an earlier course to see each student's grade, attendance and result |
| **Schedule** | my timetable: time, room and number of students |
| **Reports** | for each completed course: number of students, passed and failed, and the individual results |

## How it works

If you only read one section, make it this one. It explains how the website and the backend work together.

1. **Login.** The login page sends `POST /api/auth/login/`. The backend replies with an access token, a refresh token and the user's details. The website keeps them in the browser's `localStorage` (as `token`, `refresh` and `user`) and opens `/student` or `/faculty`.
2. **Protected pages.** A page only opens if the saved user has the right role. Anyone else is sent back to `/login`.
3. **Every request carries the token.** The website adds the header `Authorization: Bearer <token>` to each call, so the backend knows who is asking.
4. **Logging out.** The Logout button clears the saved login. If the backend ever answers **401** (it didn't accept the token), the website logs you out by itself.
5. **Search.** When you type in a search box, the website waits a moment (300 ms) and then sends `?search=<text>`. The backend does the actual filtering.
6. **Backend address.** `http://localhost:8000` is written at the top of the page files. If your backend runs somewhere else, change it there.

The endpoints the pages use are listed in the backend README.

## Project structure

```
campusmanagement-frontend/
├── index.html
├── package.json            the packages and scripts
├── vite.config.js
├── eslint.config.js
├── public/                 static files (favicon, icons)
└── src/
    ├── main.jsx            starts the app
    ├── App.jsx             the routes and the login handling
    ├── index.css, App.css  global styles
    ├── components/
    │   ├── Sidebar.jsx     the left menu (different for each role)
    │   ├── Navbar.jsx      the top bar with the user's name
    │   └── *.css
    └── pages/
        ├── Login.jsx / Login.css
        ├── StudentDashboard.jsx    all student pages
        ├── FacultyDashboard.jsx    all faculty pages
        ├── RoleDashboards.css      styles shared by both dashboards
        └── AdminDashboard.css      the shared layout styles (see the note below)
```

Note: `AdminDashboard.css` is kept although there is no admin page any more, because the page layout of the student and faculty dashboards uses it. A few other files in `pages/` (`Assignments.jsx`, `Courses.jsx`, `Enrollments.jsx`, `Faculty.jsx`, `Grades.jsx`, `Students.jsx`) are empty leftovers from early development and are not used.

## Code quality and performance

* Run `npm run lint` before you push; it should print nothing. The React Compiler rules are strict: for example, do not set state directly inside an effect, and do not call `Date.now()` while a component renders.
* **Build size:** about 330 KB of JavaScript (100 KB compressed) and 28 KB of CSS.
* **Lighthouse** (Google's performance tool, desktop) on the built website scored **100 / 93 / 100** (performance / accessibility / best practices) on the login page, **100 / 94 / 100** on the student dashboard and **96 / 94 / 100** on the faculty dashboard. Pages load in about 0.2 s, and switching between pages makes no new requests.

## Known limitations

Nothing here is a bug we're hiding. These are the things we know about, so they don't surprise you.

* **One login per browser address.** The login is stored once per address (`localhost:5173`), so logging in as a second person in another tab replaces the first one, and the first tab then breaks. To use a student and a faculty member at the same time, open one at `http://localhost:5173` and the other at `http://127.0.0.1:5173` (needs the `--host 127.0.0.1` option above), or use a private window.
* **The faculty page does not update by itself.** Reload it to see new enrollment requests.
* **Students cannot submit assignments yet.** There is no submit feature; submissions come from the sample data.
* **Announcements are fixed text.**

## Troubleshooting

Something not working? Most problems are one of these.

| Problem | What to do |
|---|---|
| "Cannot reach the server. Is the backend running?" | start the backend (`python manage.py runserver` in the backend folder) |
| You are sent back to the login page after a refresh | the saved token was rejected, or another login replaced it. Log out and log in again, using separate addresses for separate users |
| `127.0.0.1:5173` refuses to connect | start with `npm run dev -- --host 127.0.0.1 --strictPort` |
| Login or requests fail with a CORS error in the browser console | the website is on a port the backend does not allow. Use 5173 or 5175 (see "Ports and addresses") |
| Port 5173 is already in use | close the old `npm run dev`, then start again with `--strictPort` |
| `npm install` fails | check your Node.js version with `node --version`. Vite 8 needs 20.19 or newer (or 22.12 and up) |
