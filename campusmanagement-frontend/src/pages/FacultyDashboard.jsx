
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BookOpen,
  Users,
  ClipboardCheck,
  Award,
  ArrowUpRight,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Landmark,
  MapPin,
  Phone,
  Mail,
  Clock3,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./RoleDashboards.css";

const API_BASE = "http://localhost:8000/api/faculty";

const ADMIN_OFFICE_INFO = {
  address: "Main Administration Block, IIT Dharwad, Karnataka, India",
  phone: "+91 836 2212 800",
  email: "administration@iitdh.ac.in",
  availability: "Monday – Friday, 9:00 AM – 5:30 PM",
};

const getToken = () => localStorage.getItem("token");

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Your login session was not found. Please log in again.");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      "Unable to load data. Please try again."
    );
  }

  return data;
}

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not scheduled";

  const [hours, minutes] = value.split(":");
  const hour = Number(hours);

  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
}

function FacultyDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const firstName = (
    user?.profile?.name ||
    user?.username ||
    "Faculty"
  ).split(" ")[0];

  const profileName = user?.profile?.name || "Faculty";

  const [activeItem, setActiveItem] = useState("Dashboard");

  const [courses, setCourses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [schedule, setSchedule] = useState([]);

  // ASSIGNMENT MANAGEMENT

  const [assignmentCourses, setAssignmentCourses] = useState([]);
  const [selectedAssignmentCourse, setSelectedAssignmentCourse] =
    useState(null);

  const [courseAssignments, setCourseAssignments] = useState([]);

  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");

  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    due_date: "",
    max_marks: "1",
  });

  const [previousCourses, setPreviousCourses] = useState([]);
  const [previousStudents, setPreviousStudents] = useState([]);
  const [courseStudents, setCourseStudents] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedGradeCourse, setSelectedGradeCourse] = useState(null);

  // Starts as true: the dashboard data is requested as soon as the page opens
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");

  const [actionLoading, setActionLoading] = useState(null);

  const [gradeView, setGradeView] = useState(false);

  // Always use the latest onLogout without making the data reload
  const onLogoutRef = useRef(onLogout);

  useEffect(() => {
    onLogoutRef.current = onLogout;
  });

  const handleError = useCallback((err) => {
    if (err.message === "SESSION_EXPIRED") {
      onLogoutRef.current?.();
      return;
    }

    setError(err.message || "Something went wrong.");
  }, []);

  // Move to another page and clear the search boxes and any old error
  function goTo(item) {
    setSearch("");
    setRequestSearch("");
    setError("");
    setActiveItem(item);
  }

  // LOAD CURRENT-TERM FACULTY COURSES
  const loadCourses = useCallback(async () => {
    const data = await apiRequest("/courses/");
    setCourses(getList(data));
  }, []);

  // LOAD COURSES FOR ASSIGNMENT SECTION
  async function loadAssignmentCourses() {
    setAssignmentLoading(true);
    setAssignmentError("");

    try {
      const data = await apiRequest("/assignments/");

      setAssignmentCourses(getList(data));
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        handleError(err);
      } else {
        setAssignmentError(err.message);
      }
    } finally {
      setAssignmentLoading(false);
    }
  }

  // OPEN ASSIGNMENTS OF SELECTED COURSE
  async function openCourseAssignments(course) {
    setSelectedAssignmentCourse(course);
    setCourseAssignments([]);
    setAssignmentError("");
    setAssignmentMessage("");
    setAssignmentSearch("");

    setAssignmentLoading(true);

    try {
      const data = await apiRequest(
        `/courses/${encodeURIComponent(course.code)}/assignments/`
      );

      setCourseAssignments(getList(data));
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        handleError(err);
      } else {
        setAssignmentError(err.message);
      }
    } finally {
      setAssignmentLoading(false);
    }
  }

  // CREATE NEW ASSIGNMENT
  async function handleCreateAssignment(event) {
    event.preventDefault();

    if (!selectedAssignmentCourse) return;

    setCreatingAssignment(true);
    setAssignmentError("");
    setAssignmentMessage("");

    try {
      const payload = {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        due_date: assignmentForm.due_date,
        max_marks: Number(assignmentForm.max_marks),
      };

      const created = await apiRequest(
        `/courses/${encodeURIComponent(
          selectedAssignmentCourse.code
        )}/assignments/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      // Add the newly created assignment to the list
      setCourseAssignments((previous) => [
        ...previous,
        created,
      ]);

      // Update the assignment count of the course
      setAssignmentCourses((previous) =>
        previous.map((course) =>
          course.code === selectedAssignmentCourse.code
            ? {
                ...course,
                assignment_count:
                  Number(course.assignment_count || 0) + 1,
              }
            : course
        )
      );

      setAssignmentMessage("Assignment created successfully!");

      setShowAssignmentForm(false);

      setAssignmentForm({
        title: "",
        description: "",
        due_date: "",
        max_marks: "1",
      });

    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        handleError(err);
      } else {
        setAssignmentError(err.message);
      }
    } finally {
      setCreatingAssignment(false);
    }
  }

  // LOAD PENDING ENROLLMENT REQUESTS
  const loadRequests = useCallback(async () => {
    const data = await apiRequest(
      "/enrollment-requests/?status=pending"
    );

    setRequests(getList(data));
  }, []);

  // LOAD FACULTY SCHEDULE
  const loadSchedule = useCallback(async () => {
    const data = await apiRequest("/schedule/");
    setSchedule(getList(data));
  }, []);

  // LOAD COMPLETED COURSES
  const loadPreviousCourses = useCallback(async () => {
    const data = await apiRequest("/grades/");
    setPreviousCourses(getList(data));
  }, []);

  // FETCH ALL DASHBOARD DATA
  const fetchDashboardData = useCallback(
    () =>
      Promise.all([
        loadCourses(),
        loadRequests(),
        loadSchedule(),
        loadPreviousCourses(),
      ]),
    [loadCourses, loadRequests, loadSchedule, loadPreviousCourses]
  );

  // RELOAD ALL DASHBOARD DATA (used by the Retry button)
  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      await fetchDashboardData();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  // FIRST LOAD, when the page opens
  useEffect(() => {
    let cancelled = false;

    async function firstLoad() {
      try {
        await fetchDashboardData();
      } catch (err) {
        if (!cancelled) handleError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    firstLoad();

    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData, handleError]);

  // SIDEBAR NAVIGATION
  function handleNavigate(item) {
    if (item === "Logout") {
      onLogout?.();
      return;
    }

    setSelectedCourse(null);
    setCourseStudents([]);
    setSelectedGradeCourse(null);
    setPreviousStudents([]);
    setGradeView(false);

    // Load assignment courses when the Assignments page opens
    if (item === "Assignments") {
      setSelectedAssignmentCourse(null);
      setCourseAssignments([]);
      setAssignmentSearch("");
      setAssignmentMessage("");
      setAssignmentError("");

      loadAssignmentCourses();
    }

    goTo(item);
  }

  // VIEW STUDENTS OF A CURRENT-TERM COURSE
  async function openCourseStudents(course) {
    setSelectedCourse(course);
    setCourseStudents([]);
    setError("");
    setSearch("");

    setLoading(true);

    try {
      const data = await apiRequest(
        `/courses/${encodeURIComponent(course.code)}/students/`
      );

      setCourseStudents(getList(data));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  // NAVIGATE TO STUDENTS SECTION AND LOAD SELECTED COURSE
  function navigateToCourseStudents(course) {
    setSelectedCourse(course);
    setCourseStudents([]);
    goTo("Students");
    openCourseStudents(course);
  }

  // VIEW STUDENTS' GRADES FOR A COMPLETED COURSE
  async function openPreviousCourse(course) {
    setSelectedGradeCourse(course);
    setPreviousStudents([]);
    setGradeView(true);
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        `/grades/${encodeURIComponent(course.code)}/students/`
      );

      setPreviousStudents(getList(data));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  // APPROVE OR REJECT ENROLLMENT REQUEST
  async function decideRequest(requestId, decision) {
    setActionLoading(requestId);
    setError("");

    try {
      await apiRequest(
        `/enrollment-requests/${requestId}/${decision}/`,
        {
          method: "POST",
        }
      );

      await Promise.all([
        loadRequests(),
        loadCourses(),
      ]);
    } catch (err) {
      handleError(err);
    } finally {
      setActionLoading(null);
    }
  }

  // DASHBOARD STATISTICS
  const totalStudents = courses.reduce(
    (total, course) =>
      total + Number(course.enrolled_count || 0),
    0
  );

  const pendingRequests = requests.length;
  const totalPreviousCourses = previousCourses.length;

  // SEARCH FILTERS
  const filteredCourses = courses.filter((course) =>
    `${course.code} ${course.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredPreviousCourses = previousCourses.filter((course) =>
    `${course.code} ${course.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter((request) =>
    `${request.student_name} ${request.roll_no} ${request.course_code} ${request.course_name}`
      .toLowerCase()
      .includes(requestSearch.toLowerCase())
  );

  const filteredSchedule = schedule.filter((item) =>
    `${item.course_code} ${item.course_name} ${item.room}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredStudents = courseStudents.filter((student) =>
    `${student.name} ${student.roll_no} ${student.email} ${student.department}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredAssignmentCourses = assignmentCourses.filter((course) =>
    `${course.code} ${course.name}`
      .toLowerCase()
      .includes(assignmentSearch.toLowerCase())
  );

  const filteredCourseAssignments = courseAssignments.filter((assignment) =>
    `${assignment.title} ${assignment.description || ""}`
      .toLowerCase()
      .includes(assignmentSearch.toLowerCase())
  );

  const filteredPreviousStudents = previousStudents.filter((student) =>
    `${student.name} ${student.roll_no} ${student.department} ${student.grade}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="admin-layout">

      <Sidebar
        role="Faculty"
        activeItem={activeItem}
        onNavigate={handleNavigate}
      />

      <main className="admin-main">

        <Navbar
          pageTitle={activeItem}
          role="Faculty"
          profileName={profileName}
        />

        <div className="dashboard-content">

          {/* ERROR MESSAGE */}
          {error && (
            <div className="course-error">
              {error}

              <button
                className="course-retry"
                onClick={loadDashboard}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="role-loading">
              <RefreshCw size={18} className="role-spin" />
              Loading information...
            </div>
          )}

          {/* DASHBOARD */}
          {activeItem === "Dashboard" && (
            <>
              <section className="welcome-banner">
                <div>
                  <h1>Welcome back, {firstName}!</h1>
                  <p>
                    Here's your teaching overview and what needs
                    your attention.
                  </p>
                </div>

                <div className="welcome-icon">
                  <GraduationCap size={65} />
                </div>
              </section>

              {/* THREE STAT CARDS */}
              <div className="stats-grid faculty-stats-grid">

                <Stat
                  icon={Users}
                  value={totalStudents}
                  label="Enrolled Students"
                />

                <Stat
                  icon={ClipboardCheck}
                  value={pendingRequests}
                  label="Pending Requests"
                />

                <Stat
                  icon={Award}
                  value={totalPreviousCourses}
                  label="Completed Courses"
                />

              </div>

              {/* MY COURSES PREVIEW */}
              <section className="dashboard-panel role-panel">
                <PanelHeading
                  title="My Courses"
                  subtitle="Your current-term courses"
                  action="View all"
                  onAction={() => goTo("My Courses")}
                />

                <ClassGrid
                  items={courses.slice(0, 3)}
                  onStudents={navigateToCourseStudents}
                  showAction={true}
                />
              </section>

              {/* PENDING REQUESTS */}
              <section className="dashboard-panel role-panel">
                <PanelHeading
                  title="Pending Enrollment Requests"
                  subtitle="Requests waiting for your approval"
                  action="View all"
                  onAction={() =>
                    goTo("Enrollment Requests")
                  }
                />

                <RequestTable
                  items={requests.slice(0, 3)}
                  onDecision={decideRequest}
                  actionLoading={actionLoading}
                />
              </section>

              <SchedulePanel items={schedule.slice(0, 4)} />
            </>
          )}

          {/* MY COURSES */}
          {activeItem === "My Courses" && (
            <section className="dashboard-panel role-panel">

              {/* CURRENT TERM COURSES */}
              <div className="faculty-course-section">

                <PanelHeading
                  title="Current Term Courses"
                  subtitle="Courses assigned to you this semester"
                />

                <SearchRow
                  count={filteredCourses.length}
                  noun="courses"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search current courses..."
                />

                <ClassGrid
                  items={filteredCourses}
                  onStudents={navigateToCourseStudents}
                  showAction={true}
                />

              </div>

              {/* COMPLETED COURSES */}
              <div className="faculty-course-section faculty-completed-section">

                <PanelHeading
                  title="Completed Courses"
                  subtitle="Courses you taught in previous semesters"
                />

                <SearchRow
                  count={filteredPreviousCourses.length}
                  noun="completed courses"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search completed courses..."
                />

                {filteredPreviousCourses.length === 0 ? (
                  <p className="role-note">
                    No completed courses are available.
                  </p>
                ) : (
                  <div className="role-class-grid">

                    {filteredPreviousCourses.map((course) => (
                      <article
                        className="role-class-card"
                        key={course.code}
                      >

                        <div className="role-class-top">
                          <span className="role-course-code">
                            {course.code}
                          </span>

                          <span className="role-class-count">
                            <Users size={14} />
                            {course.student_count ?? 0} students
                          </span>
                        </div>

                        <h3>{course.name}</h3>

                        <p>
                          <BookOpen size={14} />
                          {course.credits ?? "—"} credits
                        </p>

                        <button
                          className="role-text-button"
                          onClick={() => {
                            goTo("Grades");
                            openPreviousCourse(course);
                          }}
                        >
                          View Student Results
                          <ArrowUpRight size={15} />
                        </button>

                      </article>
                    ))}

                  </div>
                )}

              </div>

            </section>
          )}

          {/* STUDENTS */}
          {activeItem === "Students" && (
            <section className="dashboard-panel role-panel">

              {selectedCourse ? (
                <>
                  <PanelHeading
                    title={`Students - ${selectedCourse.code}`}
                    subtitle={selectedCourse.name}
                    action="Back to Courses"
                    onAction={() => {
                      setSelectedCourse(null);
                      setCourseStudents([]);
                      setSearch("");
                    }}
                  />

                  <SearchRow
                    count={filteredStudents.length}
                    noun="students"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search students..."
                  />

                  <StudentTable items={filteredStudents} />
                </>
              ) : (
                <>
                  <PanelHeading
                    title="Students"
                    subtitle="Select a course to view its enrolled students"
                  />

                  <ClassGrid
                    items={courses}
                    onStudents={navigateToCourseStudents}
                    buttonText="View Students"
                    showAction={true}
                  />
                </>
              )}

            </section>
          )}

          {/* ENROLLMENT REQUESTS */}
          {activeItem === "Enrollment Requests" && (
            <section className="dashboard-panel role-panel">

              <PanelHeading
                title="Enrollment Requests"
                subtitle="Review and manage student enrollment requests"
              />

              <SearchRow
                count={filteredRequests.length}
                noun="pending requests"
                value={requestSearch}
                onChange={setRequestSearch}
                placeholder="Search student or course..."
              />

              <RequestTable
                items={filteredRequests}
                onDecision={decideRequest}
                actionLoading={actionLoading}
              />

            </section>
          )}

          {/* GRADES */}
          {activeItem === "Grades" && (
            <section className="dashboard-panel role-panel">

              {gradeView && selectedGradeCourse ? (
                <>
                  <PanelHeading
                    title={`Grades - ${selectedGradeCourse.code}`}
                    subtitle={selectedGradeCourse.name}
                    action="Back to Courses"
                    onAction={() => {
                      setGradeView(false);
                      setSelectedGradeCourse(null);
                      setPreviousStudents([]);
                    }}
                  />

                  <SearchRow
                    count={filteredPreviousStudents.length}
                    noun="students"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search student or grade..."
                  />

                  <PreviousGradeTable
                    items={filteredPreviousStudents}
                  />
                </>
              ) : (
                <>
                  <PanelHeading
                    title="Grade Management"
                    subtitle="Select a previous course to view student results"
                  />

                  {previousCourses.length === 0 ? (
                    <p className="role-note">
                      No previous course grade records are available.
                    </p>
                  ) : (
                    <div className="role-class-grid">

                      {previousCourses.map((course) => (
                        <article
                          className="role-class-card"
                          key={course.code}
                        >

                          <span className="role-course-code">
                            {course.code}
                          </span>

                          <h3>{course.name}</h3>

                          <p>
                            <Users size={14} />
                            {course.student_count ?? 0} students
                          </p>

                          <p>
                            {course.credits ?? "—"} credits
                          </p>

                          <button
                            className="role-text-button"
                            onClick={() =>
                              openPreviousCourse(course)
                            }
                          >
                            View Grades
                            <ArrowUpRight size={15} />
                          </button>

                        </article>
                      ))}

                    </div>
                  )}
                </>
              )}

            </section>
          )}

          {/* SCHEDULE */}
          {activeItem === "Schedule" && (
            <SchedulePanel
              full
              items={filteredSchedule}
              searchValue={search}
              onSearchChange={setSearch}
            />
          )}

          {/* REPORTS */}
          {activeItem === "Reports" && (
            <section className="dashboard-panel role-panel">

              <PanelHeading
                title="Teaching Reports"
                subtitle="Individual academic summaries for your assigned courses"
              />

              {courses.length === 0 ? (
                <p className="role-note">
                  No course reports are available.
                </p>
              ) : (
                <div className="role-class-grid">

                  {courses.map((course) => (
                    <article
                      className="role-class-card"
                      key={course.code}
                    >

                      <div className="role-class-top">

                        <span className="role-course-code">
                          {course.code}
                        </span>

                        <span className="role-class-count">
                          <Users size={14} />
                          {course.enrolled_count ?? 0} students
                        </span>

                      </div>

                      <h3>{course.name}</h3>

                      <div className="role-course-report-details">

                        <p>
                          <BookOpen size={14} />
                          Credits: {course.credits ?? "—"}
                        </p>

                        <p>
                          <Users size={14} />
                          Enrolled: {course.enrolled_count ?? 0}
                        </p>

                        <p>
                          <GraduationCap size={14} />
                          Capacity: {course.capacity ?? "—"}
                        </p>

                        <p>
                          <CheckCircle2 size={14} />
                          Seats remaining: {course.seats_left ?? "—"}
                        </p>

                        <p>
                          <ClipboardCheck size={14} />
                          Pending requests: {course.pending_requests ?? 0}
                        </p>

                      </div>

                      <button
                        className="role-text-button"
                        onClick={() =>
                          navigateToCourseStudents(course)
                        }
                      >
                        View Course Students
                        <ArrowUpRight size={15} />
                      </button>

                    </article>
                  ))}

                </div>
              )}

            </section>
          )}

          
          {/* ASSIGNMENTS */}
          {activeItem === "Assignments" && (
          <section className="dashboard-panel role-panel">

          {!selectedAssignmentCourse ? (
          <>
          <PanelHeading
            title="Assignments"
            subtitle="Select a current course to manage its assignments"
          />

          <SearchRow
            count={filteredAssignmentCourses.length}
            noun="courses"
            value={assignmentSearch}
            onChange={setAssignmentSearch}
            placeholder="Search courses..."
          />

          {assignmentLoading ? (
            <p className="role-note">Loading courses...</p>
          ) : assignmentError ? (
            <div className="course-error">
              {assignmentError}
              <button
                className="course-retry"
                onClick={loadAssignmentCourses}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          ) : filteredAssignmentCourses.length === 0 ? (
            <p className="role-note">
              No current courses found.
            </p>
          ) : (
            <div className="role-class-grid">

              {filteredAssignmentCourses.map((course) => (
                <article
                  className="role-class-card"
                  key={course.code}
                >
                  <div className="role-class-top">
                    <span className="role-course-code">
                      {course.code}
                    </span>

                    <span className="role-class-count">
                      <ClipboardCheck size={14} />
                      {course.assignment_count ?? 0} Assignments
                    </span>
                  </div>

                  <h3>{course.name}</h3>

                  <button
                    className="role-text-button"
                    onClick={() => openCourseAssignments(course)}
                  >
                    View Assignments
                    <ArrowUpRight size={15} />
                  </button>

                </article>
              ))}

            </div>
          )}
        </>
      ) : (
        <>
          <PanelHeading
            title={selectedAssignmentCourse.name}
            subtitle={`Course Code: ${selectedAssignmentCourse.code}`}
            action="Back to Courses"
            onAction={() => {
              setSelectedAssignmentCourse(null);
              setCourseAssignments([]);
              setAssignmentSearch("");
              setAssignmentError("");
              setAssignmentMessage("");
            }}
          />

          {assignmentMessage && (
            <div className="course-success">
              <CheckCircle2 size={17} />
              {assignmentMessage}
            </div>
          )}

          {assignmentError && (
            <div className="course-error">
              {assignmentError}
            </div>
          )}

          <div className="assignment-toolbar">
            <h3>Course Assignments</h3>

            <button
              className="role-primary-button"
              onClick={() => {
                setAssignmentError("");
                setAssignmentMessage("");
                setShowAssignmentForm(true);
              }}
            >
              + Create Assignment
            </button>
          </div>

          {!assignmentLoading && courseAssignments.length > 0 && (
            <SearchRow
              count={filteredCourseAssignments.length}
              noun="assignments"
              value={assignmentSearch}
              onChange={setAssignmentSearch}
              placeholder="Search assignments..."
            />
          )}

          {assignmentLoading ? (
            <p className="role-note">Loading assignments...</p>
          ) : courseAssignments.length === 0 ? (
            <div className="assignment-empty">
              <ClipboardCheck size={35} />
              <h3>No assignments yet</h3>
              <p>Create your first assignment for this course.</p>
            </div>
          ) : filteredCourseAssignments.length === 0 ? (
            <p className="role-note">
              No matching assignments found.
            </p>
          ) : (
            <div className="assignment-list">

              {filteredCourseAssignments.map((assignment) => (
                <article
                  className="assignment-card"
                  key={assignment.id}
                >
                  <div className="assignment-card-heading">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p>
                        {assignment.description ||
                          "No description provided."}
                      </p>
                    </div>

                    <span className="assignment-marks">
                      {assignment.max_marks} Marks
                    </span>
                  </div>

                  <div className="assignment-details">
                    <span>
                      Due: {formatDate(assignment.due_date)}
                    </span>

                    <span>
                      Students: {assignment.student_count ?? 0}
                    </span>

                    <span>
                      Submitted: {assignment.submission_count ?? 0}
                      /{assignment.student_count ?? 0}
                    </span>

                    <span>
                      Graded: {assignment.graded_count ?? 0}
                      /{assignment.student_count ?? 0}
                    </span>
                  </div>
                </article>
              ))}

            </div>
          )}

          {/* CREATE ASSIGNMENT MODAL */}
          {showAssignmentForm && (
            <div
              className="role-modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget &&
                    !creatingAssignment) {
                  setShowAssignmentForm(false);
                }
              }}
            >
              <form
                className="role-create-modal assignment-modal"
                onSubmit={handleCreateAssignment}
              >
                <h3>Create Assignment</h3>

                <p>
                  Create an assignment for{" "}
                  <strong>{selectedAssignmentCourse.code}</strong>.
                </p>

                <label>
                  Assignment Title *
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="Enter assignment title"
                    value={assignmentForm.title}
                    onChange={(event) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        title: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Description
                  <textarea
                    rows={4}
                    placeholder="Enter assignment instructions..."
                    value={assignmentForm.description}
                    onChange={(event) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        description: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Due Date *
                  <input
                    type="date"
                    required
                    min={new Date(
                      Date.now() - new Date().getTimezoneOffset() * 60000
                    ).toISOString().slice(0, 10)}
                    value={assignmentForm.due_date}
                    onChange={(event) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        due_date: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Maximum Marks *
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="Enter maximum marks"
                    value={assignmentForm.max_marks}
                    onChange={(event) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        max_marks: event.target.value,
                      })
                    }
                  />
                </label>

                {assignmentError && (
                  <div className="course-error">
                    {assignmentError}
                  </div>
                )}

                <div className="role-modal-actions">
                  <button
                    type="button"
                    className="assignment-cancel-button"
                    disabled={creatingAssignment}
                    onClick={() => setShowAssignmentForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="role-primary-button"
                    disabled={creatingAssignment}
                  >
                    {creatingAssignment
                      ? "Creating..."
                      : "Create Assignment"}
                  </button>
                </div>

              </form>
            </div>
          )}
        </>
      )}
    </section>
  )}
          
          {/* HELP & CONTACT */}

          {activeItem === "Help & Contact" && (
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

// STATISTICS CARD
function Stat({ icon: Icon, value, label, period = "This term" }) {
  return (
    <article className="stat-card">

      <div className="stat-top">
        <div className="stat-icon">
          <Icon size={23} />
        </div>

        <span className="stat-change">{period}</span>
      </div>

      <h2>{value}</h2>
      <p>{label}</p>

    </article>
  );
}

// SECTION HEADING
function PanelHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="panel-heading">

      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      {action && (
        <button
          className="view-button"
          onClick={onAction}
        >
          {action}
        </button>
      )}

    </div>
  );
}

// SEARCH BAR
function SearchRow({ count, noun, value, onChange, placeholder }) {
  return (
    <div className="role-search-row">

      <span>{count} {noun}</span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />

    </div>
  );
}

// COURSE CARDS
function ClassGrid({
  items,
  onStudents,
  buttonText = "View students",
  showAction = true,
}) {
  if (!items || items.length === 0) {
    return <p className="role-note">No courses found.</p>;
  }

  return (
    <div className="role-class-grid">

      {items.map((course) => (
        <article
          className="role-class-card"
          key={course.code}
        >

          <div className="role-class-top">

            <span className="role-course-code">
              {course.code}
            </span>

            <span className="role-class-count">
              <Users size={14} />
              {course.enrolled_count ?? 0} students
            </span>

          </div>

          <h3>{course.name}</h3>

          <p>
            <BookOpen size={14} />
            {course.credits ?? "—"} credits
          </p>

          <p>
            <Users size={14} />
            {course.seats_left ?? 0} seats available
          </p>

          {showAction && onStudents && (
            <button
              className="role-text-button"
              onClick={() => onStudents(course)}
            >
              {buttonText}
              <ArrowUpRight size={15} />
            </button>
          )}

        </article>
      ))}

    </div>
  );
}

// ENROLLED STUDENTS TABLE
function StudentTable({ items }) {
  if (!items.length) {
    return <p className="role-note">No enrolled students found.</p>;
  }

  return (
    <div className="activity-table-wrapper">

      <table className="activity-table role-table">

        <thead>
          <tr>
            <th>Roll Number</th>
            <th>Student Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Year</th>
          </tr>
        </thead>

        <tbody>
          {items.map((student) => (
            <tr key={student.roll_no}>
              <td>{student.roll_no}</td>
              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.department}</td>
              <td>{student.year}</td>
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}

// ENROLLMENT REQUESTS TABLE
function RequestTable({ items, onDecision, actionLoading }) {
  if (!items.length) {
    return (
      <p className="role-note">
        No pending enrollment requests.
      </p>
    );
  }

  return (
    <div className="activity-table-wrapper">

      <table className="activity-table role-table">

        <thead>
          <tr>
            <th>Student</th>
            <th>Roll Number</th>
            <th>Course</th>
            <th>Seats Left</th>
            <th>Requested On</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map((request) => (
            <tr key={request.id}>

              <td>{request.student_name}</td>
              <td>{request.roll_no}</td>

              <td>
                {request.course_code}
                <br />
                {request.course_name}
              </td>

              <td>{request.seats_left ?? "—"}</td>

              <td>{formatDate(request.requested_at)}</td>

              <td>
                <div className="role-request-actions">

                  <button
                    className="role-approve-button"
                    disabled={actionLoading === request.id}
                    onClick={() =>
                      onDecision(request.id, "approve")
                    }
                    title="Approve request"
                  >
                    <CheckCircle2 size={15} />
                    Approve
                  </button>

                  <button
                    className="role-reject-button"
                    disabled={actionLoading === request.id}
                    onClick={() =>
                      onDecision(request.id, "reject")
                    }
                    title="Reject request"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>

                </div>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}

// PREVIOUS COURSE GRADES TABLE
function PreviousGradeTable({ items }) {
  if (!items.length) {
    return (
      <p className="role-note">
        No student grade records found.
      </p>
    );
  }

  return (
    <div className="activity-table-wrapper">

      <table className="activity-table role-table">

        <thead>
          <tr>
            <th>Roll Number</th>
            <th>Student Name</th>
            <th>Department</th>
            <th>Grade</th>
            <th>Attendance</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {items.map((student) => (
            <tr key={student.roll_no}>

              <td>{student.roll_no}</td>
              <td>{student.name}</td>
              <td>{student.department}</td>
              <td>{student.grade || "—"}</td>

              <td>
                {student.attendance == null
                  ? "—"
                  : `${student.attendance}%`}
              </td>

              <td>
                <span
                  className={`activity-status ${
                    student.status?.toLowerCase() === "completed"
                      ? "completed"
                      : "pending"
                  }`}
                >
                  {student.status || "—"}
                </span>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}

// FACULTY SCHEDULE
function SchedulePanel({
  full = false,
  items = [],
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
        title="Teaching Schedule"
        subtitle="Your scheduled classes"
      />

      {onSearchChange && (
        <SearchRow
          count={items.length}
          noun="classes"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search courses or rooms..."
        />
      )}

      {items.length === 0 ? (
        <p className="role-note">
          No scheduled classes found.
        </p>
      ) : (
        items.map((item, index) => (
          <div
            className="role-schedule-row"
            key={`${item.course_code}-${index}`}
          >

            <span>
              {formatTime(item.start_time)}
            </span>

            <div>

              <strong>
                {item.course_code} - {item.course_name}
              </strong>

              <small>
                {formatTime(item.start_time)} –{" "}
                {formatTime(item.end_time)}
                {" · "}
                {item.room || "Room not assigned"}
                {" · "}
                {item.enrolled_count ?? 0} students
              </small>

            </div>

          </div>
        ))
      )}

    </section>
  );
}

export default FacultyDashboard;