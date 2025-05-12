import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc, query, where, addDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/AllVehicles.css";
import { FaStar, FaSearch, FaFilter } from 'react-icons/fa';
import Sentiment from 'sentiment';
import FeedbackForm from '../components/FeedbackForm';
import { auth } from "../firebase";

const AllVehicles = () => {
  const sentiment = new Sentiment();
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    priceRange: '',
    location: ''
  });
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || "";
  const [search, setSearch] = useState(initialSearch);
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const navigate = useNavigate();
  const [userRatings, setUserRatings] = useState({});
  const [vehicleFeedbacks, setVehicleFeedbacks] = useState({});
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverError, setDriverError] = useState(null);

  // Fetch all vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef);
        const querySnapshot = await getDocs(q);
        
        const vehiclesData = await Promise.all(querySnapshot.docs.map(async doc => {
          const data = doc.data();
          
          // Initialize ratings collection if it doesn't exist
          const ratingsRef = collection(db, 'vehicles', doc.id, 'ratings');
          const ratingsSnapshot = await getDocs(ratingsRef);
          const ratings = ratingsSnapshot.docs.map(ratingDoc => ratingDoc.data());
          
          // Calculate average rating
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
            : 0;
          
          // Fetch driver data for each vehicle
          let driverData = null;
          if (data.driverId) {
            try {
              const driverDoc = await getDoc(doc(db, 'drivers', data.driverId));
              if (driverDoc.exists()) {
                driverData = driverDoc.data();
                
                if (!data.driverName || data.driverName === 'Unknown Driver') {
                  await updateDoc(doc(db, 'vehicles', doc.id), {
                    driverName: driverData.fullName,
                    driverPhone: driverData.phone,
                    driverEmail: driverData.email
                  });
                }
              }
            } catch (err) {
              console.error('Error fetching driver:', err);
            }
          }

          return {
            id: doc.id,
            name: `${data.make} ${data.model}`.trim(),
            type: data.vehicleType || data.type || data.category || '',
            location: data.location || '',
            price: data.price || data.pricePerDay || 0,
            imageUrl: data.imageUrl || data.imageUrls?.[0] || 'https://via.placeholder.com/300x200?text=No+Image',
            transmission: data.transmission || '',
            fuelType: data.fuelType || '',
            description: data.description || '',
            driverId: data.driverId,
            driverName: driverData?.fullName || data.driverName || '',
            driverImage: driverData?.imageUrl || data.driverImage || null,
            driverRating: driverData?.rating || data.driverRating || 0,
            driverPhone: driverData?.phone || data.driverPhone || '',
            driverEmail: driverData?.email || data.driverEmail || '',
            rating: averageRating || 0,
            reviews: ratings.map(rating => ({
              rating: rating.rating || 0,
              text: rating.feedback || '',
              date: rating.createdAt?.toDate?.() || new Date()
            })),
            isApproved: data.isApproved || false
          };
        }));
        
        setVehicles(vehiclesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('Failed to load vehicles. Please try again later.');
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Fetch Driver Details
  const fetchDriverDetails = async (driverId) => {
    if (!driverId) {
      console.log('No driver ID provided');
      return setDriverDetails(null);
    }
    
    try {
      setDriverLoading(true);
      setDriverError(null);
      console.log('Fetching driver details for ID:', driverId);
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        console.log('Driver data found:', driverData);
        setDriverDetails({
          name: driverData.fullName || 'Unknown Driver',
          imageUrl: driverData.imageUrl || driverData.photoURL,
          rating: driverData.rating || 0,
          phone: driverData.phone || 'N/A',
          email: driverData.email || 'N/A'
        });
      } else {
        console.log('No driver found for ID:', driverId);
        setDriverDetails(null);
        setDriverError('Driver profile not found');
      }
    } catch (err) {
      console.error('Error fetching driver details:', err);
      setDriverDetails(null);
      setDriverError('Failed to load driver details');
    } finally {
      setDriverLoading(false);
    }
  };

  // Handle show details
  const handleShowDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    if (vehicle?.driverId) {
    await fetchDriverDetails(vehicle.driverId);
    } else {
      setDriverDetails(null);
      setDriverError('No driver information available');
    }
  };

  // Handle rent now
  const handleRentNow = (vehicle) => {
    if (!hasPaymentMethod) {
      alert("Please add a payment method before renting a vehicle.");
      navigate("/payments");
      return;
    }
    // Proceed with rental process
    navigate(`/rent/${vehicle.id}`);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      type: '',
      priceRange: '',
      location: ''
    });
    setSearch("");
    setSortOrder("asc");
  };

  // Filter and sort vehicles
  const filteredVehicles = vehicles
    .filter(vehicle => {
      if (!vehicle) return false;
      
      // Only show approved vehicles
      if (!vehicle.isApproved) return false;
      
      const matchesSearch = search ? (
        (vehicle.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (vehicle.location?.toLowerCase() || '').includes(search.toLowerCase())
      ) : true;

      const matchesType = !filters.type || vehicle.type === filters.type;
      const matchesLocation = !filters.location || vehicle.location === filters.location;
      const matchesPrice = !filters.priceRange || 
        (filters.priceRange === 'low' && (vehicle.price || 0) <= 50) ||
        (filters.priceRange === 'medium' && (vehicle.price || 0) > 50 && (vehicle.price || 0) <= 100) ||
        (filters.priceRange === 'high' && (vehicle.price || 0) > 100);
      
      return matchesSearch && matchesType && matchesLocation && matchesPrice;
    })
    .sort((a, b) => {
      // Sort by rating when using the rating buttons
      const ratingA = a?.rating || 0;
      const ratingB = b?.rating || 0;
      return sortOrder === 'asc' ? ratingA - ratingB : ratingB - ratingA;
    });

  const analyzeSentiment = (text) => {
    const result = sentiment.analyze(text);
    const normalizedScore = (result.score + 5) / 2;
    const rating = Math.max(1, Math.min(5, Math.round(normalizedScore)));
    return rating;
  };

  const handleFeedback = async (vehicleId, text) => {
    if (userRatings[vehicleId]) {
      return;
    }

    if (!text.trim()) {
      alert('Please enter your feedback');
      return;
    }

    try {
      const rating = analyzeSentiment(text);
      
      // Add rating to Firestore
      await addDoc(collection(db, 'feedback'), {
        vehicleId,
        rating,
        feedback: text,
        createdAt: new Date(),
        userId: auth.currentUser?.uid || 'anonymous'
      });

      // Update local state
      const updatedVehicles = vehicles.map(vehicle => {
        if (vehicle.id === vehicleId) {
          const newReview = {
            rating,
            text,
            date: new Date()
          };
          const updatedReviews = [...(vehicle.reviews || []), newReview];
          const newRating = updatedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / updatedReviews.length;

          // Update user ratings in local storage
          const updatedUserRatings = { ...userRatings, [vehicleId]: rating };
          setUserRatings(updatedUserRatings);
          localStorage.setItem('userVehicleRatings', JSON.stringify(updatedUserRatings));

          return {
            ...vehicle,
            rating: newRating,
            reviews: updatedReviews
          };
        }
        return vehicle;
      });

      setVehicles(updatedVehicles);
      setVehicleFeedbacks(prev => ({ ...prev, [vehicleId]: '' }));

      // Update vehicle's average rating in Firestore
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleRef);
      
      if (vehicleDoc.exists()) {
        const vehicleData = vehicleDoc.data();
        const currentRating = vehicleData.rating || 0;
        const currentReviews = vehicleData.reviews || [];
        
        const newRating = ((currentRating * currentReviews.length) + rating) / (currentReviews.length + 1);
        
        await updateDoc(vehicleRef, {
          rating: newRating,
          reviews: [...currentReviews, { 
            rating, 
            feedback: text, 
            createdAt: new Date() 
          }]
        });
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleFeedbackChange = (vehicleId, text) => {
    setVehicleFeedbacks(prev => ({ ...prev, [vehicleId]: text }));
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleDriverFeedbackSubmit = async (driverId, rating, feedback) => {
    try {
      // Analyze sentiment of the feedback
      const sentimentResult = analyzeSentiment(feedback);
      
      // Save feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        driverId,
        rating,
        feedback,
        sentiment: sentimentResult.score,
        createdAt: new Date(),
      });

      // Update driver's rating
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        const currentRating = driverData.rating || 0;
        const currentReviews = driverData.reviews || [];
        
        const newRating = ((currentRating * currentReviews.length) + rating) / (currentReviews.length + 1);
        
        await updateDoc(doc(db, 'drivers', driverId), {
          rating: newRating,
          reviews: [...currentReviews, { rating, feedback, createdAt: new Date() }]
        });
      }
    } catch (err) {
      console.error('Error submitting driver feedback:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading vehicles...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="no-vehicles-message">No vehicles available at the moment.</div>
    );
  }

  return (
    <div className="all-vehicles-container">
      <div className="vehicles-header">
        <h2>Available Vehicles</h2>
        <p>Find your perfect ride from our selection of vehicles</p>
      </div>

      <div className="search-filters">
        <input
          type="text"
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({...filters, type: e.target.value})}
        >
          <option value="">All Types</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="luxury">Luxury</option>
        </select>
        <select
          value={filters.priceRange}
          onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
        >
          <option value="">All Prices</option>
          <option value="low">$0 - $50</option>
          <option value="medium">$51 - $100</option>
          <option value="high">$100+</option>
        </select>
        <select
          value={filters.location}
          onChange={(e) => setFilters({...filters, location: e.target.value})}
        >
          <option value="">All Locations</option>
          <option value="new-york">New York</option>
          <option value="los-angeles">Los Angeles</option>
          <option value="chicago">Chicago</option>
        </select>
        <div className="sort-controls">
          <button 
            className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
            onClick={() => setSortOrder('desc')}
          >
            <FaStar /> Highest Rated
          </button>
          <button 
            className={`sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
            onClick={() => setSortOrder('asc')}
          >
            <FaStar /> Lowest Rated
          </button>
        </div>
        <button className="clear-btn" onClick={clearFilters}>Clear Filters</button>
      </div>

      <div className="vehicles-grid">
        {filteredVehicles.map(vehicle => (
          <div key={vehicle.id} className="vehicle-card">
            <div className="vehicle-image-container">
              <img
                src={vehicle.imageUrl}
                alt={vehicle.name}
                className="vehicle-image"
              />
              <div className="vehicle-price-tag">
                ${vehicle.price}<small>/day</small>
              </div>
            </div>

            <div className="vehicle-info">
              <h3 className="vehicle-title">{vehicle.name || 'Unnamed Vehicle'}</h3>
              <div className="vehicle-specs">
                {vehicle.type && (
                <div className="spec-item">
                  <i className="fas fa-car"></i>
                    <span>{vehicle.type}</span>
                </div>
                )}
                {vehicle.location && (
                <div className="spec-item">
                  <i className="fas fa-map-marker-alt"></i>
                    <span>{vehicle.location}</span>
                </div>
                )}
                {vehicle.transmission && (
                <div className="spec-item">
                  <i className="fas fa-cog"></i>
                    <span>{vehicle.transmission}</span>
                </div>
                )}
                {vehicle.fuelType && (
                <div className="spec-item">
                  <i className="fas fa-gas-pump"></i>
                    <span>{vehicle.fuelType}</span>
                </div>
                )}
              </div>
              {vehicle.description && <p className="vehicle-description">{vehicle.description}</p>}
              
              <div className="rating-section">
                <div className="current-rating">
                  <span>Rating: {vehicle.rating ? vehicle.rating.toFixed(1) : '0.0'}</span>
                      <div className="stars">
                    {[...Array(5)].map((_, index) => (
                      <FaStar
                        key={index}
                        className="star-icon"
                        color={index < vehicle.rating ? "#ffc107" : "#e4e5e9"}
                      />
                    ))}
                  </div>
                </div>
                {!userRatings[vehicle.id] ? (
                  <div className="feedback-form">
                    <textarea
                      value={vehicleFeedbacks[vehicle.id] || ''}
                      onChange={(e) => handleFeedbackChange(vehicle.id, e.target.value)}
                      placeholder="Share your experience with this vehicle..."
                      rows="3"
                    />
                    <button 
                      onClick={() => handleFeedback(vehicle.id, vehicleFeedbacks[vehicle.id])}
                      className="submit-feedback"
                    >
                      Submit Feedback
                    </button>
                  </div>
                ) : (
                  <div className="user-rating">
                    <span>Your rating: {userRatings[vehicle.id]}</span>
                    <div className="stars">
                      {[...Array(5)].map((_, index) => (
                        <FaStar
                          key={index}
                          className="star-icon"
                          color={index < userRatings[vehicle.id] ? "#ffc107" : "#e4e5e9"}
                        />
                      ))}
                    </div>
                    <p className="user-feedback">{vehicle.reviews[vehicle.reviews.length - 1]?.text}</p>
                  </div>
                )}
                <div className="reviews-count">
                  {vehicle.reviews.length} {vehicle.reviews.length === 1 ? 'review' : 'reviews'}
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="view-driver-btn"
                onClick={() => navigate(`/driver/${vehicle.driverId}`)}
              >
                <i className="fas fa-user"></i>
                View Driver
              </button>
              <button
                className="rent-btn"
                onClick={() => handleRentNow(vehicle)}
              >
                <i className="fas fa-key"></i>
                Rent Now
              </button>
              <button
                className="details-btn"
                onClick={() => handleShowDetails(vehicle)}
              >
                <i className="fas fa-info-circle"></i>
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedVehicle && (
        <div className="details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedVehicle.name}</h2>
              <button className="close-btn" onClick={() => setSelectedVehicle(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-vehicle-section">
                <h3>Vehicle Details</h3>
                <div className="modal-vehicle-image">
                  <img src={selectedVehicle.imageUrl} alt={selectedVehicle.name} />
                </div>
                <div className="modal-vehicle-details">
                  <div className="detail-row">
                    {selectedVehicle.type && (
                    <div className="detail-item">
                      <label>Type</label>
                      <span>{selectedVehicle.type}</span>
                    </div>
                    )}
                    {selectedVehicle.transmission && (
                    <div className="detail-item">
                      <label>Transmission</label>
                      <span>{selectedVehicle.transmission}</span>
                    </div>
                    )}
                    {selectedVehicle.fuelType && (
                    <div className="detail-item">
                      <label>Fuel Type</label>
                      <span>{selectedVehicle.fuelType}</span>
                    </div>
                    )}
                    {selectedVehicle.location && (
                    <div className="detail-item">
                      <label>Location</label>
                      <span>{selectedVehicle.location}</span>
                    </div>
                    )}
                  </div>
                  <div className="detail-row full-width">
                    <div className="detail-item">
                      <label>Description</label>
                      <p>{selectedVehicle.description}</p>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-item">
                      <label>Price per Day</label>
                      <span className="price">${selectedVehicle.price}</span>
                    </div>
                  </div>
                </div>
              </div>

              {driverDetails && (
                <div className="modal-driver-section">
                  <h3>Driver Details</h3>
                  {driverLoading ? (
                    <div className="loading-message">Loading driver details...</div>
                  ) : driverError ? (
                    <div className="error-message">{driverError}</div>
                  ) : (
                  <div className="modal-driver-details">
                    <div className="driver-profile">
                      <div className="driver-avatar">
                        {driverDetails.imageUrl ? (
                          <img src={driverDetails.imageUrl} alt={driverDetails.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {driverDetails.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="driver-basic-info">
                        <h5>{driverDetails.name}</h5>
                        <div className="driver-rating">
                          <div className="stars">
                            {'★'.repeat(Math.floor(driverDetails.rating))}
                            {'☆'.repeat(5 - Math.floor(driverDetails.rating))}
                          </div>
                          <span className="rating-value">({driverDetails.rating})</span>
                        </div>
                      </div>
                    </div>
                    <div className="driver-contact">
                      <div className="contact-item">
                        <i className="fas fa-phone"></i>
                          <a 
                            href={`https://wa.me/${driverDetails?.phone ? driverDetails.phone.replace(/[^0-9]/g, '') : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsapp-link"
                          >
                            <i className="fab fa-whatsapp"></i>
                            {driverDetails?.phone || 'N/A'}
                          </a>
                      </div>
                      <div className="contact-item">
                        <i className="fas fa-envelope"></i>
                          <span>{driverDetails?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!driverError && (
                    <div className="driver-feedback-section">
                      <h4>Rate this Driver</h4>
                      <FeedbackForm 
                        driverId={selectedVehicle.driverId}
                        onFeedbackSubmit={handleDriverFeedbackSubmit}
                      />
                  </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="close-btn" onClick={() => setSelectedVehicle(null)}>
                Close
              </button>
              <button
                className="rent-btn"
                onClick={() => handleRentNow(selectedVehicle)}
              >
                Rent Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllVehicles;
