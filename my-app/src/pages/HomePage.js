import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { FaSearch, FaCar, FaStar, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import '../styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeaturedVehicles = async () => {
      try {
        const vehiclesQuery = query(
          collection(db, 'vehicles'),
          orderBy('rating', 'desc'),
          limit(6)
        );
        const snapshot = await getDocs(vehiclesQuery);
        const vehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeaturedVehicles(vehicles);
      } catch (err) {
        console.error('Error fetching featured vehicles:', err);
        setError('Failed to load featured vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedVehicles();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleVehicleClick = (vehicleId) => {
    navigate(`/vehicle/${vehicleId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading featured vehicles...</h2>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find Your Perfect Ride</h1>
          <p>Discover and book the best vehicles for your next adventure</p>
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by make, model, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="search-button">Search</button>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose Ridex?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <FaCar className="feature-icon" />
            <h3>Wide Selection</h3>
            <p>Choose from a variety of vehicles to suit your needs</p>
          </div>
          <div className="feature-card">
            <FaStar className="feature-icon" />
            <h3>Verified Drivers</h3>
            <p>All our drivers are thoroughly vetted and rated</p>
          </div>
          <div className="feature-card">
            <FaMapMarkerAlt className="feature-icon" />
            <h3>Multiple Locations</h3>
            <p>Find vehicles available in your area</p>
          </div>
          <div className="feature-card">
            <FaCalendarAlt className="feature-icon" />
            <h3>Flexible Booking</h3>
            <p>Book for as long as you need with easy cancellation</p>
          </div>
        </div>
      </section>

      {/* Featured Vehicles Section */}
      <section className="featured-vehicles">
        <h2>Featured Vehicles</h2>
        {error ? (
          <p className="error-message">{error}</p>
        ) : (
          <div className="vehicles-grid">
            {featuredVehicles.map(vehicle => (
              <div 
                key={vehicle.id} 
                className="vehicle-card"
                onClick={() => handleVehicleClick(vehicle.id)}
              >
                <div className="vehicle-image">
                  <img 
                    src={vehicle.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
                    alt={`${vehicle.make} ${vehicle.model}`}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                    }}
                  />
                </div>
                <div className="vehicle-info">
                  <h3>{vehicle.make} {vehicle.model}</h3>
                  <div className="vehicle-details">
                    <span className="price">${vehicle.pricePerDay}/day</span>
                    <div className="rating">
                      <FaStar className="star-icon" />
                      <span>{vehicle.rating?.toFixed(1) || '4.5'}</span>
                    </div>
                  </div>
                  <div className="vehicle-features">
                    <span>{vehicle.year}</span>
                    <span>{vehicle.seatingCapacity} seats</span>
                    <span>{vehicle.transmission}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button 
          className="view-all-btn"
          onClick={() => navigate('/vehicles')}
        >
          View All Vehicles
        </button>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Search</h3>
            <p>Find the perfect vehicle for your needs</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Book</h3>
            <p>Select your dates and confirm your booking</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Drive</h3>
            <p>Pick up your vehicle and enjoy your ride</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 