import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaCar, FaMapMarkerAlt, FaStar, FaShieldAlt, FaClock, FaUsers, FaSearch, FaPhone, FaCreditCard, FaCheckCircle, FaDollarSign } from "react-icons/fa";
import { MdLocationOn, MdDirectionsCar } from "react-icons/md";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();
  const { userRole, currentUser } = useAuth();
  
  // Book a ride form state
  const [bookingForm, setBookingForm] = useState({
    pickup: '',
    destination: '',
    date: '',
    time: '',
    passengers: 1,
    vehicleType: 'sedan'
  });

  const handleBookingChange = (e) => {
    setBookingForm({
      ...bookingForm,
      [e.target.name]: e.target.value
    });
  };

  const handleQuickBooking = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Navigate to ride booking with pre-filled data
    const params = new URLSearchParams({
      pickup: bookingForm.pickup,
      destination: bookingForm.destination,
      date: bookingForm.date,
      time: bookingForm.time,
      passengers: bookingForm.passengers,
      vehicleType: bookingForm.vehicleType
    });
    
    navigate(`/ride-booking?${params.toString()}`);
  };

  return (
    <div className="home-container">
      {/* Hero Section with Booking Form */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              <span className="title-highlight">RideX</span>
              <br />
              Your Journey, Our Priority
            </h1>
            <p className="hero-subtitle" style={{ color: 'white' }}>
              Experience safe, reliable, and affordable rides with our professional drivers. 
              Book your ride in seconds and enjoy the journey.
            </p>
            
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Happy Customers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Verified Drivers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Service Available</span>
              </div>
            </div>
          </div>

          {/* Quick Booking Form */}
          <div className="booking-card">
            <div className="booking-header">
              <h3>Book Your Ride Now</h3>
              <p>Quick and easy booking process</p>
            </div>
            
            <form className="booking-form" onSubmit={(e) => { e.preventDefault(); handleQuickBooking(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <MdLocationOn className="input-icon" />
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    name="pickup"
                    value={bookingForm.pickup}
                    onChange={handleBookingChange}
                    placeholder="Enter pickup address"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <MdLocationOn className="input-icon" />
                    Destination
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={bookingForm.destination}
                    onChange={handleBookingChange}
                    placeholder="Enter destination"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FaClock className="input-icon" />
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={bookingForm.date}
                    onChange={handleBookingChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FaClock className="input-icon" />
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={bookingForm.time}
                    onChange={handleBookingChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <FaUsers className="input-icon" />
                    Passengers
                  </label>
                  <select
                    name="passengers"
                    value={bookingForm.passengers}
                    onChange={handleBookingChange}
                  >
                    <option value={1}>1 Passenger</option>
                    <option value={2}>2 Passengers</option>
                    <option value={3}>3 Passengers</option>
                    <option value={4}>4 Passengers</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>
                    <MdDirectionsCar className="input-icon" />
                    Vehicle Type
                  </label>
                  <select
                    name="vehicleType"
                    value={bookingForm.vehicleType}
                    onChange={handleBookingChange}
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="luxury">Luxury</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="book-now-btn">
                <FaSearch className="btn-icon" />
                Find Available Rides
              </button>
            </form>

            <div className="booking-features">
              <div className="feature-item">
                <FaCheckCircle className="feature-icon" />
                <span>Instant Booking</span>
              </div>
              <div className="feature-item">
                <FaShieldAlt className="feature-icon" />
                <span>Safe & Secure</span>
              </div>
              <div className="feature-item">
                <FaCreditCard className="feature-icon" />
                <span>Multiple Payment Options</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose RideX?</h2>
            <p>Experience the difference with our premium ride-sharing service</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3>Safe & Secure</h3>
              <p>All our drivers are verified and vehicles are regularly inspected for your safety. Real-time tracking ensures you're always in control.</p>
              <ul className="feature-list">
                <li>Background verified drivers</li>
                <li>Regular vehicle inspections</li>
                <li>24/7 customer support</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaClock />
              </div>
              <h3>24/7 Service</h3>
              <p>Available round the clock to serve you whenever you need a ride. No matter the time, we're here for you.</p>
              <ul className="feature-list">
                <li>Available anytime, anywhere</li>
                <li>Quick response times</li>
                <li>Emergency ride support</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaStar />
              </div>
              <h3>Top Rated</h3>
              <p>Highly rated drivers and excellent customer service guaranteed. Join thousands of satisfied customers.</p>
              <ul className="feature-list">
                <li>4.8+ average rating</li>
                <li>Professional drivers</li>
                <li>Quality guaranteed</li>
              </ul>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaMapMarkerAlt />
              </div>
              <h3>Real-time Tracking</h3>
              <p>Track your ride in real-time and know exactly when your driver will arrive. Stay informed every step of the way.</p>
              <ul className="feature-list">
                <li>Live GPS tracking</li>
                <li>ETA updates</li>
                <li>Route optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Get your ride in just 3 simple steps</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">
                <FaMapMarkerAlt />
              </div>
              <h3>Set Your Location</h3>
              <p>Enter your pickup and destination locations. Our smart system will find the best route for you.</p>
              <div className="step-details">
                <span>• Quick address input</span>
                <span>• GPS location detection</span>
                <span>• Route optimization</span>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">
                <FaCar />
              </div>
              <h3>Choose Your Ride</h3>
              <p>Select from available vehicles and drivers. Compare prices and choose what suits you best.</p>
              <div className="step-details">
                <span>• Multiple vehicle options</span>
                <span>• Transparent pricing</span>
                <span>• Driver ratings & reviews</span>
              </div>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">
                <FaUsers />
              </div>
              <h3>Enjoy Your Ride</h3>
              <p>Relax and enjoy your journey with our professional drivers. Track your ride in real-time.</p>
              <div className="step-details">
                <span>• Professional drivers</span>
                <span>• Real-time tracking</span>
                <span>• Safe & comfortable ride</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 style={{ color: 'black' }}>Ready to Get Started?</h2>
            <p>Join thousands of satisfied customers who trust RideX for their transportation needs. Download our app or book online today!</p>
            
            <div className="cta-buttons">
              {!currentUser ? (
                <>
                  <button 
                    className="cta-btn primary"
                    onClick={() => navigate('/signup-user')}
                  >
                    <FaCar className="btn-icon" />
                    Sign Up as User
                  </button>
                  <button 
                    className="cta-btn primary"
                    onClick={() => navigate('/signup-driver')}
                  >
                    <FaUsers className="btn-icon" />
                    Become a Driver Partner
                  </button>
                </>
              ) : userRole === 'user' ? (
                <button 
                  className="cta-btn primary"
                  onClick={() => navigate('/ride-booking')}
                >
                  <FaCar className="btn-icon" />
                  Book Your First Ride
                </button>
              ) : userRole === 'driver' ? (
                <button 
                  className="cta-btn primary"
                  onClick={() => navigate('/driver-dashboard')}
                >
                  <FaCar className="btn-icon" />
                  Start Earning Today
                </button>
              ) : null}
            </div>

            <div className="cta-features">
              <div className="cta-feature">
                <FaPhone className="cta-feature-icon" />
                <span>24/7 Support</span>
              </div>
              <div className="cta-feature">
                <FaCreditCard className="cta-feature-icon" />
                <span>Secure Payments</span>
              </div>
              <div className="cta-feature">
                <FaShieldAlt className="cta-feature-icon" />
                <span>100% Safe</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
