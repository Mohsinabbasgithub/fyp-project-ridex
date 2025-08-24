import React, { useState } from "react";
import { FaEnvelope, FaLock, FaUser, FaPhone } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/SignupForm.css";

const UserSignup = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          fullName: user.displayName,
          email: user.email,
          phone: user.phoneNumber || "",
          photoURL: user.photoURL,
          createdAt: new Date(),
          provider: "google",
          role: "user"
        });
      }
      alert("🎉 Account created successfully!");
      navigate("/Dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await sendEmailVerification(user);
      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        uid: user.uid,
        createdAt: new Date(),
        provider: "email",
        emailVerified: false,
        role: "user"
      });
      alert("🎉 Account created successfully! Please verify your email.");
      navigate("/Dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up as User</h2>
      <form onSubmit={handleSignUp} className="auth-form">
        <label>Full Name</label>
        <div className="input-group">
          <FaUser className="icon" />
          <input type="text" name="fullName" placeholder="Enter your full name" value={formData.fullName} onChange={handleChange} required />
        </div>
        <label>Email</label>
        <div className="input-group">
          <FaEnvelope className="icon" />
          <input type="email" name="email" placeholder="Enter your email address" value={formData.email} onChange={handleChange} required />
        </div>
        <label>Phone Number</label>
        <div className="input-group">
          <FaPhone className="icon" />
          <input type="text" name="phone" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} required />
        </div>
        <label>Password</label>
        <div className="input-group">
          <FaLock className="icon" />
          <input type="password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} required />
        </div>
        <label>Confirm Password</label>
        <div className="input-group">
          <FaLock className="icon" />
          <input type="password" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} required />
        </div>
        {error && <p className="error-message">⚠️ {error}</p>}
        <button type="submit" className="signup-btn" disabled={loading}>{loading ? "Creating Account..." : "Create Account"}</button>
        <div className="divider"><span>OR</span></div>
        <button type="button" className="google-signup-btn" onClick={handleGoogleSignUp} disabled={loading}>
          <FcGoogle className="google-icon" /> Continue with Google
        </button>
      </form>
    </div>
  );
};

export default UserSignup;
