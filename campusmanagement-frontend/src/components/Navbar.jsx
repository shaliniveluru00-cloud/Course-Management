
import { Bell } from "lucide-react";
import "./Navbar.css";

function Navbar({ pageTitle }) {

  // Get login details from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "null");


  const profileName = user?.profile?.name ?? "Guest";

  // Convert role to proper case
  const role = user?.role
    ? user.role.charAt(0) + user.role.slice(1).toLowerCase()
    : "";

  // Get student's or faculty's branch
  const branch = user?.profile?.department ?? "";

  return (
    <header className="top-navbar">

      <div className="navbar-title">
        <h2>{pageTitle}</h2>
        <p>Campus Course Management System</p>
      </div>

      <div className="navbar-actions">

        <button
          className="notification-button"
          aria-label="Notifications"
          onClick={() => alert("No new notifications")}
        >
          <Bell size={21} />
          <span className="notification-dot"></span>
        </button>

        <div className="admin-profile">

          <div className="profile-avatar">
            {profileName.charAt(0).toUpperCase()}
          </div>

          <div className="profile-details">
            <h4>{profileName}</h4>
            <p>{role}</p>

            {/* Display branch for students and faculty */}
            {(role === "Student" || role === "Faculty") && branch && (
              <span className="profile-branch">
                {branch}
              </span>
            )}
            

          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
