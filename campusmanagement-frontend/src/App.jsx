
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate
} from "react-router-dom";

import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Login from "./pages/Login";

function LoginRoute() {
  const navigate = useNavigate();

  function handleLogin(data) {
    console.log("Login response:", {
      hasAccess: Boolean(data?.access),
      hasRefresh: Boolean(data?.refresh),
      role: data?.user?.role
    });

    if (!data?.access || !data?.user) {
      console.error("Login response is missing access token or user.");
      return;
    }

    localStorage.setItem("token", data.access);
    localStorage.setItem("refresh", data.refresh);
    localStorage.setItem("user", JSON.stringify(data.user));
    navigate("/login"); // Navigate to login first to reset state

    const role = data.user.role;

    if (role === "STUDENT") {
      navigate("/student");
    } else if (role === "FACULTY") {
      navigate("/faculty");
    } else if (role === "ADMIN") {
      navigate("/admin");
    } else {
      console.error("Unknown user role:", role);
    }
  }

  return <Login onLogin={handleLogin} />;
}

function Protected({ role, children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!user || user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("refresh");
    navigate("/login");
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />

      <Route
        path="/student"
        element={
          <Protected role="STUDENT">
            <StudentDashboard onLogout={handleLogout} />
          </Protected>
        }
      />

      <Route
        path="/faculty"
        element={
          <Protected role="FACULTY">
            <FacultyDashboard onLogout={handleLogout} />
          </Protected>
        }
      />

      <Route
        path="/admin"
        element={
          <Protected role="ADMIN">
            <AdminDashboard onLogout={handleLogout} />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
