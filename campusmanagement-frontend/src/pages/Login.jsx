
import { useState } from "react";

import {
  Lock,
  Eye,
  EyeOff,
  UserRound,
  BriefcaseBusiness,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Landmark
} from "lucide-react";

import "./Login.css";

function Login({ onLogin }) {

  const [error, setError] = useState("");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState("Student");

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  // CONNECT TO DJANGO BACKEND
 async function handleLogin(e) {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Login failed");
      return;
    }

    onLogin(data);
  } catch {
    setError("Cannot reach the server. Is the backend running?");
  } finally {
    setLoading(false);
  }
}

  // FORGOT PASSWORD POPUP
  function handleForgotPassword() {
    setShowForgotPopup(true);
  }

  return (
    <div className="login-page">

      {/* LEFT BRANDING SECTION */}

      <section className="brand-section">

        <div className="brand-content">

          <div className="brand-logo">

            <Landmark size={58} strokeWidth={1.7} />

            <div>
              <h1>Campus Course</h1>
              <h1>Management System</h1>
            </div>

          </div>

          <div className="brand-divider"></div>

          <p className="brand-tagline">
            Learn <span>•</span> Manage <span>•</span> Excel
          </p>

          <div className="welcome-section">

            <h2>Welcome Back!</h2>

            <p>
              Access your academic portal
              <br />
              and stay connected with your campus.
            </p>

          </div>

          <div className="brand-footer">
            CAMPUS COURSE MANAGEMENT SYSTEM
          </div>

        </div>

      </section>


      {/* RIGHT LOGIN SECTION */}

      <section className="form-section">

        <div className="login-card">

          {/* LOGIN HEADING */}

          <div className="login-heading">

            <div className="graduation-icon">
              <GraduationCap size={70} strokeWidth={1.7} />
            </div>

            <h2>Login to Your Account</h2>

            <p>Choose your role and continue</p>

          </div>


          <form onSubmit={handleLogin}>

          {error && <div className="login-error">{error}</div>}
            {/* USERNAME */}

            <div className="input-group">

              <UserRound size={22} />

              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />

            </div>


            {/* PASSWORD */}

            <div className="input-group">

              <Lock size={22} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >

                {showPassword ? (
                  <EyeOff size={21} />
                ) : (
                  <Eye size={21} />
                )}

              </button>

            </div>


            {/* ROLE SELECTION */}

            <div className="role-section">

              <h3>Select Role</h3>

              <div className="role-options">

                <button
                  type="button"
                  className={`role-button ${
                    role === "Student" ? "active" : ""
                  }`}
                  onClick={() => setRole("Student")}
                >
                  <UserRound size={20} />
                  Student
                </button>


                <button
                  type="button"
                  className={`role-button ${
                    role === "Faculty" ? "active" : ""
                  }`}
                  onClick={() => setRole("Faculty")}
                >
                  <BriefcaseBusiness size={20} />
                  Faculty
                </button>


                <button
                  type="button"
                  className={`role-button ${
                    role === "Admin" ? "active" : ""
                  }`}
                  onClick={() => setRole("Admin")}
                >
                  <ShieldCheck size={20} />
                  Admin
                </button>

              </div>

            </div>


            {/* REMEMBER ME AND FORGOT PASSWORD */}

            <div className="login-options">

              <label className="remember-option">

                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />

                Remember Me

              </label>


              <button
                type="button"
                className="forgot-button"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </button>

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              <span>
                {loading ? "Logging in..." : "Login"}
              </span>

              <ArrowRight size={22} />

            </button>

          </form>

        </div>

      </section>


      {/* FORGOT PASSWORD POPUP */}

      {showForgotPopup && (

        <div
          className="popup-overlay"
          onClick={() => setShowForgotPopup(false)}
        >

          <div
            className="popup-box"
            onClick={(e) => e.stopPropagation()}
          >

            <h2>Forgot Password?</h2>

            <p>
              Contact Administrator for Access
            </p>

            <button
              type="button"
              onClick={() => setShowForgotPopup(false)}
            >
              OK
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default Login;
