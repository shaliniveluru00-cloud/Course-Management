import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Login from "./pages/Login";

function LoginRoute() {
  const navigate = useNavigate();

 function handleLogin(data) {
  localStorage.setItem("token", data.access);
  localStorage.setItem("user", JSON.stringify(data.user));

  const role = data.user.role;   // "STUDENT", "FACULTY" or "ADMIN"
  const route = role === "STUDENT" ? "/student" : role === "FACULTY" ? "/faculty" : "/admin";
  navigate(route);
}
  return <Login onLogin={handleLogin} />;
}

// STEP 8: only lets the right role into a page
function Protected({ role, children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Not logged in, or logged in with a different role -> back to the login page
  if (!user || user.role !== role) return <Navigate to="/login" replace />;

  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  navigate("/login");
};

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/student" element={<Protected role="STUDENT"><StudentDashboard onLogout={handleLogout} /></Protected>} />
      <Route path="/faculty" element={<Protected role="FACULTY"><FacultyDashboard onLogout={handleLogout} /></Protected>} />
      <Route path="/admin" element={<Protected role="ADMIN"><AdminDashboard onLogout={handleLogout} /></Protected>} />
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
