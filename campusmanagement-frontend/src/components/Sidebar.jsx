import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileText,
  Award,
  BarChart3,
  CalendarDays,
  Bell,
  LifeBuoy,
  LogOut,
  Landmark
} from "lucide-react";
import "./Sidebar.css";

function Sidebar({ activeItem, onNavigate, role   }) {
  const adminItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Students", icon: Users },
    { name: "Faculty", icon: GraduationCap },
    { name: "Courses", icon: BookOpen },
    { name: "Enrollments", icon: ClipboardList },
    { name: "Assignments", icon: FileText },
    { name: "Grades", icon: Award },
    { name: "Reports", icon: BarChart3 }
  ];
  const studentItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "My Courses", icon: BookOpen },
    { name: "Assignments", icon: FileText },
    { name: "Grades", icon: Award },
    { name: "Schedule", icon: CalendarDays },
    { name: "Announcements", icon: Bell }
  ];
  const facultyItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "My Courses", icon: BookOpen },
    { name: "Students", icon: Users },
    { name: "Enrollment Requests", icon: ClipboardList },
    { name: "Assignments", icon: FileText },
    { name: "Grades", icon: Award },
    { name: "Schedule", icon: CalendarDays },
    { name: "Reports", icon: BarChart3 }
  ];
  const menuItems = role === "Student" ? studentItems : role === "Faculty" ? facultyItems : adminItems;
  const portalName = role === "Admin" ? "Administration" : `${role} Portal`;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Landmark size={35} />
        <div>
          <h2>Campus CMS</h2>
          <p>{portalName}</p>
        </div>
      </div>

      <div className="sidebar-menu">
        <p className="menu-heading">MAIN MENU</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              className={`sidebar-link ${activeItem === item.name ? "selected" : ""}`}
              onClick={() => onNavigate(item.name)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={() => onNavigate("Help & Contact")}>
          <LifeBuoy size={20} />
          <span>Help & Contact</span>
        </button>
        <button className="sidebar-link logout-link" onClick={() => onNavigate("Logout")}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
