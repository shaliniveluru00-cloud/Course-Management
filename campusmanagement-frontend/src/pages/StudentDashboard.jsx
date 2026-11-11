import { useState } from "react";
import {
  BookOpen, ClipboardCheck, Award, CalendarDays, Clock3,
  ArrowUpRight, Bell, GraduationCap, CheckCircle2
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./RoleDashboards.css";

const courses = [
  { code: "CS301", name: "Data Structures & Algorithms", faculty: "Dr. Ananya Rao", progress: 78 },
  { code: "CS305", name: "Database Management Systems", faculty: "Prof. Kiran Kumar", progress: 64 },
  { code: "MA202", name: "Discrete Mathematics", faculty: "Dr. Meera Shah", progress: 86 }
];
const assignments = [
  { title: "Binary Search Tree Implementation", course: "Data Structures", due: "Nov 10, 2026", status: "Pending" },
  { title: "SQL Queries – Lab 4", course: "Database Management", due: "Nov 12, 2026", status: "Submitted" },
  { title: "Graph Theory Worksheet", course: "Discrete Mathematics", due: "Nov 15, 2026", status: "Pending" }
];

function StudentDashboard({ onLogout }) {

  
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const firstName = (user?.profile?.name ?? "").split(" ")[0];

  const [activeItem, setActiveItem] = useState("Dashboard");
  const [search, setSearch] = useState("");

  const filteredAssignments = assignments.filter((item) =>
    `${item.title} ${item.course}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleNavigate(item) {
    if (item === "Logout") return onLogout?.();
    setActiveItem(item);
  }

  return (
    <div className="admin-layout">
      <Sidebar role="Student" activeItem={activeItem} onNavigate={handleNavigate} />
      <main className="admin-main">
        <Navbar pageTitle={activeItem} role="Student" profileName="Aarav Sharma" />
        <div className="dashboard-content">
          {activeItem === "Dashboard" && <>
            <section className="welcome-banner">
              <div>
                <h1>Welcome back, {firstName}!</h1>
                <p>Here's what's happening with your studies today.</p>
              </div>
              <div className="welcome-icon"><GraduationCap size={65} /></div>
            </section>
            <div className="stats-grid">
              <Stat icon={BookOpen} value="6" label="Enrolled Courses" />
              <Stat icon={ClipboardCheck} value="4" label="Pending Assignments" />
              <Stat icon={Award} value="8.6" label="Current CGPA" />
              <Stat icon={CalendarDays} value="92%" label="Attendance" />
            </div>
            <section className="dashboard-panel role-panel">
              <PanelHeading title="My Courses" subtitle="Your enrolled courses this semester" action="View all" onAction={() => setActiveItem("My Courses")} />
              <CourseGrid />
            </section>
            <section className="dashboard-panel role-panel">
              <PanelHeading title="Upcoming Assignments" subtitle="Stay on top of your coursework" action="See all" onAction={() => setActiveItem("Assignments")} />
              <AssignmentTable items={assignments.slice(0, 2)} />
            </section>
            <div className="role-two-column">
              <GradesPanel onView={() => setActiveItem("Grades")} />
              <SchedulePanel />
            </div>
          </>}

          {activeItem === "My Courses" && <section className="dashboard-panel role-panel"><PanelHeading title="My Courses" subtitle="All courses you are enrolled in"/><CourseGrid /></section>}
          {activeItem === "Assignments" && <section className="dashboard-panel role-panel"><PanelHeading title="Assignments" subtitle="Search and track your coursework"/><div className="role-search-row"><span>{filteredAssignments.length} assignments</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assignments..." aria-label="Search assignments" /></div><AssignmentTable items={filteredAssignments} /></section>}
          {activeItem === "Grades" && <GradesPanel />}
          {activeItem === "Attendance" && <section className="dashboard-panel role-panel"><PanelHeading title="Attendance Overview" subtitle="Your attendance this semester"/><div className="role-attendance"><strong>92%</strong><span>Overall attendance</span><CheckCircle2 size={28}/></div><p className="role-note">You are meeting the minimum attendance requirement of 75%.</p></section>}
          {activeItem === "Schedule" && <SchedulePanel full />}
          {activeItem === "Announcements" && <section className="dashboard-panel role-panel"><PanelHeading title="Announcements" subtitle="Latest updates from your campus"/><Announcement title="Mid-semester examination timetable published" detail="Check the examination section for updated dates and room details."/><Announcement title="Project review submissions" detail="Submit your project synopsis before the department deadline."/></section>}
          {activeItem === "Settings" && <section className="dashboard-panel role-panel"><PanelHeading title="Settings" subtitle="Student account preferences"/><p className="role-note">Your profile and notification preferences will be available here.</p></section>}
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, value, label }) {
  return <article className="stat-card"><div className="stat-top"><div className="stat-icon"><Icon size={23}/></div><span className="stat-change">This term</span></div><h2>{value}</h2><p>{label}</p></article>;
}
function PanelHeading({ title, subtitle, action, onAction }) {
  return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button className="view-button" onClick={onAction}>{action}</button>}</div>;
}
function CourseGrid() {
  return <div className="role-course-grid">{courses.map((course, index) => <article className="role-course-card" key={course.code}><div className={`role-course-icon tone-${index}`}><BookOpen size={21}/></div><span className="role-course-code">{course.code}</span><h3>{course.name}</h3><p>{course.faculty}</p><div className="role-progress-label"><span>Course progress</span><strong>{course.progress}%</strong></div><div className="role-progress"><span style={{width: `${course.progress}%`}}/></div></article>)}</div>;
}
function AssignmentTable({ items }) {
  return <div className="activity-table-wrapper"><table className="activity-table role-table"><thead><tr><th>Assignment</th><th>Course</th><th>Due Date</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.title}><td>{item.title}</td><td>{item.course}</td><td><span className="role-due"><Clock3 size={14}/>{item.due}</span></td><td><span className={`activity-status ${item.status === "Submitted" ? "completed" : "pending"}`}>{item.status}</span></td></tr>)}</tbody></table></div>;
}
function GradesPanel({ onView }) {
  return <section className="dashboard-panel role-panel"><PanelHeading title="Recent Grades" subtitle="Your latest academic performance" action={onView ? "View report" : undefined} onAction={onView}/><div className="role-grade-list"><Grade name="Data Structures – Quiz 2" course="CS301" score="18/20"/><Grade name="DBMS – Lab Assessment" course="CS305" score="24/25"/><Grade name="Discrete Math – Test 1" course="MA202" score="42/50"/></div></section>;
}
function Grade({ name, course, score }) { return <div className="role-grade-row"><div><strong>{name}</strong><span>{course}</span></div><b>{score}</b></div>; }
function SchedulePanel({ full = false }) {
  return <section className={`dashboard-panel role-panel ${full ? "role-full-panel" : ""}`}><PanelHeading title="Today's Schedule" subtitle="Your classes for today"/><Schedule time="09:00 – 10:00" title="Data Structures" room="Block A · Room 204"/><Schedule time="11:00 – 12:00" title="Database Management" room="Block C · Lab 02"/><Schedule time="14:00 – 15:00" title="Discrete Mathematics" room="Block B · Room 105"/></section>;
}
function Schedule({ time, title, room }) { return <div className="role-schedule-row"><span>{time}</span><div><strong>{title}</strong><small>{room}</small></div></div>; }
function Announcement({ title, detail }) { return <div className="role-announcement"><Bell size={19}/><div><strong>{title}</strong><p>{detail}</p></div><ArrowUpRight size={16}/></div>; }

export default StudentDashboard;
