import React, { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { auth } from "../firebase"; // Import Firebase auth
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const LoginSignup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate(); // ✅ Initialize useNavigate

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError("Please enter your email address");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setSuccess("Password reset email sent! Please check your inbox.");
      setShowForgotPassword(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(doc(db, "users", user.uid), {
          fullName: user.displayName,
          email: user.email,
          phone: user.phoneNumber || "",
          photoURL: user.photoURL,
          createdAt: new Date(),
          provider: "google"
        });
      }
      
      alert("✅ Sign-in successful!");
      navigate("/Dashboard"); // ✅ Redirect to the dashboard after login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      alert("✅ Sign-in successful!");
      navigate("/Dashboard"); // ✅ Redirect to the dashboard after login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Sign Up Page
  const handleSignUpRedirect = () => {
    navigate("/signupregister"); // ✅ Redirects to SignupRegister page
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back</h2>
      <p>Sign in to access your bookings and preferences</p>

      {!showForgotPassword ? (
        <form onSubmit={handleSignIn} className="auth-form">
          <label>Email</label>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <label>Password</label>
          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error-message">⚠️ {error}</p>}
          {success && <p className="success-message">✅ {success}</p>}

          <button 
            type="button" 
            onClick={() => setShowForgotPassword(true)} 
            className="forgot-password-btn"
          >
            Forgot password?
          </button>

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle className="google-icon" />
            Continue with Google
          </button>

          <p className="redirect-text">
            Don't have an account?{" "}
            <button type="button" className="signup-btn" onClick={handleSignUpRedirect}>
              Sign Up
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="auth-form">
          <h3>Reset Password</h3>
          <p>Enter your email address to receive a password reset link</p>

          <label>Email</label>
          <div className="input-group">
            <FaEnvelope className="icon" />
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error-message">⚠️ {error}</p>}
          {success && <p className="success-message">✅ {success}</p>}

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <button 
            type="button" 
            onClick={() => setShowForgotPassword(false)} 
            className="back-to-login-btn"
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginSignup;
