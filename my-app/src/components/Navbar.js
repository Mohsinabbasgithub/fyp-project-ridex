import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaCar, FaSignOutAlt, FaBars, FaTimes, FaTachometerAlt } from 'react-icons/fa';
import '../styles/Navbar.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Navbar = () => {
  const { currentUser, userProfile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  // Check if we're in admin section
  const isAdminRoute = location.pathname.includes('/admin');
  // Check if we're in driver section
  const isDriverRoute = location.pathname.includes('/driver') || location.pathname.includes('/DriverVehicle');

  useEffect(() => {
    const checkDriverStatus = async () => {
      if (currentUser && !isAdminRoute) {
        try {
          const driverRef = doc(db, 'drivers', currentUser.uid);
          const driverDoc = await getDoc(driverRef);
          setIsDriver(driverDoc.exists());
        } catch (error) {
          console.error('Error checking driver status:', error);
          setIsDriver(false);
        }
      } else {
        setIsDriver(false);
      }
    };

    checkDriverStatus();
  }, [currentUser, isAdminRoute]);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => {
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      if (isAdminRoute) {
        navigate('/admin-login');
      } else {
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleClickOutside = (e) => {
    if (menuOpen && !e.target.closest('.navbar-links') && !e.target.closest('.menu-icon')) {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [menuOpen]);

  // Render admin navigation
  if (isAdminRoute) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/admin-dashboard" className="navbar-logo">
            <FaCar className="logo-icon" />
            <span>RideX Admin</span>
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    );
  }

  // Render driver navigation
  if (isDriverRoute && isDriver) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            <FaCar className="logo-icon" />
            <span>RideX</span>
          </Link>
          <div className="navbar-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/all-vehicles" className="nav-link">Find Vehicles</Link>
            <Link to="/about" className="nav-link">About Us</Link>
            <Link to="/contact" className="nav-link">Contact Us</Link>
          </div>
          <div className="navbar-right">
            <div className="user-menu">
              <Link to={`/driver/${currentUser.uid}`} className="driver-link">
                <FaTachometerAlt className="driver-icon" />
                <span>Driver Profile</span>
              </Link>
              <Link to="/DriverVehicle" className="driver-link">
                <FaCar className="driver-icon" />
                <span>Add Vehicles</span>
              </Link>
              <button onClick={handleLogout} className="logout-btn">
                <FaSignOutAlt className="logout-icon" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Render regular user navigation
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FaCar className="logo-icon" />
          <span>RideX</span>
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <div className={menuOpen ? "navbar-links active" : "navbar-links"}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/all-vehicles" className="nav-link" onClick={() => setMenuOpen(false)}>
            Find Vehicles
          </Link>
          {!isDriver && !isAdminRoute && (
            <Link to="/DriverRegistration" className="nav-link" onClick={() => setMenuOpen(false)}>
              Become a Driver
            </Link>
          )}
          <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>
            About Us
          </Link>
          <Link to="/contact" className="nav-link" onClick={() => setMenuOpen(false)}>
            Contact Us
          </Link>
        </div>

        <div className={menuOpen ? "navbar-right active" : "navbar-right"}>
          {loading ? (
            <div className="auth-links">Loading...</div>
          ) : currentUser ? (
            <div className="user-menu">
              {isDriver ? (
                <>
                  <Link to={`/driver/${currentUser.uid}`} className="driver-link" onClick={() => setMenuOpen(false)}>
                    <FaTachometerAlt className="driver-icon" />
                    <span>Driver Profile</span>
                  </Link>
                  <Link to="/DriverVehicle" className="driver-link" onClick={() => setMenuOpen(false)}>
                    <FaCar className="driver-icon" />
                    <span>Add Vehicles</span>
                  </Link>
                </>
              ) : (
                <Link to="/Dashboard" className="user-link" onClick={() => setMenuOpen(false)}>
                  <FaUser className="user-icon" />
                  <span>{userProfile?.fullName || 'My Profile'}</span>
                </Link>
              )}
              <button onClick={() => {handleLogout(); setMenuOpen(false);}} className="logout-btn">
                <FaSignOutAlt className="logout-icon" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/SignupForm" className="login-btn" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/Signupregister" className="signup-btn" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>

        <div 
          className={menuOpen ? "menu-overlay active" : "menu-overlay"}
          onClick={() => setMenuOpen(false)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
