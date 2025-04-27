import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase"; // ✅ Firebase authentication & Firestore
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css"; // ✅ Import CSS
import { FaUser, FaEnvelope, FaPhone, FaSignOutAlt } from "react-icons/fa";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          console.log("No user data found!");
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/SignupForm"); // ✅ Redirect to Login page after logout
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">Loading user data...</div>
        ) : userData ? (
          <div className="user-profile">
            <div className="profile-header">
              <h1>My Profile</h1>
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
            
            <div className="profile-info">
              <div className="info-item">
                <FaUser className="icon" />
                <div className="info-content">
                  <span className="label">Name</span>
                  <span className="value">{userData.fullName}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FaEnvelope className="icon" />
                <div className="info-content">
                  <span className="label">Email</span>
                  <span className="value">{userData.email}</span>
                </div>
              </div>
              
              <div className="info-item">
                <FaPhone className="icon" />
                <div className="info-content">
                  <span className="label">Phone</span>
                  <span className="value">{userData.phone}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">No user data found.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
