import { useState } from "react";
import { BookOpen, Users, ClipboardCheck, Award, ArrowUpRight, Plus, Clock3, GraduationCap } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./RoleDashboards.css";

const classes = [
  { code: "CS301", name: "Data Structures & Algorithms", students: 62, time: "09:00 AM", room: "Block A · Room 204" },
  { code: "CS305", name: "Database Management Systems", students: 48, time: "11:00 AM", room: "Block C · Lab 02" },
  { code: "CS401", name: "Operating Systems", students: 54, time: "02:00 PM", room: "Block A · Room 105" }
];
const initialSubmissions = [
  { student: "Aarav Sharma", assignment: "BST Implementation", course: "CS301", submitted: "Nov 6, 2026", status: "Pending Review" },
  { student: "Diya Reddy", assignment: "SQL Lab 4", course: "CS305", submitted: "Nov 6, 2026", status: "Pending Review" },
  { student: "Rohan Verma", assignment: "OS Case Study", course: "CS401", submitted: "Nov 5, 2026", status: "Reviewed" }
];
const matches = (text, query) => text.toLowerCase().includes(query.trim().toLowerCase());

function FacultyDashboard({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const firstName = (user?.profile?.name ?? "").split(" ")[0];
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [createdAssignments, setCreatedAssignments] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const filtered = initialSubmissions.filter((item) => `${item.student} ${item.assignment} ${item.course}`.toLowerCase().includes(search.toLowerCase()));
  const filteredCourses = classes.filter((c) => matches(`${c.code} ${c.name} ${c.room}`, courseSearch));
  const filteredSchedule = classes.filter((c) => matches(`${c.code} ${c.name} ${c.room} ${c.time}`, scheduleSearch));

  function handleNavigate(item) {
    if (item === "Logout") return onLogout?.();
    setActiveItem(item);
  }
  function createAssignment(event) {
    event.preventDefault();
    if (!assignmentTitle.trim()) return;
    setCreatedAssignments((items) => [...items, assignmentTitle.trim()]);
    setAssignmentTitle("");
    setShowCreate(false);
  }

  return (
    <div className="admin-layout">
      <Sidebar role="Faculty" activeItem={activeItem} onNavigate={handleNavigate}/>
      <main className="admin-main">
        <Navbar pageTitle={activeItem} role="Faculty" profileName="Dr. Priya Kumar"/>
        <div className="dashboard-content">
          {activeItem === "Dashboard" && <>
            <section className="welcome-banner"><div><h1>Welcome back, {firstName}!</h1><p>Here's your teaching overview and what needs your attention.</p></div><div className="welcome-icon"><GraduationCap size={65}/></div></section>
            <div className="stats-grid">
              <Stat icon={BookOpen} value="4" label="Assigned Courses"/>
              <Stat icon={Users} value="186" label="Total Students"/>
              <Stat icon={ClipboardCheck} value="12" label="Pending Reviews"/>
              <Stat icon={Award} value="3" label="Grade Reports"/>
            </div>
            <section className="dashboard-panel role-panel"><PanelHeading title="My Classes" subtitle="Your teaching schedule and course details" action="View all" onAction={() => setActiveItem("My Courses")}/><ClassGrid onStudents={() => setActiveItem("Students")}/></section>
            <section className="dashboard-panel role-panel"><PanelHeading title="Assignment Submissions" subtitle="Review and grade recent student work" action="View all" onAction={() => setActiveItem("Assignments")}/><SubmissionTable items={filtered.slice(0, 2)}/></section>
            <SchedulePanel/>
          </>}
          {activeItem === "My Courses" && <section className="dashboard-panel role-panel"><PanelHeading title="My Courses" subtitle="Courses assigned to you this semester"/><SearchRow count={filteredCourses.length} noun="courses" value={courseSearch} onChange={setCourseSearch} placeholder="Search courses..."/><ClassGrid items={filteredCourses} onStudents={() => setActiveItem("Students")}/></section>}
          {activeItem === "Students" && <section className="dashboard-panel role-panel"><PanelHeading title="Students" subtitle="Students enrolled in your courses"/><div className="role-search-row"><span>186 students across 4 courses</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search submissions or students..." aria-label="Search students"/></div><SubmissionTable items={filtered}/></section>}
          {activeItem === "Assignments" && <section className="dashboard-panel role-panel"><PanelHeading title="Assignment Submissions" subtitle="Review and grade recent student work" action="Create assignment" onAction={() => setShowCreate(true)}/><div className="role-search-row"><span>{filtered.length} submissions</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or assignment..." aria-label="Search submissions"/></div><SubmissionTable items={filtered}/>{createdAssignments.length > 0 && <p className="role-created"><strong>Recently created:</strong> {createdAssignments.join(" · ")}</p>}</section>}
          {activeItem === "Grades" && <section className="dashboard-panel role-panel"><PanelHeading title="Grade Management" subtitle="Review performance and publish results"/><div className="role-grade-list"><Grade name="Data Structures – Quiz 2" course="CS301 · 62 students" score="Pending"/><Grade name="DBMS – Lab Assessment" course="CS305 · 48 students" score="Ready"/><Grade name="Operating Systems – Test 1" course="CS401 · 54 students" score="Draft"/></div></section>}
          {activeItem === "Schedule" && <SchedulePanel full items={filteredSchedule} searchValue={scheduleSearch} onSearchChange={setScheduleSearch}/>}
          {activeItem === "Reports" && <section className="dashboard-panel role-panel"><PanelHeading title="Class Performance" subtitle="A quick overview of your classes"/><div className="role-report-grid"><div><strong>86%</strong><span>Average attendance</span></div><div><strong>78%</strong><span>Average score</span></div><div><strong>94%</strong><span>Submission rate</span></div></div></section>}
          {activeItem === "Settings" && <section className="dashboard-panel role-panel"><PanelHeading title="Settings" subtitle="Faculty account preferences"/><p className="role-note">Your profile and notification preferences will be available here.</p></section>}
        </div>
      </main>
      {showCreate && <div className="role-modal-backdrop" onClick={() => setShowCreate(false)}><form className="role-create-modal" onSubmit={createAssignment} onClick={(event) => event.stopPropagation()}><h3>Create Assignment</h3><p>Add an assignment title to your course workspace.</p><label>Assignment title<input autoFocus value={assignmentTitle} onChange={(event) => setAssignmentTitle(event.target.value)} placeholder="e.g. Unit 3 – Programming Task" required/></label><div className="role-modal-actions"><button type="button" className="view-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="role-primary-button"><Plus size={16}/>Create</button></div></form></div>}
    </div>
  );
}

function Stat({ icon: Icon, value, label }) { return <article className="stat-card"><div className="stat-top"><div className="stat-icon"><Icon size={23}/></div><span className="stat-change">This term</span></div><h2>{value}</h2><p>{label}</p></article>; }
function PanelHeading({ title, subtitle, action, onAction }) { return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button className="view-button" onClick={onAction}>{action}</button>}</div>; }
function SearchRow({ count, noun, value, onChange, placeholder }) { return <div className="role-search-row"><span>{count} {noun}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></div>; }
function ClassGrid({ onStudents, items = classes }) { if (items.length === 0) return <p className="role-note">No courses found.</p>; return <div className="role-class-grid">{items.map((item) => <article className="role-class-card" key={item.code}><div className="role-class-top"><span className="role-course-code">{item.code}</span><span className="role-class-count"><Users size={14}/>{item.students} students</span></div><h3>{item.name}</h3><p><Clock3 size={14}/>{item.time}</p><p>{item.room}</p><button className="role-text-button" onClick={onStudents}>View students <ArrowUpRight size={15}/></button></article>)}</div>; }
function SubmissionTable({ items }) { return <div className="activity-table-wrapper"><table className="activity-table role-table"><thead><tr><th>Student</th><th>Assignment</th><th>Course</th><th>Submitted</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.student}-${item.assignment}`}><td>{item.student}</td><td>{item.assignment}</td><td>{item.course}</td><td>{item.submitted}</td><td><span className={`activity-status ${item.status === "Reviewed" ? "completed" : "pending"}`}>{item.status}</span></td></tr>)}</tbody></table></div>; }
function SchedulePanel({ full = false, items = classes, searchValue, onSearchChange }) { return <section className={`dashboard-panel role-panel ${full ? "role-full-panel" : ""}`}><PanelHeading title="Today's Teaching Schedule" subtitle="Your classes for today"/>{onSearchChange && <SearchRow count={items.length} noun="classes" value={searchValue} onChange={onSearchChange} placeholder="Search classes or rooms..."/>}{items.length === 0 && <p className="role-note">No classes found.</p>}{items.map((item) => <div className="role-schedule-row" key={item.code}><span>{item.time}</span><div><strong>{item.name}</strong><small>{item.room} · {item.students} students</small></div></div>)}</section>; }
function Grade({ name, course, score }) { return <div className="role-grade-row"><div><strong>{name}</strong><span>{course}</span></div><b>{score}</b></div>; }

export default FacultyDashboard;
