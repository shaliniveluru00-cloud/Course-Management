
import { Bell, ChevronDown } from "lucide-react";

import "./Navbar.css";

function Navbar({ pageTitle }) {

  // ---- NEW: read the login details saved by the login page ----
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const profileName = user?.profile?.name ?? "Guest";
  // Backend sends "STUDENT" / "FACULTY" / "ADMIN" -> show "Student" / "Faculty" / "Admin"
  const role = user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "";
  // -------------------------------------------------------------
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
          {/* CHANGED: was  A  */}
          <div className="profile-avatar">{profileName.charAt(0).toUpperCase()}</div>

          <div className="profile-details">
            {/* CHANGED: was  Administrator  */}
            <h4>{profileName}</h4>
            {/* CHANGED: was  Admin  */}
            <p>{role}</p>
          </div>

          <ChevronDown size={17} />
        </div>
      </div>
    </header>
  );
}
   
export default Navbar;
