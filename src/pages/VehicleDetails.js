import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { FaCar, FaGasPump, FaCogs, FaUsers, FaStar, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import FeedbackForm from '../components/FeedbackForm';
import '../styles/VehicleDetails.css';
import '../styles/FeedbackForm.css';

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const vehicleDoc = await getDoc(doc(db, 'vehicles', id));
        if (vehicleDoc.exists()) {
          setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });
        } else {
          console.error('Vehicle not found');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vehicle details:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchVehicleDetails();
    }
  }, [id]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setSelectedDates(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBooking = () => {
    if (!currentUser) {
      navigate('/SignupForm');
      return;
    }

    if (selectedDates.startDate && selectedDates.endDate) {
      navigate(`/booking-confirmation/${id}`, {
        state: {
          startDate: selectedDates.startDate,
          endDate: selectedDates.endDate,
          vehicle: vehicle
        }
      });
    }
  };

  const handleFeedbackSubmit = async (vehicleId, rating, feedback, sentimentResult) => {
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        vehicleId,
        rating,
        feedback,
        userId: currentUser?.uid || 'anonymous',
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        normalizedRating: sentimentResult.normalizedRating,
        createdAt: new Date(),
      });

      // Update vehicle's rating in Firestore
      const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
      if (vehicleDoc.exists()) {
        const vehicleData = vehicleDoc.data();
        const currentRating = vehicleData.rating || 0;
        const currentReviews = vehicleData.reviews || [];
        
        const newRating = ((currentRating * currentReviews.length) + rating) / (currentReviews.length + 1);
        
        await updateDoc(doc(db, 'vehicles', vehicleId), {
          rating: newRating,
          reviews: [...currentReviews, { 
            rating, 
            feedback, 
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.score,
            normalizedRating: sentimentResult.normalizedRating,
            createdAt: new Date() 
          }]
        });

        // Update local state
        setVehicle(prev => ({
          ...prev,
          rating: newRating,
          reviews: [...(prev.reviews || []), { 
            rating, 
            feedback, 
            sentiment: sentimentResult.sentiment,
            sentimentScore: sentimentResult.score,
            normalizedRating: sentimentResult.normalizedRating,
            createdAt: new Date() 
          }]
        }));
      }
      
      return true;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="vehicle-loading">
        <h2>Loading vehicle details...</h2>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="vehicle-error">
        <h2>Vehicle not found</h2>
      </div>
    );
  }

  return (
    <div className="vehicle-details-container">
      <div className="vehicle-gallery">
        {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
          <>
            <img 
              src={vehicle.imageUrls[0]} 
              alt={`${vehicle.make} ${vehicle.model}`} 
              className="main-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/400x300?text=No+Image+Available';
              }}
            />
            <div className="thumbnail-grid">
              {vehicle.imageUrls.slice(1).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${vehicle.make} ${vehicle.model} - View ${index + 2}`}
                  className="thumbnail"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-images">
            <img 
              src="https://via.placeholder.com/400x300?text=No+Images+Available" 
              alt="No images available"
              className="main-image"
            />
          </div>
        )}
      </div>

      <div className="vehicle-info-container">
        <div className="vehicle-header">
          <div className="vehicle-title">
            <h1>{vehicle.make} {vehicle.model}</h1>
            <div className="vehicle-rating">
              <FaStar className="star-icon" />
              <span>{vehicle.rating || '4.5'}</span>
              <span className="review-count">({vehicle.reviewCount || '12'} reviews)</span>
              <button 
                className="view-reviews-btn"
                onClick={() => navigate(`/vehicle/${id}/feedback`)}
              >
                View Reviews
              </button>
            </div>
          </div>
          <div className="vehicle-price">
            <h2>${vehicle.pricePerDay}</h2>
            <span>per day</span>
          </div>
        </div>

        <div className="vehicle-features">
          <div className="feature">
            <FaCar className="feature-icon" />
            <span>Year: {vehicle.year || 'N/A'}</span>
          </div>
          <div className="feature">
            <FaGasPump className="feature-icon" />
            <span>Color: {vehicle.color || 'N/A'}</span>
          </div>
          <div className="feature">
            <FaCogs className="feature-icon" />
            <span>License: {vehicle.licensePlate || 'N/A'}</span>
          </div>
          <div className="feature">
            <FaUsers className="feature-icon" />
            <span>{vehicle.seats || 'N/A'} seats</span>
          </div>
        </div>

        <div className="vehicle-description">
          <h3>Description</h3>
          <p>{vehicle.description || 'No description available.'}</p>
        </div>

        <div className="vehicle-location">
          <h3>
            <FaMapMarkerAlt className="location-icon" />
            Vehicle Status
          </h3>
          <p className={`status-badge ${vehicle.status || 'available'}`}>
            {vehicle.status ? vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1) : 'Available'}
          </p>
        </div>

        <FeedbackForm 
          vehicleId={id} 
          driverId={vehicle.ownerId} 
          onFeedbackSubmit={handleFeedbackSubmit}
        />

        <div className="booking-section">
          <h3>
            <FaCalendarAlt className="calendar-icon" />
            Select Dates
          </h3>
          <div className="date-inputs">
            <div className="date-field">
              <label>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={selectedDates.startDate}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="date-field">
              <label>End Date</label>
              <input
                type="date"
                name="endDate"
                value={selectedDates.endDate}
                onChange={handleDateChange}
                min={selectedDates.startDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {selectedDates.startDate && selectedDates.endDate && (
            <div className="booking-summary">
              <p>Total Days: {
                Math.ceil((new Date(selectedDates.endDate) - new Date(selectedDates.startDate)) / (1000 * 60 * 60 * 24))
              }</p>
              <p>Total Price: $
                {(Math.ceil((new Date(selectedDates.endDate) - new Date(selectedDates.startDate)) / (1000 * 60 * 60 * 24)) * vehicle.pricePerDay).toFixed(2)}
              </p>
            </div>
          )}

          <button
            className="book-now-btn"
            onClick={handleBooking}
            disabled={!selectedDates.startDate || !selectedDates.endDate || vehicle.status !== 'available'}
          >
            {vehicle.status === 'available' ? 'Book Now' : 'Not Available'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetails; 