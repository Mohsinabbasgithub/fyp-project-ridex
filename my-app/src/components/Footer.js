import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>About RideX</h3>
          <p>RideX is a platform connecting vehicle owners with renters, making vehicle sharing easy and convenient.</p>
          <div className="social-links">
            <a href="https://www.youtube.com/" className="social-link"><FaFacebook /></a>
            <a href="https://www.instagram.com/" className="social-link"><FaTwitter /></a>
            <a href="https://www.facebook.com/" className="social-link"><FaInstagram /></a>
            <a href="https://www.youtube.com/" className="social-link"><FaLinkedin /></a>
          </div>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/all-vehicles">Find Vehicles</Link></li>
            <li><Link to="/DriverRegistration">Become a Driver</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact Us</h3>
          <ul className="contact-info">
            <li>Email: support@ridex.com</li>
            <li>Phone: +92 (309) 173-6516</li>
            <li>Address: Awami Road , Daska, Pakistan</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} RideX. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 