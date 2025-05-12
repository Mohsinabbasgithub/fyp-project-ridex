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

      <section className="team-section">
        <h2>Our Leadership Team</h2>
        <div className="team-grid">
          <div className="team-member">
            <div className="member-image">
              <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="John Smith" />
            </div>
            <h3>John Smith</h3>
            <p className="member-title">Founder & CEO</p>
            <p className="member-bio">Former tech executive with 15+ years of experience in transportation and logistics.</p>
          </div>
          <div className="team-member">
            <div className="member-image">
              <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Sarah Johnson" />
            </div>
            <h3>Sarah Johnson</h3>
            <p className="member-title">Chief Operations Officer</p>
            <p className="member-bio">Expertise in scaling operations and optimizing user experience across platforms.</p>
          </div>
          <div className="team-member">
            <div className="member-image">
              <img src="https://randomuser.me/api/portraits/men/68.jpg" alt="Michael Chen" />
            </div>
            <h3>Michael Chen</h3>
            <p className="member-title">Chief Technology Officer</p>
            <p className="member-bio">Tech innovator with background in AI and mobile application development.</p>
          </div>
          <div className="team-member">
            <div className="member-image">
              <img src="https://randomuser.me/api/portraits/women/65.jpg" alt="Lisa Patel" />
            </div>
            <h3>Lisa Patel</h3>
            <p className="member-title">Head of Marketing</p>
            <p className="member-bio">Digital marketing strategist focused on community building and brand development.</p>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <h2>RideX by the Numbers</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>5,000+</h3>
            <p>Registered Drivers</p>
          </div>
          <div className="stat-card">
            <h3>25,000+</h3>
            <p>Happy Customers</p>
          </div>
          <div className="stat-card">
            <h3>100+</h3>
            <p>Cities Served</p>
          </div>
          <div className="stat-card">
            <h3>4.8/5</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 