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
