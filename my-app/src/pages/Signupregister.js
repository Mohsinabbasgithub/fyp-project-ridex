import React, { useState } from "react";
import { FaEnvelope, FaLock, FaUser, FaPhone, FaCheckCircle } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase"; // ✅ Firebase auth & Firestore
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore"; // ✅ Firestore to store user data
import { useNavigate } from "react-router-dom"; // ✅ For navigation
import "../styles/SignupForm.css";
import emailjs from '@emailjs/browser';

const SignupRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    special: false,
    capital: false,
    number: false
  });
  const navigate = useNavigate();

  // Password validation function
  const validatePassword = (password) => {
    const hasMinLength = password.length >= 8;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasCapitalLetter = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    setPasswordStrength({
      length: hasMinLength,
      special: hasSpecialChar,
      capital: hasCapitalLetter,
      number: hasNumber
    });

    return hasMinLength && hasSpecialChar && hasCapitalLetter && hasNumber;
  };

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleGoogleSignUp = async () => {
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
          provider: "google",
          emailVerified: user.emailVerified
        });
        
        if (!user.emailVerified) {
          await sendEmailVerification(user);
          setVerificationSent(true);
          setShowVerificationForm(true);
          return;
        }
        
        alert("🎉 Account created successfully!");
      } else {
        alert("Account already exists! Signing you in...");
      }
      
      navigate("/Dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign-Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Password validation
    if (!validatePassword(formData.password)) {
      setError("Password must meet all requirements!");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);

      // Store additional user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        uid: user.uid,
        createdAt: new Date(),
        provider: "email",
        emailVerified: false
      });

      setVerificationSent(true);
      setShowVerificationForm(true);
      setError("");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Reload the user to get the latest verification status
      await auth.currentUser.reload();
      
      if (auth.currentUser.emailVerified) {
        alert("🎉 Email verified successfully! Redirecting to Dashboard...");
        navigate("/Dashboard");
      } else {
        setError("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError("");
    
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      setError("Verification email resent! Please check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Login Page
  const handleSignInRedirect = () => {
    navigate("/SignupForm");
  };

  return (
    <div className="auth-container">
      <h2>🚗 Create Your RIDEX Account</h2>
      <p>Join the community and start renting cars with ease!</p>

      {!showVerificationForm ? (
        <form onSubmit={handleSignUp} className="auth-form">
          <label>Full Name</label>
          <div className="input-group">
            <FaUser className="icon" />
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

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

          <label>Phone Number</label>
          <div className="input-group">
            <FaPhone className="icon" />
            <input
              type="text"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
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
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <label>Confirm Password</label>
          <div className="input-group">
            <FaLock className="icon" />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        

          <div className="password-requirements">
            <p className="requirement-title">Password Requirements:</p>
            <ul className="requirements-list">
              <li className={passwordStrength.length ? "valid" : ""}>
                {passwordStrength.length ? "✓" : "✗"} At least 8 characters
              </li>
              <li className={passwordStrength.special ? "valid" : ""}>
                {passwordStrength.special ? "✓" : "✗"} At least one special character
              </li>
              <li className={passwordStrength.capital ? "valid" : ""}>
                {passwordStrength.capital ? "✓" : "✗"} At least one capital letter
              </li>
              <li className={passwordStrength.number ? "valid" : ""}>
                {passwordStrength.number ? "✓" : "✗"} At least one number
              </li>
            </ul>
          </div>

         
          
          {/* Error Message Display */}
          {error && <p className="error-message">⚠️ {error}</p>}

          {/* Sign Up Button with Loading State */}
          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="google-signup-btn"
            onClick={handleGoogleSignUp}
            disabled={loading}
          >
            <FcGoogle className="google-icon" />
            Continue with Google
          </button>

          {/* Redirect to Sign In */}
          <p className="redirect-text">
            Already have an account?{" "}
            <button type="button" onClick={handleSignInRedirect} className="redirect-btn">
              Sign in
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerification} className="auth-form">
          <div className="verification-header">
            <FaCheckCircle className="verification-icon" />
            <h3>Verify Your Email</h3>
          </div>
          <p>We've sent a verification link to your email address: {formData.email}</p>
          <p>Please check your inbox and click the verification link to continue.</p>

          {error && <p className="error-message">⚠️ {error}</p>}
          {verificationSent && <p className="success-message">✅ Verification email sent!</p>}

          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? "Verifying..." : "I've Verified My Email"}
          </button>

          <button 
            type="button" 
            onClick={handleResendVerification} 
            className="resend-btn"
            disabled={loading}
          >
            Resend Verification Email
          </button>
        </form>
      )}
    </div>
  );
};

export default SignupRegister;
