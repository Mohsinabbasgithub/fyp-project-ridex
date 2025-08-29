import React from 'react';
import { FaCar, FaUsers, FaShieldAlt, FaLeaf } from 'react-icons/fa';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1>About RideX</h1>
        <p className="tagline">Connecting drivers and riders for a better tomorrow</p>
      </div>

      <section className="about-section">
        <h2>Our Story</h2>
        <div className="about-content">
          <div className="about-image">
            <img src="https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" alt="Team working" />
          </div>
          <div className="about-text">
            <p>
              Founded in 2023, RideX began with a simple idea: make vehicle rentals easy, affordable, and accessible to everyone.
              What started as a small startup in a garage has now grown into a nationwide platform connecting thousands of vehicle owners with renters.
            </p>
            <p>
              Our founder, John Smith, experienced firsthand the frustration of traditional car rental services during a business trip.
              Long lines, hidden fees, and limited vehicle options led him to envision a peer-to-peer platform where renting a car would be as
              simple as booking a hotel room online.
            </p>
            <p>
              Today, RideX is revolutionizing the way people think about transportation, creating economic opportunities for drivers
              and providing affordable, convenient options for riders across the country.
            </p>
          </div>
        </div>
      </section>

      <section className="values-section">
        <h2>Our Values</h2>
        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">
              <FaUsers />
            </div>
            <h3>Community</h3>
            <p>We believe in building strong connections between drivers and riders, fostering a community based on trust and mutual respect.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <FaShieldAlt />
            </div>
            <h3>Safety</h3>
            <p>We prioritize the safety of our users above all else, with thorough driver verification and vehicle inspections.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <FaCar />
            </div>
            <h3>Innovation</h3>
            <p>We continuously strive to improve our platform and services, embracing new technologies to enhance user experience.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">
              <FaLeaf />
            </div>
            <h3>Sustainability</h3>
            <p>We're committed to reducing our environmental footprint by promoting efficient vehicle use and supporting electric vehicles.</p>
          </div>
        </div>
      </section>

      {/* Team and Stats sections removed as requested */}

    </div>
  );
};

export default About;