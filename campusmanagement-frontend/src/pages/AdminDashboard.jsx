
import { useEffect, useState } from "react";

import {
  Users,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  FileText,
  Award,
  BarChart3,
  Search,
  LifeBuoy,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "./AdminDashboard.css";

// --------------------------------------------------
// BACKEND CONFIGURATION
// --------------------------------------------------

const API_BASE_URL = "http://localhost:8000/api/auth";

const API_ENDPOINTS = {
  Dashboard: "/admin/dashboard/",
  Students: "/admin/students/",
  Faculty: "/admin/faculty/",
  Courses: "/admin/courses/",
  Enrollments: "/admin/enrollments/",
  Assignments: "/admin/assignments/",
  Grades: "/admin/grades/",
};

// --------------------------------------------------
// MANAGEMENT PAGE CONFIGURATION
// --------------------------------------------------

const MANAGEMENT_PAGES = {
  Students: {
    title: "Student Management",
    description: "Student records from the campus database.",
    icon: Users,
    columns: [
      { key: "roll_no", label: "Roll Number" },
      { key: "name", label: "Student Name" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "year", label: "Year" },
      { key: "status", label: "Status" },
    ],
  },

  Faculty: {
    title: "Faculty Management",
    description: "Faculty members and their information.",
    icon: GraduationCap,
    columns: [
      { key: "name", label: "Faculty Name" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email" },
      { key: "department", label: "Department" },
      { key: "status", label: "Status" },
    ],
  },

  Courses: {
    title: "Course Management",
    description: "Available courses in the campus.",
    icon: BookOpen,
    columns: [
      { key: "code", label: "Course Code" },
      { key: "name", label: "Course Name" },
      { key: "department", label: "Department" },
      { key: "faculty", label: "Faculty" },
      { key: "credits", label: "Credits" },
    ],
  },

  Enrollments: {
    title: "Enrollment Management",
    description: "Student course registrations.",
    icon: ClipboardList,
    columns: [
      { key: "student", label: "Student" },
      { key: "course", label: "Course" },
      { key: "semester", label: "Semester" },
      { key: "status", label: "Status" },
    ],
  },

  Assignments: {
    title: "Assignment Management",
    description: "Assignments and their submission status.",
    icon: FileText,
    columns: [
      { key: "title", label: "Assignment" },
      { key: "course", label: "Course" },
      { key: "due", label: "Due Date" },
      { key: "status", label: "Status" },
    ],
  },

  Grades: {
    title: "Grade Management",
    description: "Student grades and course results.",
    icon: Award,
    columns: [
      { key: "student", label: "Student" },
      { key: "course", label: "Course" },
      { key: "grade", label: "Grade" },
    ],
  },
};

// --------------------------------------------------
// REUSABLE API FUNCTION
// --------------------------------------------------

async function fetchFromBackend(endpoint, signal) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Login token is missing. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (response.status === 401) {
    throw new Error("SESSION_EXPIRED");
  }

  if (!response.ok) {
    let message = "Unable to load data from the backend.";

    try {
      const errorData = await response.json();
      message = errorData.message || errorData.detail || message;
    } catch {
      // Use the default error message.
    }

    throw new Error(message);
  }

  const result = await response.json();

  if (Array.isArray(result)) {
    return result;
  }

  if (Array.isArray(result.results)) {
    return result.results;
  }

  throw new Error(
    "The backend response must be a list or contain a results list."
  );
}

// --------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------

function AdminDashboard({ onLogout }) {
  const [activeItem, setActiveItem] = useState("Dashboard");

  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [recordsByPage, setRecordsByPage] = useState({});
  const [loadingByPage, setLoadingByPage] = useState({});
  const [errorsByPage, setErrorsByPage] = useState({});

  // FETCH DASHBOARD STATISTICS

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("SESSION_EXPIRED");
        }

        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.Dashboard}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          throw new Error("SESSION_EXPIRED");
        }

        if (!response.ok) {
          throw new Error("Failed to load dashboard statistics.");
        }

        const result = await response.json();

        if (!controller.signal.aborted) {
          setDashboardData(result);
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        if (err.message === "SESSION_EXPIRED") {
          onLogout?.();
          return;
        }

        setDashboardError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [onLogout]);

  // FETCH MANAGEMENT PAGE DATA

  useEffect(() => {
    const endpoint = API_ENDPOINTS[activeItem];

    if (!endpoint || activeItem === "Dashboard") {
      return;
    }

    const controller = new AbortController();

    async function loadRecords() {
      setLoadingByPage((previous) => ({
        ...previous,
        [activeItem]: true,
      }));

      setErrorsByPage((previous) => ({
        ...previous,
        [activeItem]: "",
      }));

      try {
        const result = await fetchFromBackend(
          endpoint,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setRecordsByPage((previous) => ({
            ...previous,
            [activeItem]: result,
          }));
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        if (err.message === "SESSION_EXPIRED") {
          onLogout?.();
          return;
        }

        setErrorsByPage((previous) => ({
          ...previous,
          [activeItem]: err.message,
        }));
      } finally {
        if (!controller.signal.aborted) {
          setLoadingByPage((previous) => ({
            ...previous,
            [activeItem]: false,
          }));
        }
      }
    }

    loadRecords();

    return () => controller.abort();
  }, [activeItem, onLogout]);

  // FORMAT DATA

  const fmt = (value) =>
    dashboardData
      ? Number(value ?? 0).toLocaleString()
      : dashboardLoading
      ? "..."
      : "0";

  const chartData = dashboardData?.chart ?? [];

  const chartMax = Math.max(
    1,
    ...chartData.map((item) => Number(item.value) || 0)
  );

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map(
    (factor) => Math.round(chartMax * factor)
  );

  const activities = (dashboardData?.recent ?? []).map(
    (activity) => ({
      ...activity,
      date: activity.date
        ? new Date(activity.date).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "-",
    })
  );

  // NAVIGATION

  function handleNavigate(item) {
    if (item === "Logout") {
      onLogout?.();
      return;
    }

    setActiveItem(item);
  }

  // DASHBOARD STATISTICS

  const stats = [
    {
      title: "Total Students",
      value: fmt(dashboardData?.students),
      icon: Users,
    },
    {
      title: "Total Faculty",
      value: fmt(dashboardData?.faculty),
      icon: GraduationCap,
    },
    {
      title: "Administrators",
      value: fmt(dashboardData?.admins),
      icon: ShieldCheck,
    },
    {
      title: "Active Accounts",
      value: fmt(
        (dashboardData?.active_students ?? 0) +
        (dashboardData?.active_faculty ?? 0)
      ),
      icon: UserCheck,
    },
  ];

  // DASHBOARD PAGE

  function renderDashboard() {
    return (
      <>
        <div className="welcome-banner">
          <div>
            <h1>Welcome back, Administrator!</h1>
            <p>Here's what's happening with your campus today.</p>
          </div>

          <div className="welcome-icon">
            <GraduationCap size={65} />
          </div>
        </div>

        {dashboardError && (
          <div className="login-error">{dashboardError}</div>
        )}

        <div className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="stat-card" key={stat.title}>
                <div className="stat-top">
                  <div className="stat-icon">
                    <Icon size={23} />
                  </div>
                </div>

                <h2>{stat.value}</h2>
                <p>{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="dashboard-middle">
          <section className="dashboard-panel chart-panel">
            <div className="panel-heading">
              <div>
                <h3>Registrations Overview</h3>
                <p>New accounts per month</p>
              </div>

              <button className="view-button">
                Last 8 Months
              </button>
            </div>

            <div className="chart">
              <div className="chart-y-axis">
                {yTicks.map((tick, index) => (
                  <span key={index}>{tick}</span>
                ))}
              </div>

              <div className="chart-bars">
                {chartData.map((item) => (
                  <div className="bar-column" key={item.month}>
                    <div className="bar-area">
                      <div
                        className="chart-bar"
                        style={{
                          height: `${
                            (Number(item.value) / chartMax) * 100
                          }%`,
                        }}
                        title={`${item.value} new accounts`}
                      />
                    </div>

                    <span>{item.month}</span>
                  </div>
                ))}

                {!dashboardLoading && chartData.length === 0 && (
                  <p>No registration data available.</p>
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-panel summary-panel">
            <h3>Quick Summary</h3>

            <p className="summary-description">
              Current campus statistics
            </p>

            <div className="summary-item">
              <span>Active Students</span>
              <strong>{fmt(dashboardData?.active_students)}</strong>
            </div>

            <div className="summary-item">
              <span>Active Faculty</span>
              <strong>{fmt(dashboardData?.active_faculty)}</strong>
            </div>

            <div className="summary-item">
              <span>Administrators</span>
              <strong>{fmt(dashboardData?.admins)}</strong>
            </div>

            <button
              className="summary-button"
              onClick={() => setActiveItem("Reports")}
            >
              View Reports
              <ArrowUpRight size={17} />
            </button>
          </section>
        </div>

        <section className="dashboard-panel activity-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent Activity</h3>
              <p>Latest registrations</p>
            </div>

            <button
              className="view-button"
              onClick={() => setActiveItem("Reports")}
            >
              View All
            </button>
          </div>

          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      {dashboardLoading
                        ? "Loading..."
                        : "No recent activity."}
                    </td>
                  </tr>
                ) : (
                  activities.map((activity, index) => (
                    <tr key={index}>
                      <td>{activity.name}</td>
                      <td>{activity.action}</td>
                      <td>{activity.date}</td>
                      <td>
                        <span
                          className={`activity-status ${
                            activity.status === "Active"
                              ? "completed"
                              : "pending"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  // MANAGEMENT PAGES

  function renderManagementPage() {
    const config = MANAGEMENT_PAGES[activeItem];

    if (!config) return null;

    return (
      <ManagementSection
        key={activeItem}
        config={config}
        records={recordsByPage[activeItem] ?? []}
        loading={loadingByPage[activeItem] ?? false}
        error={errorsByPage[activeItem] ?? ""}
      />
    );
  }

  // REPORTS PAGE

  function renderReports() {
    return (
      <section className="dashboard-panel role-panel">
        <div className="panel-heading">
          <div>
            <h3>Campus Reports</h3>
            <p>Campus management statistics.</p>
          </div>

          <BarChart3 size={28} />
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={23} />
            </div>
            <h2>{fmt(dashboardData?.students)}</h2>
            <p>Total Students</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <GraduationCap size={23} />
            </div>
            <h2>{fmt(dashboardData?.faculty)}</h2>
            <p>Total Faculty</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen size={23} />
            </div>
            <h2>{recordsByPage.Courses?.length ?? "..."}</h2>
            <p>Total Courses</p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <ClipboardList size={23} />
            </div>
            <h2>{recordsByPage.Enrollments?.length ?? "..."}</h2>
            <p>Total Enrollments</p>
          </div>
        </div>

        <h3 style={{ marginTop: "25px" }}>
          Registration Activity
        </h3>

        <div className="activity-table-wrapper">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>New Registrations</th>
              </tr>
            </thead>

            <tbody>
              {chartData.length === 0 ? (
                <tr>
                  <td colSpan={2}>No report data available.</td>
                </tr>
              ) : (
                chartData.map((item) => (
                  <tr key={item.month}>
                    <td>{item.month}</td>
                    <td>{item.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  // HELP & CONTACT PAGE

  function renderHelpAndContact() {
    return <AdminHelpAndContact />;
  }

  // MAIN RENDER

  return (
    <div className="admin-layout">
      <Sidebar
        activeItem={activeItem}
        onNavigate={handleNavigate}
        role="Admin"
      />

      <main className="admin-main">
        <Navbar pageTitle={activeItem} role="Admin" />

        <div className="dashboard-content">
          {activeItem === "Dashboard" && renderDashboard()}

          {MANAGEMENT_PAGES[activeItem] && renderManagementPage()}

          {activeItem === "Reports" && renderReports()}

          {activeItem === "Help & Contact" && renderHelpAndContact()}
        </div>
      </main>
    </div>
  );
}

// --------------------------------------------------
// REUSABLE MANAGEMENT SECTION
// --------------------------------------------------

function ManagementSection({
  config,
  records,
  loading,
  error,
}) {
  const [search, setSearch] = useState("");

  const Icon = config.icon;

  const filteredRecords = records.filter((record) =>
    config.columns.some((column) =>
      String(record[column.key] ?? "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  return (
    <section className="dashboard-panel role-panel">
      {/* ORANGE TITLE PANEL */}
      <div className="panel-heading">
        <div>
          <h3>{config.title}</h3>
          <p>{config.description}</p>
        </div>

        <Icon size={28} />
      </div>

      {/* SEARCH BAR BELOW TITLE, ALIGNED RIGHT */}
      <div className="management-toolbar">
        <div className="management-search">
          <Search size={18} />

          <input
            type="text"
            placeholder={`Search ${config.title.replace(
              " Management",
              ""
            ).toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="management-count">
        {loading
          ? "Loading records..."
          : `Showing ${filteredRecords.length} of ${records.length} records`}
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="activity-table-wrapper">
        <table className="activity-table">
          <thead>
            <tr>
              {config.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={config.columns.length}>
                  Loading records from the database...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={config.columns.length}>
                  Unable to load records.
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length}>
                  {search
                    ? "No matching records found."
                    : "No records found in the database."}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <tr key={record.id ?? index}>
                  {config.columns.map((column) => {
                    const value = record[column.key];

                    return (
                      <td key={column.key}>
                        {column.key === "status" && value ? (
                          <span
                            className={`activity-status ${
                              ["Active", "Approved", "Completed"].includes(value)
                                ? "completed"
                                : "pending"
                            }`}
                          >
                            {value}
                          </span>
                        ) : (
                          value ?? "-"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --------------------------------------------------
// ADMIN HELP & CONTACT
// --------------------------------------------------

function AdminHelpAndContact() {
  return (
    <section className="dashboard-panel role-panel">
      <div className="panel-heading">
        <div>
          <h3>Help & Contact</h3>
          <p>Get in touch with the campus support teams</p>
        </div>

        <LifeBuoy size={27} />
      </div>
    </section>
  );
}

export default AdminDashboard;
