import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Login from "./pages/Login";

function LoginRoute() {
  const navigate = useNavigate();

  function handleLogin(role) {
    const route = role === "Student" ? "/student" : role === "Faculty" ? "/faculty" : "/admin";
    navigate(route);
  }

  return <Login onLogin={handleLogin} />;
}

function AppRoutes() {
  const navigate = useNavigate();
  const handleLogout = () => navigate("/login");

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/student" element={<StudentDashboard onLogout={handleLogout} />} />
      <Route path="/faculty" element={<FacultyDashboard onLogout={handleLogout} />} />
      <Route path="/admin" element={<AdminDashboard onLogout={handleLogout} />} />
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
