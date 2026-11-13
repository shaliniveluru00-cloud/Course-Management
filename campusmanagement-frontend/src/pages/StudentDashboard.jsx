
import { useEffect, useState } from "react";

import {
  BookOpen,
  ClipboardCheck,
  Award,
  Clock3,
  ArrowUpRight,
  Bell,
  GraduationCap,
  CheckCircle2,
  Search,
  RefreshCw,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "./RoleDashboards.css";

// --------------------------------------------------
// EXISTING DASHBOARD DATA
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

const grades = [
  { name: "Data Structures – Quiz 2", course: "CS301", score: "18/20" },
  { name: "DBMS – Lab Assessment", course: "CS305", score: "24/25" },
  { name: "Discrete Math – Test 1", course: "MA202", score: "42/50" },
];

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

const API_BASE = "http://localhost:8000/api/student";

const COURSE_TABS = [
  { id: "available", label: "Courses to Enroll" },
  { id: "enrolled", label: "Enrolled Courses" },
  { id: "previous", label: "Previously Enrolled" },
];

const matches = (text, query) =>
  String(text ?? "").toLowerCase().includes(query.trim().toLowerCase());

// --------------------------------------------------
// API HELPERS
// --------------------------------------------------

async function getResponseData(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstError = Object.values(data).flat()[0];

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return fallback;
}

function normalizeCourses(data) {
  const list = Array.isArray(data)
    ? data
    : data.results || data.courses || [];

  return list;
}

// --------------------------------------------------
// DEBOUNCED SEARCH
// --------------------------------------------------

function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// --------------------------------------------------
// INDEPENDENT COURSE API HOOK
// --------------------------------------------------

function useCourseList(endpoint, search, onUnauthorized) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debouncedSearch = useDebouncedValue(search);

  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        onUnauthorized?.();
        throw new Error("Please log in again.");
      }

      const params = new URLSearchParams();

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const query = params.toString();

      const response = await fetch(
        `${API_BASE}${endpoint}${query ? `?${query}` : ""}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 401) {
        onUnauthorized?.();
        throw new Error("Your session has expired. Please log in again.");
      }

      const data = await getResponseData(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to load courses (${response.status}).`)
        );
      }

      setItems(normalizeCourses(data));
    } catch (err) {
      console.error(`Course API error (${endpoint}):`, err);
      setError(err.message || "Something went wrong.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [endpoint, debouncedSearch]);

  return {
    items,
    setItems,
    loading,
    error,
    refresh: fetchItems,
  };
}

// --------------------------------------------------
// STUDENT DASHBOARD
// --------------------------------------------------

function StudentDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const firstName = (user?.profile?.name ?? "").split(" ")[0];

  const [activeItem, setActiveItem] = useState("Dashboard");

  // General search states
  const [search, setSearch] = useState("");
  const [gradeSearch, setGradeSearch] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");

  // ONE ACTIVE COURSE TAB STATE
  const [activeCourseTab, setActiveCourseTab] = useState("enrolled");

  // Independent search states for each tab
  const [availableSearch, setAvailableSearch] = useState("");
  const [enrolledSearch, setEnrolledSearch] = useState("");
  const [previousSearch, setPreviousSearch] = useState("");

  // Enrollment feedback
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [submittingCourse, setSubmittingCourse] = useState(null);

  // --------------------------------------------------
  // THREE INDEPENDENT API CONNECTIONS
  // --------------------------------------------------

  const availableCourses = useCourseList(
    "/courses/available/",
    availableSearch,
    onLogout
  );

  const enrolledCourses = useCourseList(
    "/courses/",
    enrolledSearch,
    onLogout
  );

  const previousCourses = useCourseList(
    "/courses/previous/",
    previousSearch,
    onLogout
  );

  // --------------------------------------------------
  // COURSE SEARCH CONFIGURATION
  // --------------------------------------------------

  const courseTabConfig = {
    available: {
      data: availableCourses.items,
      loading: availableCourses.loading,
      error: availableCourses.error,
      search: availableSearch,
      setSearch: setAvailableSearch,
      noun: "available courses",
      refresh: availableCourses.refresh,
    },

    enrolled: {
      data: enrolledCourses.items,
      loading: enrolledCourses.loading,
      error: enrolledCourses.error,
      search: enrolledSearch,
      setSearch: setEnrolledSearch,
      noun: "enrolled courses",
      refresh: enrolledCourses.refresh,
    },

    previous: {
      data: previousCourses.items,
      loading: previousCourses.loading,
      error: previousCourses.error,
      search: previousSearch,
      setSearch: setPreviousSearch,
      noun: "previous courses",
      refresh: previousCourses.refresh,
    },
  };

  const currentTab = courseTabConfig[activeCourseTab];

  // --------------------------------------------------
  // ENROLLMENT BUTTON LABEL
  // --------------------------------------------------

  function getEnrollmentButton(course) {
    const seatsLeft = Number(course.seats_left ?? 0);

    const status = String(
      course.request_status || ""
    ).toLowerCase();

    if (seatsLeft <= 0) {
      return {
        label: "Full",
        disabled: true,
      };
    }

    if (status === "pending") {
      return {
        label: "Request pending",
        disabled: true,
      };
    }

    if (status === "rejected") {
      return {
        label: "Request again",
        disabled: false,
      };
    }

    if (course.needs_approval === true) {
      return {
        label: "Request enrollment",
        disabled: false,
      };
    }

    return {
      label: "Enroll",
      disabled: false,
    };
  }

  // --------------------------------------------------
  // ENROLLMENT API
  // --------------------------------------------------

  async function handleEnrollment(course) {
    setEnrollmentMessage("");
    setEnrollmentError("");

    const token = localStorage.getItem("token");

    if (!token) {
      onLogout?.();
      return;
    }

    setSubmittingCourse(course.code);

    try {
      const response = await fetch(
        `${API_BASE}/enrollments/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            course: course.code,
          }),
        }
      );

      const data = await getResponseData(response);

      if (response.status === 401) {
        onLogout?.();
        throw new Error("Your session has expired. Please log in again.");
      }

      // Successfully enrolled
      if (response.status === 201) {
        setEnrollmentMessage(
          data.message || `Successfully enrolled in ${course.code}.`
        );

        availableCourses.setItems((previous) =>
          previous.filter((item) => item.code !== course.code)
        );

        await enrolledCourses.refresh();
        await availableCourses.refresh();

        return;
      }

      // Faculty approval required
      if (response.status === 202) {
        setEnrollmentMessage(
          data.message || `Enrollment request sent for ${course.code}.`
        );

        availableCourses.setItems((previous) =>
          previous.map((item) =>
            item.code === course.code
              ? { ...item, request_status: "pending" }
              : item
          )
        );

        return;
      }

      // Invalid request or course not found
      if (response.status === 400 || response.status === 404) {
        throw new Error(
          getErrorMessage(data, "Unable to process enrollment request.")
        );
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Enrollment failed (${response.status}).`)
        );
      }
    } catch (err) {
      console.error("Enrollment error:", err);
      setEnrollmentError(err.message || "Enrollment failed.");
    } finally {
      setSubmittingCourse(null);
    }
  }

  // --------------------------------------------------
  // PREVIOUS COURSE ATTENDANCE
  // --------------------------------------------------

  function getAttendance(course) {
    if (course.attendance !== null && course.attendance !== undefined) {
      return Number(course.attendance);
    }

    const held = Number(course.classes_held || 0);
    const attended = Number(course.classes_attended || 0);

    if (held === 0) return 0;

    return (attended / held) * 100;
  }

  // --------------------------------------------------
  // OTHER DASHBOARD FILTERS
  // --------------------------------------------------

  const filteredAssignments = assignments.filter((item) =>
    matches(`${item.title} ${item.course}`, search)
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

          {/* ==========================================
              DASHBOARD HOME
          ========================================== */}

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

                <div className="stats-grid student-stats-grid">
                <Stat
                  icon={BookOpen}
                  value={
                    enrolledCourses.loading
                      ? "..."
                      : enrolledCourses.items.length
                  }
                  label="Enrolled Courses"
                />

                <Stat
                  icon={ClipboardCheck}
                  value="4"
                  label="Pending Assignments"
                />

                <Stat
                icon={Award}
                value="8.6"
                label="Current CGPA"
                />

              </div>

              <section className="dashboard-panel role-panel">

                <PanelHeading
                  title="My Courses"
                  subtitle="Your enrolled courses this semester"
                  action="View all"
                  onAction={() => setActiveItem("My Courses")}
                />

                {enrolledCourses.loading ? (
                  <p className="role-note">Loading your courses...</p>
                ) : enrolledCourses.error ? (
                  <p className="role-error">{enrolledCourses.error}</p>
                ) : (
                  <CourseGrid
                    items={enrolledCourses.items.slice(0, 3)}
                  />
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

          {/* ==========================================
              MY COURSES - THREE SUB TABS
          ========================================== */}

          {activeItem === "My Courses" && (
            <section className="dashboard-panel role-panel">

              <PanelHeading
                title="My Courses"
                subtitle="Explore, manage and track your academic courses"
              />

              {/* COURSE SUB TABS */}

              <div className="course-tabs">

                {COURSE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`course-tab ${
                      activeCourseTab === tab.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveCourseTab(tab.id);
                      setEnrollmentMessage("");
                      setEnrollmentError("");
                    }}
                  >
                    {tab.label}
                  </button>
                ))}

              </div>

              {/* INDEPENDENT SEARCH */}

              <div className="role-search-row course-search-row">

                <span>
                  {currentTab.data.length} {currentTab.noun}
                </span>

                <div className="course-search-box">
                  <Search size={17} />

                  <input
                    type="text"
                    value={currentTab.search}
                    onChange={(e) =>
                      currentTab.setSearch(e.target.value)
                    }
                    placeholder={`Search ${currentTab.noun}...`}
                    aria-label={`Search ${currentTab.noun}`}
                  />
                </div>

              </div>

              {/* ENROLLMENT FEEDBACK */}

              {enrollmentMessage && activeCourseTab === "available" && (
                <div className="course-success">
                  <CheckCircle2 size={18} />
                  {enrollmentMessage}
                </div>
              )}

              {enrollmentError && activeCourseTab === "available" && (
                <div className="course-error">
                  {enrollmentError}
                </div>
              )}

              {/* LOADING */}

              {currentTab.loading && (
                <p className="role-note">
                  Loading courses...
                </p>
              )}

              {/* ERROR */}

              {!currentTab.loading && currentTab.error && (
                <div className="course-error">
                  <p>{currentTab.error}</p>

                  <button
                    className="course-retry"
                    onClick={currentTab.refresh}
                  >
                    <RefreshCw size={15} />
                    Try again
                  </button>
                </div>
              )}

              {/* EMPTY RESULT */}

              {!currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length === 0 && (
                  <p className="role-note">
                    No courses found.
                  </p>
                )}

              {/* =====================================
                  AVAILABLE COURSES
              ===================================== */}

              {activeCourseTab === "available" &&
                !currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length > 0 && (

                  <div className="role-course-grid">

                    {currentTab.data.map((course, index) => {
                      const button = getEnrollmentButton(course);

                      const isSubmitting =
                        submittingCourse === course.code;

                      return (
                        <article
                          className="role-course-card"
                          key={course.id ?? course.code}
                        >

                          <div className={`role-course-icon tone-${index}`}>
                            <BookOpen size={21} />
                          </div>

                          <span className="role-course-code">
                            {course.code}
                          </span>

                          <h3>{course.name}</h3>

                          <p>
                            {course.faculty_name || "Faculty not assigned"}
                          </p>

                          <div className="course-extra-details">
                            <span>Department</span>
                            <strong>{course.department || "—"}</strong>
                          </div>

                          <div className="course-extra-details">
                            <span>Credits</span>
                            <strong>{course.credits ?? "—"}</strong>
                          </div>

                          <div className="course-extra-details">
                            <span>Seats left</span>
                            <strong>{course.seats_left ?? 0}</strong>
                          </div>

                          <button
                            className="course-enroll-button"
                            disabled={button.disabled || isSubmitting}
                            onClick={() => handleEnrollment(course)}
                          >
                            {isSubmitting
                              ? "Processing..."
                              : button.label}
                          </button>

                        </article>
                      );
                    })}

                  </div>
                )}

              {/* =====================================
                  ENROLLED COURSES
              ===================================== */}

              {activeCourseTab === "enrolled" &&
                !currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length > 0 && (

                  <CourseGrid items={currentTab.data} />

                )}

              {/* =====================================
                  PREVIOUSLY ENROLLED COURSES
              ===================================== */}

              {activeCourseTab === "previous" &&
                !currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length > 0 && (

                  <div className="role-course-grid">

                    {currentTab.data.map((course, index) => {

                      const attendance = getAttendance(course);

                      const status = String(
                        course.status || ""
                      ).toLowerCase();

                      const completed = status === "completed";

                      return (
                        <article
                          className="role-course-card previous-course-card"
                          key={course.id ?? course.code}
                        >

                          <div className={`role-course-icon tone-${index}`}>
                            <BookOpen size={21} />
                          </div>

                          <span className="role-course-code">
                            {course.code}
                          </span>

                          <h3>{course.name}</h3>

                          <p>
                            {course.faculty_name || "Faculty not assigned"}
                          </p>

                          <div className="course-extra-details">
                            <span>Grade</span>
                            <strong>{course.grade || "—"}</strong>
                          </div>

                          <div className="course-extra-details">
                            <span>Attendance</span>
                            <strong>{attendance.toFixed(1)}%</strong>
                          </div>

                          <div className="course-extra-details">
                            <span>Classes attended</span>
                            <strong>
                              {course.classes_attended ?? 0}/
                              {course.classes_held ?? 0}
                            </strong>
                          </div>

                          <div className="course-status-row">

                            <span
                              className={`course-status-badge ${
                                completed ? "completed" : "failed"
                              }`}
                            >
                              {course.status || "Unknown"}
                            </span>

                            {String(course.grade).toUpperCase() === "DX" && (
                              <span
                                className="course-dx-note"
                                title="Debarred due to attendance below 60%"
                              >
                                DX: Attendance below 60%
                              </span>
                            )}

                          </div>

                        </article>
                      );
                    })}

                  </div>
                )}

            </section>
          )}

          {/* ==========================================
              ASSIGNMENTS
          ========================================== */}

          {activeItem === "Assignments" && (
            <section className="dashboard-panel role-panel">

              <PanelHeading
                title="Assignments"
                subtitle="Search and track your coursework"
              />

              <SearchRow
                count={filteredAssignments.length}
                noun="assignments"
                value={search}
                onChange={setSearch}
                placeholder="Search assignments..."
              />

              <AssignmentTable items={filteredAssignments} />

            </section>
          )}

          {/* ==========================================
              GRADES
          ========================================== */}

          {activeItem === "Grades" && (
            <GradesPanel
              items={filteredGrades}
              searchValue={gradeSearch}
              onSearchChange={setGradeSearch}
            />
          )}

          {/* ==========================================
              SCHEDULE
          ========================================== */}

          {activeItem === "Schedule" && (
            <SchedulePanel
              full
              items={filteredSchedule}
              searchValue={scheduleSearch}
              onSearchChange={setScheduleSearch}
            />
          )}

          {/* ==========================================
              ANNOUNCEMENTS
          ========================================== */}

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

          {/* ==========================================
            HELP & CONTACT
          ========================================== */}

          {activeItem === "Help & Contact" && (
            <section className="dashboard-panel role-panel">

              <PanelHeading
                title="Help & Contact"
                subtitle="Get in touch with the campus support teams"
              />
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
// COURSE GRID
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

          <span className="role-course-code">
            {course.code}
          </span>

          <h3>{course.name}</h3>

          <p>
            {course.faculty_name || course.faculty || "Faculty not assigned"}
          </p>

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
