
import { useEffect, useState } from "react";

import {
  BookOpen,
  ClipboardCheck,
  Award,
  CalendarDays,
  Clock3,
  ArrowUpRight,
  Bell,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "./RoleDashboards.css";

// --------------------------------------------------
// ASSIGNMENTS
// --------------------------------------------------
const assignments = [
  {
    title: "Binary Search Tree Implementation",
    course: "Data Structures",
    due: "Nov 10, 2026",
    status: "Pending",
  },
  {
    title: "SQL Queries – Lab 4",
    course: "Database Management",
    due: "Nov 12, 2026",
    status: "Submitted",
  },
  {
    title: "Graph Theory Worksheet",
    course: "Discrete Mathematics",
    due: "Nov 15, 2026",
    status: "Pending",
  },
];

// --------------------------------------------------
// GRADES
// --------------------------------------------------

const grades = [
  { name: "Data Structures – Quiz 2", course: "CS301", score: "18/20" },
  { name: "DBMS – Lab Assessment", course: "CS305", score: "24/25" },
  { name: "Discrete Math – Test 1", course: "MA202", score: "42/50" },
];

// --------------------------------------------------
// SCHEDULE
// --------------------------------------------------

const scheduleItems = [
  {
    time: "09:00 – 10:00",
    title: "Data Structures",
    room: "Block A · Room 204",
  },
  {
    time: "11:00 – 12:00",
    title: "Database Management",
    room: "Block C · Lab 02",
  },
  {
    time: "14:00 – 15:00",
    title: "Discrete Mathematics",
    room: "Block B · Room 105",
  },
];

const matches = (text, query) =>
  String(text ?? "").toLowerCase().includes(query.trim().toLowerCase());

// --------------------------------------------------
// STUDENT DASHBOARD
// --------------------------------------------------

function StudentDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const firstName = (user?.profile?.name ?? "").split(" ")[0];

  const [activeItem, setActiveItem] = useState("Dashboard");

  // Search states
  const [search, setSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");

  // --------------------------------------------------
  // COURSES FROM BACKEND
  // --------------------------------------------------

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Please log in again. Access token not found.");
        }

        const response = await fetch(
          "http://localhost:8000/api/student/courses/",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load courses. Server error: ${response.status}`
          );
        }

        const data = await response.json();

        const courseList = Array.isArray(data)
          ? data
          : data.results || data.courses || [];

        const formattedCourses = courseList.map((course) => ({
          id: course.id,
          code: course.code,
          name: course.name,
          faculty: course.faculty_name || "Faculty not assigned",
          credits: course.credits,
        }));

        setCourses(formattedCourses);
        setCoursesError("");
      } catch (error) {
        console.error("Courses API error:", error);
        setCoursesError(
          error.message || "Something went wrong while loading courses."
        );
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // --------------------------------------------------
  // FILTER DATA
  // --------------------------------------------------

  const filteredAssignments = assignments.filter((item) =>
    `${item.title} ${item.course}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCourses = courses.filter((course) =>
    matches(
      `${course.code} ${course.name} ${course.faculty}`,
      courseSearch
    )
  );

  const filteredGrades = grades.filter((grade) =>
    matches(`${grade.name} ${grade.course}`, gradeSearch)
  );

  const filteredSchedule = scheduleItems.filter((schedule) =>
    matches(
      `${schedule.title} ${schedule.room} ${schedule.time}`,
      scheduleSearch
    )
  );

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  function handleNavigate(item) {
    if (item === "Logout") {
      return onLogout?.();
    }

    setActiveItem(item);
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="admin-layout">
      <Sidebar
        role="Student"
        activeItem={activeItem}
        onNavigate={handleNavigate}
      />

      <main className="admin-main">
        <Navbar
          pageTitle={activeItem}
          role="Student"
          profileName={user?.profile?.name || user?.username || "Student"}
        />

        <div className="dashboard-content">

          {/* DASHBOARD HOME */}

          {activeItem === "Dashboard" && (
            <>
              <section className="welcome-banner">
                <div>
                  <h1>Welcome back, {firstName}!</h1>
                  <p>Here's what's happening with your studies today.</p>
                </div>

                <div className="welcome-icon">
                  <GraduationCap size={65} />
                </div>
              </section>

              <div className="stats-grid">
                <Stat
                  icon={BookOpen}
                  value={coursesLoading ? "..." : courses.length}
                  label="Enrolled Courses"
                />

                <Stat
                  icon={ClipboardCheck}
                  value="4"
                  label="Pending Assignments"
                />

                <Stat icon={Award} value="8.6" label="Current CGPA" />

                <Stat icon={CalendarDays} value="92%" label="Attendance" />
              </div>

              <section className="dashboard-panel role-panel">
                <PanelHeading
                  title="My Courses"
                  subtitle="Your enrolled courses this semester"
                  action="View all"
                  onAction={() => setActiveItem("My Courses")}
                />

                {coursesLoading ? (
                  <p className="role-note">Loading your courses...</p>
                ) : coursesError ? (
                  <p className="role-note">{coursesError}</p>
                ) : (
                  <CourseGrid items={courses.slice(0, 3)} />
                )}
              </section>

              <section className="dashboard-panel role-panel">
                <PanelHeading
                  title="Upcoming Assignments"
                  subtitle="Stay on top of your coursework"
                  action="See all"
                  onAction={() => setActiveItem("Assignments")}
                />

                <AssignmentTable items={assignments.slice(0, 2)} />
              </section>

              <div className="role-two-column">
                <GradesPanel onView={() => setActiveItem("Grades")} />
                <SchedulePanel />
              </div>
            </>
          )}

          {/* MY COURSES */}

          {activeItem === "My Courses" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="My Courses"
                subtitle="All courses you are enrolled in"
              />

              <SearchRow
                count={filteredCourses.length}
                noun="courses"
                value={courseSearch}
                onChange={setCourseSearch}
                placeholder="Search courses..."
              />

              {coursesLoading ? (
                <p className="role-note">Loading your courses...</p>
              ) : coursesError ? (
                <p className="role-note">{coursesError}</p>
              ) : (
                <CourseGrid items={filteredCourses} />
              )}
            </section>
          )}

          {/* ASSIGNMENTS */}

          {activeItem === "Assignments" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="Assignments"
                subtitle="Search and track your coursework"
              />

              <div className="role-search-row">
                <span>{filteredAssignments.length} assignments</span>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assignments..."
                  aria-label="Search assignments"
                />
              </div>

              <AssignmentTable items={filteredAssignments} />
            </section>
          )}

          {/* GRADES */}

          {activeItem === "Grades" && (
            <GradesPanel
              items={filteredGrades}
              searchValue={gradeSearch}
              onSearchChange={setGradeSearch}
            />
          )}

          {/* ATTENDANCE */}

          {activeItem === "Attendance" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="Attendance Overview"
                subtitle="Your attendance this semester"
              />

              <div className="role-attendance">
                <strong>92%</strong>
                <span>Overall attendance</span>
                <CheckCircle2 size={28} />
              </div>

              <p className="role-note">
                You are meeting the minimum attendance requirement of 75%.
              </p>
            </section>
          )}

          {/* SCHEDULE */}

          {activeItem === "Schedule" && (
            <SchedulePanel
              full
              items={filteredSchedule}
              searchValue={scheduleSearch}
              onSearchChange={setScheduleSearch}
            />
          )}

          {/* ANNOUNCEMENTS */}

          {activeItem === "Announcements" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="Announcements"
                subtitle="Latest updates from your campus"
              />

              <Announcement
                title="Mid-semester examination timetable published"
                detail="Check the examination section for updated dates and room details."
              />

              <Announcement
                title="Project review submissions"
                detail="Submit your project synopsis before the department deadline."
              />
            </section>
          )}

          {/* SETTINGS */}

          {activeItem === "Settings" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="Settings"
                subtitle="Student account preferences"
              />

              <p className="role-note">
                Your profile and notification preferences will be available here.
              </p>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function Stat({ icon: Icon, value, label }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div className="stat-icon">
          <Icon size={23} />
        </div>
        <span className="stat-change">This term</span>
      </div>

      <h2>{value}</h2>
      <p>{label}</p>
    </article>
  );
}

function PanelHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      {action && (
        <button className="view-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

function SearchRow({ count, noun, value, onChange, placeholder }) {
  return (
    <div className="role-search-row">
      <span>
        {count} {noun}
      </span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

// --------------------------------------------------
// COURSE GRID - BACKEND DATA
// --------------------------------------------------

function CourseGrid({ items = [] }) {
  if (items.length === 0) {
    return <p className="role-note">No courses found.</p>;
  }

  return (
    <div className="role-course-grid">
      {items.map((course, index) => (
        <article
          className="role-course-card"
          key={course.id ?? course.code}
        >
          <div className={`role-course-icon tone-${index}`}>
            <BookOpen size={21} />
          </div>

          <span className="role-course-code">{course.code}</span>

          <h3>{course.name}</h3>

          <p>{course.faculty}</p>

          <div className="role-progress-label">
            <span>Credits</span>
            <strong>{course.credits ?? "—"}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

// --------------------------------------------------
// ASSIGNMENT TABLE
// --------------------------------------------------

function AssignmentTable({ items }) {
  return (
    <div className="activity-table-wrapper">
      <table className="activity-table role-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Course</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.title}>
              <td>{item.title}</td>
              <td>{item.course}</td>
              <td>
                <span className="role-due">
                  <Clock3 size={14} />
                  {item.due}
                </span>
              </td>
              <td>
                <span
                  className={`activity-status ${
                    item.status === "Submitted" ? "completed" : "pending"
                  }`}
                >
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --------------------------------------------------
// GRADES
// --------------------------------------------------

function GradesPanel({
  onView,
  items = grades,
  searchValue,
  onSearchChange,
}) {
  return (
    <section className="dashboard-panel role-panel">
      <PanelHeading
        title="Recent Grades"
        subtitle="Your latest academic performance"
        action={onView ? "View report" : undefined}
        onAction={onView}
      />

      {onSearchChange && (
        <SearchRow
          count={items.length}
          noun="grades"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search grades or courses..."
        />
      )}

      <div className="role-grade-list">
        {items.map((grade) => (
          <Grade key={grade.name} {...grade} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="role-note">No grades found.</p>
      )}
    </section>
  );
}

function Grade({ name, course, score }) {
  return (
    <div className="role-grade-row">
      <div>
        <strong>{name}</strong>
        <span>{course}</span>
      </div>

      <b>{score}</b>
    </div>
  );
}

// --------------------------------------------------
// SCHEDULE
// --------------------------------------------------

function SchedulePanel({
  full = false,
  items = scheduleItems,
  searchValue,
  onSearchChange,
}) {
  return (
    <section
      className={`dashboard-panel role-panel ${
        full ? "role-full-panel" : ""
      }`}
    >
      <PanelHeading
        title="Today's Schedule"
        subtitle="Your classes for today"
      />

      {onSearchChange && (
        <SearchRow
          count={items.length}
          noun="classes"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search classes or rooms..."
        />
      )}

      {items.map((schedule) => (
        <Schedule key={schedule.title} {...schedule} />
      ))}

      {items.length === 0 && (
        <p className="role-note">No classes found.</p>
      )}
    </section>
  );
}

function Schedule({ time, title, room }) {
  return (
    <div className="role-schedule-row">
      <span>{time}</span>

      <div>
        <strong>{title}</strong>
        <small>{room}</small>
      </div>
    </div>
  );
}

// --------------------------------------------------
// ANNOUNCEMENTS
// --------------------------------------------------

function Announcement({ title, detail }) {
  return (
    <div className="role-announcement">
      <Bell size={19} />

      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>

      <ArrowUpRight size={16} />
    </div>
  );
}

export default StudentDashboard;
