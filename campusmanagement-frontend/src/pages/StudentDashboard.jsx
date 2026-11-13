import { useCallback, useEffect, useRef, useState } from "react";

import {
  BookOpen,
  Award,
  Clock3,
  ArrowUpRight,
  Bell,
  GraduationCap,
  CheckCircle2,
  Search,
  RefreshCw,
  Mail,
  MapPin,
  Phone,
  ArrowLeft,
  Info,
  Landmark,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "./RoleDashboards.css";

const API_BASE = "http://localhost:8000/api/student";

const COURSE_TABS = [
  { id: "available", label: "Courses to Enroll" },
  { id: "enrolled", label: "Enrolled Courses" },
  { id: "previous", label: "Previously Enrolled" },
];

const ADMIN_OFFICE_INFO = {
  address: "Main Administration Block, IIT Dharwad, Karnataka, India",
  phone: "+91 836 2212 800",
  email: "administration@iitdh.ac.in",
  availability: "Monday – Friday, 9:00 AM – 5:30 PM",
};

// --------------------------------------------------
// API HELPERS
// --------------------------------------------------

async function getResponseData(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON body (e.g. an HTML 404 page) - never show raw markup to users.
    return /^\s*<(!doctype|html)/i.test(text) ? {} : { message: text };
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
  const debouncedSearch = useDebouncedValue(search).trim();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], error: "" });

  // Always call the latest onUnauthorized without making the request reload
  const onUnauthorizedRef = useRef(onUnauthorized);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  });

  // One key per request (endpoint + search + manual reloads). While the saved
  // result belongs to an older key, we are still loading.
  const requestKey = `${endpoint}|${debouncedSearch}|${reloadCount}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let items = [];
      let error = "";

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          onUnauthorizedRef.current?.();
          throw new Error("Please log in again.");
        }

        const params = new URLSearchParams();

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
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
          onUnauthorizedRef.current?.();
          throw new Error("Your session has expired. Please log in again.");
        }

        const data = await getResponseData(response);

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Courses are not available yet. Please try again later."
              : getErrorMessage(
                  data,
                  `Unable to load courses (${response.status}).`
                )
          );
        }

        items = normalizeCourses(data);
      } catch (err) {
        console.error(`Course API error (${endpoint}):`, err);
        error = err.message || "Something went wrong.";
      }

      if (!cancelled) {
        setResult({ key: requestKey, items, error });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [requestKey, endpoint, debouncedSearch]);

  const setItems = useCallback((updater) => {
    setResult((previous) => ({
      ...previous,
      items: typeof updater === "function" ? updater(previous.items) : updater,
    }));
  }, []);

  const refresh = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const loading = result.key !== requestKey;

  return {
    items: result.items,
    setItems,
    loading,
    error: loading ? "" : result.error,
    refresh,
  };
}

// --------------------------------------------------
// STUDENT DATA API HOOK
// --------------------------------------------------

function useStudentData(endpoint, search = "", onUnauthorized) {
  const debouncedSearch = useDebouncedValue(search).trim();
  const [result, setResult] = useState({ key: null, items: [], error: "" });

  // Always call the latest onUnauthorized without making the request reload
  const onUnauthorizedRef = useRef(onUnauthorized);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  });

  // No endpoint means "nothing to load yet" (for example, no folder selected)
  const requestKey = endpoint ? `${endpoint}|${debouncedSearch}` : null;

  useEffect(() => {
    if (!requestKey) return undefined;

    let cancelled = false;

    async function fetchData() {
      let items = [];
      let error = "";

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          onUnauthorizedRef.current?.();
          throw new Error("Please log in again.");
        }

        const params = new URLSearchParams();

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
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
          onUnauthorizedRef.current?.();
          throw new Error("Your session has expired. Please log in again.");
        }

        const data = await getResponseData(response);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, `Unable to load data (${response.status}).`)
          );
        }

        items = Array.isArray(data)
          ? data
          : data.results || data.items || data.courses || data.assignments || [];
      } catch (err) {
        console.error(`Student API error (${endpoint}):`, err);
        error = err.message || "Something went wrong.";
      }

      if (!cancelled) {
        setResult({ key: requestKey, items, error });
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [requestKey, endpoint, debouncedSearch]);

  if (!requestKey) {
    // Nothing selected: forget the old result, so opening the same item again
    // starts with a fresh "loading" instead of showing the previous data
    if (result.key !== null) {
      setResult({ key: null, items: [], error: "" });
    }

    return { items: [], loading: false, error: "" };
  }

  const loading = result.key !== requestKey;

  return {
    items: result.items,
    loading,
    error: loading ? "" : result.error,
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

  // Active course tab
  const [activeCourseTab, setActiveCourseTab] = useState("enrolled");

  // Independent search states for each tab
  const [availableSearch, setAvailableSearch] = useState("");
  const [enrolledSearch, setEnrolledSearch] = useState("");
  const [previousSearch, setPreviousSearch] = useState("");

  // Enrollment feedback
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [enrollmentError, setEnrollmentError] = useState("");
  const [submittingCourse, setSubmittingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Grades API
  const gradesData = useStudentData("/grades/", gradeSearch, onLogout);

  // Schedule API
  const scheduleData = useStudentData("/schedule/", scheduleSearch, onLogout);

  // Course folders shown on the Assignments page
  const assignmentCourses = useStudentData("/courses/", search, onLogout);

  // Fetch assignments only after a course folder is selected
  const courseAssignments = useStudentData(
    selectedCourse
      ? `/courses/${encodeURIComponent(selectedCourse.code)}/assignments/`
      : null,
    "",
    onLogout
  );

  // --------------------------------------------------
  // THREE INDEPENDENT COURSE API CONNECTIONS
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
    const status = String(course.request_status || "").toLowerCase();

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
      const response = await fetch(`${API_BASE}/enrollments/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: course.code,
        }),
      });

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

              {/* DASHBOARD STATISTICS */}

              <div className="stats-grid">
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
                  icon={Clock3}
                  value={
                    scheduleData.loading
                      ? "..."
                      : scheduleData.items.length
                  }
                  label="Scheduled Classes"
                />

                <Stat
                  icon={Award}
                  value={
                    gradesData.loading
                      ? "..."
                      : gradesData.items.length
                  }
                  label="Grades Published"
                />
              </div>

              {/* MY COURSES */}

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
                  <CourseGrid items={enrolledCourses.items.slice(0, 3)} />
                )}
              </section>

              {/* YOUR ASSIGNMENTS */}

              <section className="dashboard-panel role-panel">
                <PanelHeading
                  title="Your Assignments"
                  subtitle="Check your submission status and grades released by faculty"
                  action="View assignments"
                  onAction={() => setActiveItem("Assignments")}
                />

                <p className="role-note">
                  Select a course to view its assignments, submission status,
                  submitted dates, and grades if they have been published.
                </p>
              </section>

              {/* GRADES AND SCHEDULE */}

              <div className="role-two-column">
                <GradesPanel
                  items={gradesData.items.slice(0, 3)}
                  loading={gradesData.loading}
                  error={gradesData.error}
                  onView={() => setActiveItem("Grades")}
                />

                <SchedulePanel
                  items={scheduleData.items.slice(0, 3)}
                  loading={scheduleData.loading}
                  error={scheduleData.error}
                  onView={() => setActiveItem("Schedule")}
                />
              </div>
            </>
          )}

          {/* MY COURSES - THREE SUB TABS */}

          {activeItem === "My Courses" && (
            <section className="dashboard-panel role-panel">
              <PanelHeading
                title="My Courses"
                subtitle="Explore, manage and track your academic courses"
              />

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
                    onChange={(e) => currentTab.setSearch(e.target.value)}
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
                <p className="role-note">Loading courses...</p>
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
                  <p className="role-note">No courses found.</p>
                )}

              {/* AVAILABLE COURSES */}

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
                            {isSubmitting ? "Processing..." : button.label}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}

              {/* ENROLLED COURSES */}

              {activeCourseTab === "enrolled" &&
                !currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length > 0 && (
                  <CourseGrid items={currentTab.data} />
                )}

              {/* PREVIOUSLY ENROLLED COURSES */}

              {activeCourseTab === "previous" &&
                !currentTab.loading &&
                !currentTab.error &&
                currentTab.data.length > 0 && (
                  <div className="role-course-grid">
                    {currentTab.data.map((course, index) => {
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

                          <div className="course-status-row">
                            <span
                              className={`course-status-badge ${
                                completed ? "completed" : "failed"
                              }`}
                            >
                              {course.status || "Unknown"}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
            </section>
          )}

          {/* ASSIGNMENTS */}

          {activeItem === "Assignments" && (
            <section className="dashboard-panel role-panel">
              {!selectedCourse ? (
                <>
                  <PanelHeading
                    title="Assignments"
                    subtitle="Select a course to view its assignments"
                  />

                  <SearchRow
                    count={assignmentCourses.items.length}
                    noun="courses"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search courses..."
                  />

                  {assignmentCourses.loading ? (
                    <p className="role-note">Loading courses...</p>
                  ) : assignmentCourses.error ? (
                    <p className="role-error">{assignmentCourses.error}</p>
                  ) : assignmentCourses.items.length === 0 ? (
                    <p className="role-note">Nothing found.</p>
                  ) : (
                    <div className="role-course-grid">
                      {assignmentCourses.items.map((course, index) => (
                        <button
                          type="button"
                          className="role-course-card assignment-course-button"
                          key={course.id ?? course.code}
                          onClick={() => setSelectedCourse(course)}
                        >
                          <div className={`role-course-icon tone-${index}`}>
                            <BookOpen size={21} />
                          </div>

                          <span className="role-course-code">
                            {course.code}
                          </span>

                          <h3>{course.name || course.course_name}</h3>

                          <p>
                            {course.faculty_name ||
                              course.faculty ||
                              "Faculty not assigned"}
                          </p>

                          <span className="view-button">
                            View Assignments →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="assignment-back-button"
                    onClick={() => setSelectedCourse(null)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "20px",
                      padding: "10px 16px",
                      border: "1px solid #f97316",
                      borderRadius: "8px",
                      background: "#fff7ed",
                      color: "#c2410c",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <ArrowLeft size={17} />
                    Back to Courses
                  </button>

                  <PanelHeading
                    title={selectedCourse.name || selectedCourse.course_name}
                    subtitle={`Assignments for ${selectedCourse.code}`}
                  />

                  {courseAssignments.loading ? (
                    <p className="role-note">Loading assignments...</p>
                  ) : courseAssignments.error ? (
                    <p className="role-error">{courseAssignments.error}</p>
                  ) : (
                    <AssignmentList items={courseAssignments.items} />
                  )}
                </>
              )}
            </section>
          )}

          {/* GRADES */}

          {activeItem === "Grades" && (
            <GradesPanel
              items={gradesData.items}
              loading={gradesData.loading}
              error={gradesData.error}
              searchValue={gradeSearch}
              onSearchChange={setGradeSearch}
            />
          )}

          {/* SCHEDULE */}

          {activeItem === "Schedule" && (
            <SchedulePanel
              full
              items={scheduleData.items}
              loading={scheduleData.loading}
              error={scheduleData.error}
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

          {/* HELP & CONTACT */}

          {(activeItem === "Help & Contact" ||
            activeItem === "Settings") && (
            <section className="dashboard-panel role-panel role-help-panel">
              <PanelHeading
                title="Help & Contact"
                subtitle="Contact the college administration office for assistance"
              />

              <div className="role-help-intro">
                <Info size={22} />
                <p>
                  For administrative queries, document-related assistance,
                  or general campus support, contact the administration
                  office using the details below. Please confirm office
                  availability before visiting.
                </p>
              </div>

              <h3 className="role-contact-heading">
                Administration Office:
              </h3>

              <article className="role-course-card role-admin-contact-card">
                <div className="role-admin-card-header">
                  <div className="role-admin-icon">
                    <Landmark size={23} />
                  </div>

                  <div>
                    <h3>College Administration</h3>
                    <p>Student support and administrative assistance</p>
                  </div>
                </div>

                <div className="role-admin-details">
                  <div className="role-contact-detail">
                    <MapPin size={17} />
                    <span>
                      <strong>Address</strong>
                      {ADMIN_OFFICE_INFO.address}
                    </span>
                  </div>

                  <div className="role-contact-detail">
                    <Phone size={17} />
                    <span>
                      <strong>Office Number</strong>
                      {ADMIN_OFFICE_INFO.phone}
                    </span>
                  </div>

                  <div className="role-contact-detail">
                    <Mail size={17} />
                    <span>
                      <strong>Email</strong>
                      <a href={`mailto:${ADMIN_OFFICE_INFO.email}`}>
                        {ADMIN_OFFICE_INFO.email}
                      </a>
                    </span>
                  </div>

                  <div className="role-contact-detail">
                    <Clock3 size={17} />
                    <span>
                      <strong>Available Hours</strong>
                      {ADMIN_OFFICE_INFO.availability}
                    </span>
                  </div>
                </div>
              </article>
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
// ASSIGNMENT LIST
// --------------------------------------------------

function AssignmentList({ items = [] }) {
  if (items.length === 0) {
    return <p className="role-note">Nothing found.</p>;
  }

  return (
    <div className="activity-table-wrapper">
      <table className="activity-table role-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Due Date</th>
            <th>Submitted Date</th>
            <th>Status</th>
            <th>Grade</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => {
            const grade = item.grade;

            const marks =
              grade && typeof grade === "object"
                ? grade.marks
                : item.marks;

            const outOf =
              grade && typeof grade === "object"
                ? grade.out_of
                : item.out_of;

            const letter =
              grade && typeof grade === "object"
                ? grade.letter
                : item.letter;

            const hasGrade = grade != null || marks != null;

            return (
              <tr key={item.id ?? `${item.title}-${index}`}>
                <td>{item.title}</td>
                <td>{item.due_date || "—"}</td>
                <td>{item.submitted_date || "—"}</td>

                <td>
                  <span
                    className={`activity-status ${String(item.status || "")
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {item.status || "—"}
                  </span>
                </td>

                <td>
                  {!hasGrade
                    ? "Not graded yet"
                    : `${marks ?? "—"} / ${outOf ?? "—"}${
                        letter ? ` (${letter})` : ""
                      }`}
                </td>
              </tr>
            );
          })}
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
  items = [],
  loading = false,
  error = "",
  searchValue,
  onSearchChange,
}) {
  return (
    <section className="dashboard-panel role-panel">
      <PanelHeading
        title="Grades"
        subtitle="Your academic performance"
        action={onView ? "View report" : undefined}
        onAction={onView}
      />

      {onSearchChange && (
        <SearchRow
          count={items.length}
          noun="grades"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search course or faculty..."
        />
      )}

      {loading ? (
        <p className="role-note">Loading grades...</p>
      ) : error ? (
        <p className="role-error">{error}</p>
      ) : items.length === 0 ? (
        <p className="role-note">Nothing found.</p>
      ) : (
        <div className="activity-table-wrapper">
          <table className="activity-table role-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Faculty Name</th>
                <th>Grade</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id ?? `${item.course_name}-${index}`}>
                  <td>{item.course_name}</td>
                  <td>{item.faculty_name}</td>
                  <td>{item.grade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------
// SCHEDULE
// --------------------------------------------------

function SchedulePanel({
  full = false,
  items = [],
  loading = false,
  error = "",
  searchValue,
  onSearchChange,
  onView,
}) {
  return (
    <section
      className={`dashboard-panel role-panel ${
        full ? "role-full-panel" : ""
      }`}
    >
      <PanelHeading
        title="Class Schedule"
        subtitle="Your scheduled classes"
        action={onView ? "View all" : undefined}
        onAction={onView}
      />

      {onSearchChange && (
        <SearchRow
          count={items.length}
          noun="classes"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search course, faculty or room..."
        />
      )}

      {loading ? (
        <p className="role-note">Loading schedule...</p>
      ) : error ? (
        <p className="role-error">{error}</p>
      ) : items.length === 0 ? (
        <p className="role-note">Nothing found.</p>
      ) : (
        items.map((item, index) => (
          <div
            className="role-schedule-row"
            key={
              item.id ??
              `${item.course_code}-${item.start_time}-${index}`
            }
          >
            <span>
              {item.start_time} – {item.end_time}
            </span>

            <div>
              <strong>
                {item.course_name}
                {item.course_code ? ` (${item.course_code})` : ""}
              </strong>

              <small>
                {item.faculty_name || "Faculty not assigned"}
                {item.room ? ` · ${item.room}` : ""}
              </small>
            </div>
          </div>
        ))
      )}
    </section>
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