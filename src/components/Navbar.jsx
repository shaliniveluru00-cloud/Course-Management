
import { Search, Bell, ChevronDown } from "lucide-react";

import "./Navbar.css";

function Navbar({ pageTitle }) {
  return (
    <header className="top-navbar">

      <div className="navbar-title">
        <h2>{pageTitle}</h2>
        <p>Campus Course Management System</p>
      </div>

      <div className="navbar-actions">

        <div className="navbar-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search..."
          />
        </div>

        <button
          className="notification-button"
          aria-label="Notifications"
          onClick={() => alert("No new notifications")}
        >
          <Bell size={21} />
          <span className="notification-dot"></span>
        </button>

        <div className="admin-profile">
          <div className="profile-avatar">A</div>

          <div className="profile-details">
            <h4>Administrator</h4>
            <p>Admin</p>
          </div>

          <ChevronDown size={17} />
        </div>

      </div>

    </header>
  );
}

export default Navbar;
