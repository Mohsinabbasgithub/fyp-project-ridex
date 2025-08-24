import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaCar, FaSignOutAlt, FaBars, FaTimes, FaTachometerAlt, FaTaxi, FaMapMarkerAlt } from 'react-icons/fa';
import '../styles/Navbar.css';
import NotificationSystem from './NotificationSystem';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Navbar = () => {
  const { currentUser, userProfile, logout, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [driverRegistered, setDriverRegistered] = useState(false);

  useEffect(() => {
    const checkDriverRegistration = async () => {
      if (userRole === 'driver' && currentUser) {
        try {
          const driverRef = doc(db, 'drivers', currentUser.uid);
          const driverDoc = await getDoc(driverRef);
          setDriverRegistered(driverDoc.exists());
        } catch {
          setDriverRegistered(false);
        }
      } else {
        setDriverRegistered(false);
      }
    };
    checkDriverRegistration();
  }, [userRole, currentUser]);

  // Check if we're in admin section
  const isAdminRoute = location.pathname.includes('/admin');
  // Check if we're in driver section
  const isDriverRoute = location.pathname.includes('/driver') || location.pathname.includes('/DriverVehicle');

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
  if (userRole === 'driver') {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            <FaCar className="logo-icon" />
            <span>RideX</span>
          </Link>
          {/* Mobile menu icon for driver navbar */}
          <div className="menu-icon" onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </div>
          {driverRegistered ? (
            <>
              <div className={menuOpen ? "navbar-links active" : "navbar-links"}>
                <Link to="/ride-history" className="nav-link" onClick={() => setMenuOpen(false)}>
                  Ride History
                </Link>
                <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>
                  About Us
                </Link>
                <Link to="/contact" className="nav-link" onClick={() => setMenuOpen(false)}>
                  Contact Us
                </Link>
              </div>
              <div className={menuOpen ? "navbar-right active" : "navbar-right"}>
                <div className="user-menu">
                  {/* Driver Profile removed from driver panel as requested */}
                  <Link to="/DriverVehicle" className="driver-link" onClick={() => setMenuOpen(false)}>
                    <FaCar className="driver-icon" />
                    <span>Add Vehicles</span>
                  </Link>
                  <Link to="/driver-dashboard" className="driver-link" onClick={() => setMenuOpen(false)}>
                    <FaTachometerAlt className="driver-icon" />
                    <span>Driver Dashboard</span>
                  </Link>
                  <NotificationSystem />
                  <button onClick={() => {handleLogout(); setMenuOpen(false);}} className="logout-btn">
                    <FaSignOutAlt className="logout-icon" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="navbar-links">
              <Link to="/DriverRegistration" className="nav-link" onClick={() => setMenuOpen(false)}>
                Complete Driver Registration
              </Link>
              <button onClick={() => {handleLogout(); setMenuOpen(false);}} className="logout-btn">
                <FaSignOutAlt className="logout-icon" />
                <span>Logout</span>
              </button>
            </div>
          )}
          <div 
            className={menuOpen ? "menu-overlay active" : "menu-overlay"}
            onClick={() => setMenuOpen(false)}
          />
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
          <Link to="/feedback" className="nav-link" onClick={() => setMenuOpen(false)}>
            Reviews
          </Link>
          {/* Hidden as requested: Find Vehicles */}
          {false && (
            <Link to="/all-vehicles" className="nav-link" onClick={() => setMenuOpen(false)}>
              Find Vehicles
            </Link>
          )}
          <Link to="/ride-booking" className="nav-link" onClick={() => setMenuOpen(false)}>
            <FaTaxi /> Book a Ride
          </Link>
          {/* Only show Become a Driver if not logged in */}
          {!currentUser && (
            <>
              {/* Hidden as requested: login/sign up as user/driver dropdowns */}
              {false && (
                <div className="nav-auth-dropdown">
                  <span className="nav-link">Sign Up ▾</span>
                  <div className="dropdown-content">
                    <Link to="/signup-user" className="nav-link" onClick={() => setMenuOpen(false)}>As User</Link>
                    <Link to="/signup-driver" className="nav-link" onClick={() => setMenuOpen(false)}>As Driver</Link>
                  </div>
                </div>
              )}
              {false && (
                <div className="nav-auth-dropdown">
                  <span className="nav-link">Login ▾</span>
                  <div className="dropdown-content">
                    <Link to="/login-user" className="nav-link" onClick={() => setMenuOpen(false)}>As User</Link>
                    <Link to="/login-driver" className="nav-link" onClick={() => setMenuOpen(false)}>As Driver</Link>
                  </div>
                </div>
              )}
            </>
          )}
          <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>
            About Us
          </Link>
          <Link to="/contact" className="nav-link" onClick={() => setMenuOpen(false)}>
            Contact Us
          </Link>
          {currentUser && (
            <Link to="/ride-history" className="nav-link" onClick={() => setMenuOpen(false)}>
              Ride History
            </Link>
          )}
        </div>
        <div className={menuOpen ? "navbar-right active" : "navbar-right"}>
          {loading ? (
            <div className="auth-links">Loading...</div>
          ) : currentUser ? (
            <div className="user-menu">
              <Link to="/Dashboard" className="user-link" onClick={() => setMenuOpen(false)}>
                <FaUser className="user-icon" />
                <span>{userProfile?.fullName || 'My Profile'}</span>
              </Link>
              <NotificationSystem />
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
