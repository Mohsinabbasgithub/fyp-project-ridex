import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaBars, FaTimes, FaUser, FaCar, FaInfoCircle, FaEnvelope, FaSignOutAlt } from 'react-icons/fa';
import './DriverNavbar.css';

const DriverNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <nav className="driver-navbar">
      <div className="navbar-container">
        <Link to="/driver-dashboard" className="navbar-logo">
          RideX Driver
        </Link>

        <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={isOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/driver-dashboard" className="nav-links" onClick={() => setIsOpen(false)}>
              <FaUser className="nav-icon" />
              Profile
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/driver-vehicle" className="nav-links" onClick={() => setIsOpen(false)}>
              <FaCar className="nav-icon" />
              Add Vehicle
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/about" className="nav-links" onClick={() => setIsOpen(false)}>
              <FaInfoCircle className="nav-icon" />
              About Us
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className="nav-links" onClick={() => setIsOpen(false)}>
              <FaEnvelope className="nav-icon" />
              Contact Us
            </Link>
          </li>
          <li className="nav-item">
            <button className="nav-links logout-btn" onClick={handleLogout}>
              <FaSignOutAlt className="nav-icon" />
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default DriverNavbar; 