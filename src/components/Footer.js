import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaCar, 
  FaSearch, 
  FaCreditCard, 
  FaPhone, 
  FaUsers, 
  FaDollarSign, 
  FaStar, 
  FaMapMarkerAlt, 
  FaClock 
} from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  const [showChat, setShowChat] = useState(false);

  const handleChatClick = () => {
    // Trigger the chatbot to open
    const chatbotButton = document.querySelector('.chatbot-toggle');
    if (chatbotButton) {
      chatbotButton.click();
    }
  };

  const handleSocialClick = (platform) => {
    const urls = {
      facebook: 'https://www.facebook.com/ridex',
      twitter: 'https://www.twitter.com/ridex',
      instagram: 'https://www.instagram.com/ridex',
      linkedin: 'https://www.linkedin.com/company/ridex'
    };
    window.open(urls[platform], '_blank');
  };

  const handleContactClick = (type) => {
    switch (type) {
      case 'phone':
        window.open('tel:+923091736516', '_self');
        break;
      case 'email':
        window.open('mailto:support@ridex.com', '_self');
        break;
      case 'location':
        window.open('https://maps.google.com/?q=Awami+Road,+Daska,+Pakistan', '_blank');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <h3 className="footer-logo">RideX</h3>
              <p>Your trusted partner for safe and reliable transportation. We're committed to providing the best ride-sharing experience with 24/7 support and professional drivers.</p>
              
              <div className="social-links">
                <h4>Follow Us</h4>
                <div className="social-icons">
                  <button 
                    className="social-icon facebook"
                    onClick={() => handleSocialClick('facebook')}
                  >
                    <FaFacebook />
                  </button>
                  <button 
                    className="social-icon twitter"
                    onClick={() => handleSocialClick('twitter')}
                  >
                    <FaTwitter />
                  </button>
                  <button 
                    className="social-icon instagram"
                    onClick={() => handleSocialClick('instagram')}
                  >
                    <FaInstagram />
                  </button>
                  <button 
                    className="social-icon linkedin"
                    onClick={() => handleSocialClick('linkedin')}
                  >
                    <FaLinkedin />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="footer-navigation">
              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li>
                    <Link to="/about">
                      <FaStar className="link-icon" />
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact">
                      <FaPhone className="link-icon" />
                      Contact Us
                    </Link>
                  </li>
                 
                  
                 
                  <li>
                    <Link to="/privacy">
                      <FaStar className="link-icon" />
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
              
              <div className="footer-column contact-info">
                <h4 style={{ color: 'black' }}>Contact Info</h4>
                <div className="contact-details">
                  <div className="contact-item" onClick={() => handleContactClick('phone')}>
                    <FaPhone className="contact-icon" />
                    <div>
                      <span className="contact-label">Phone</span>
                      <span className="contact-value">+92 309 173-6516</span>
                    </div>
                  </div>
                  <div className="contact-item" onClick={() => handleContactClick('location')}>
                    <FaMapMarkerAlt className="contact-icon" />
                    <div>
                      <span className="contact-label">Address</span>
                      <span className="contact-value">Awami Road, Daska</span>
                    </div>
                  </div>
                 
                  <div className="contact-item" onClick={() => handleContactClick('email')}>
                    <FaStar className="contact-icon" />
                    <div>
                      <span className="contact-label">Email</span>
                      <span className="contact-value">support@ridex.com</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
          
          
          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p>&copy; 2024 RideX. All rights reserved.</p>
              <div className="footer-bottom-links">
                <Link to="/terms">Terms of Service</Link>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/cookies">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer; 