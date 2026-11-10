
import { useState } from "react";

import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import "./AdminDashboard.css";

function AdminDashboard() {
  const [activeItem, setActiveItem] = useState("Dashboard");

  const stats = [
    {
      title: "Total Students",
      value: "1,250",
      change: "+12%",
      icon: Users
    },
    {
      title: "Total Faculty",
      value: "85",
      change: "+5%",
      icon: GraduationCap
    },
    {
      title: "Total Courses",
      value: "48",
      change: "+8%",
      icon: BookOpen
    },
    {
      title: "Enrollments",
      value: "2,430",
      change: "+15%",
      icon: ClipboardList
    }
  ];

  const activities = [
    {
      name: "Rahul Sharma",
      action: "New student registered",
      date: "Today, 10:30 AM",
      status: "Completed"
    },
    {
      name: "Dr. Priya Kumar",
      action: "New faculty added",
      date: "Today, 09:15 AM",
      status: "Completed"
    },
    {
      name: "Computer Science",
      action: "New course created",
      date: "Yesterday, 03:45 PM",
      status: "Completed"
    },
    {
      name: "Ananya Reddy",
      action: "Course enrollment",
      date: "Yesterday, 01:20 PM",
      status: "Pending"
    }
  ];

  const chartData = [
    { month: "Jan", value: 45 },
    { month: "Feb", value: 65 },
    { month: "Mar", value: 50 },
    { month: "Apr", value: 80 },
    { month: "May", value: 60 },
    { month: "Jun", value: 95 },
    { month: "Jul", value: 70 },
    { month: "Aug", value: 85 }
  ];

  function handleNavigate(item) {
    if (item === "Logout") {
      alert("Logout will be connected later.");
      return;
    }

    setActiveItem(item);
  }

  return (
    <div className="admin-layout">

      <Sidebar
        activeItem={activeItem}
        onNavigate={handleNavigate}
      />

      <main className="admin-main">

        <Navbar pageTitle={activeItem} />

        <div className="dashboard-content">

          <div className="welcome-banner">
            <div>
              <h1>Welcome back, Administrator!</h1>
              <p>
                Here's what's happening with your campus today.
              </p>
            </div>

            <div className="welcome-icon">
              <GraduationCap size={65} />
            </div>
          </div>


          {/* STATISTICS CARDS */}

          <div className="stats-grid">

            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div className="stat-card" key={stat.title}>

                  <div className="stat-top">
                    <div className="stat-icon">
                      <Icon size={23} />
                    </div>

                    <span className="stat-change">
                      <TrendingUp size={14} />
                      {stat.change}
                    </span>
                  </div>

                  <h2>{stat.value}</h2>
                  <p>{stat.title}</p>

                </div>
              );
            })}

          </div>


          {/* CHART AND QUICK SUMMARY */}

          <div className="dashboard-middle">

            <section className="dashboard-panel chart-panel">

              <div className="panel-heading">
                <div>
                  <h3>Enrollment Overview</h3>
                  <p>Monthly enrollment statistics</p>
                </div>

                <button className="view-button">
                  This Year
                </button>
              </div>

              <div className="chart">

                <div className="chart-y-axis">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>

                <div className="chart-bars">
                  {chartData.map((item) => (
                    <div className="bar-column" key={item.month}>

                      <div className="bar-area">
                        <div
                          className="chart-bar"
                          style={{ height: `${item.value}%` }}
                          title={`${item.value}%`}
                        />
                      </div>

                      <span>{item.month}</span>

                    </div>
                  ))}
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
                <strong>1,180</strong>
              </div>

              <div className="summary-item">
                <span>Active Faculty</span>
                <strong>78</strong>
              </div>

              <div className="summary-item">
                <span>Available Courses</span>
                <strong>42</strong>
              </div>

              <div className="summary-item">
                <span>Pending Assignments</span>
                <strong>24</strong>
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


          {/* RECENT ACTIVITY */}

          <section className="dashboard-panel activity-panel">

            <div className="panel-heading">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest updates from your campus</p>
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
                  {activities.map((activity, index) => (
                    <tr key={index}>
                      <td>{activity.name}</td>
                      <td>{activity.action}</td>
                      <td>{activity.date}</td>
                      <td>
                        <span
                          className={`activity-status ${
                            activity.status === "Completed"
                              ? "completed"
                              : "pending"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;
