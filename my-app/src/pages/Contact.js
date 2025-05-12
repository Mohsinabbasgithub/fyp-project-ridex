import React, { useState, useRef } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';
import emailjs from '@emailjs/browser';
import '../styles/Contact.css';

const Contact = () => {
  const form = useRef();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Initialize EmailJS
      emailjs.init("6xu6AV7uf0x35b6-8"); // Public key

      // Send email using EmailJS
      await emailjs.sendForm(
        'service_72en8ip', // EmailJS service ID
        'template_q36d56u', // EmailJS template ID
        form.current,
        '6xu6AV7uf0x35b6-8' // Public key
      );

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      
      // Reset submitted state after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Reach out with any questions or feedback!</p>
      </div>

      <div className="contact-content">
        <div className="contact-info">
          <div className="info-card">
            <div className="info-icon">
              <FaPhone />
            </div>
            <h3>Phone</h3>
            <p>+1 (123) 456-7890</p>
            <p>Mon-Fri: 9am-6pm EST</p>
          </div>
          
          <div className="info-card">
            <div className="info-icon">
              <FaEnvelope />
            </div>
            <h3>Email</h3>
            <p>simplehumbleman111@gmail.com</p>
          </div>
          
          <div className="info-card">
            <div className="info-icon">
              <FaMapMarkerAlt />
            </div>
            <h3>Visit Us</h3>
            <p>123 RideX Street</p>
            <p>City, State 12345</p>
          </div>
          
          <div className="social-links">
            <h3>Connect With Us</h3>
            <div className="social-icons">
              <a href="#" className="social-icon">
                <FaFacebook />
              </a>
              <a href="#" className="social-icon">
                <FaTwitter />
              </a>
              <a href="#" className="social-icon">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>

        <div className="contact-form-container">
          <h2>Send Us a Message</h2>
          {submitted ? (
            <div className="success-message">
              Thank you for your message! We'll be in touch soon.
            </div>
          ) : (
            <form ref={form} className="contact-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="Enter subject"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Type your message here..."
                ></textarea>
              </div>
              
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <div className="map-container">
        <h2>Our Location</h2>
        <div className="map">
          {/* In a real app, you would integrate Google Maps or another map service here */}
          <img 
            src="https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7Clabel:S%7C40.702147,-74.015794&key=YOUR_API_KEY" 
            alt="Map location"
            className="map-placeholder"
          />
          <div className="map-overlay">
            <p>Map integration would be placed here in production.</p>
            <p>This is just a placeholder image.</p>
          </div>
        </div>
      </div>

      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>How do I register as a driver?</h3>
            <p>To register as a driver, click on the "Become a Driver" button in the navigation menu and follow the prompts to complete your profile.</p>
          </div>
          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards, debit cards, and digital payment methods like PayPal and Apple Pay.</p>
          </div>
          <div className="faq-item">
            <h3>How do I cancel a booking?</h3>
            <p>You can cancel a booking through your account dashboard up to 24 hours before the scheduled pickup time without any cancellation fee.</p>
          </div>
          <div className="faq-item">
            <h3>Is insurance included with rentals?</h3>
            <p>Basic insurance is included with all rentals. Additional coverage options are available during the booking process.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact; 