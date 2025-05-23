import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { FaUser, FaCar, FaStar, FaPhone, FaEnvelope, FaMapMarkerAlt, FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import FeedbackForm from '../components/FeedbackForm';
import '../styles/DriverDetails.css';
import '../styles/FeedbackForm.css';

const DriverDetails = () => {
  const { driverId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriverDetails = async () => {
      if (!driverId) {
        setError('No driver ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching driver with ID:', driverId);
        
        const driverRef = doc(db, 'drivers', driverId);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          console.log('Found driver:', driverData);
          
          setDriver({
            id: driverDoc.id,
            name: driverData.fullName || 'Unknown Driver',
            email: driverData.email || 'N/A',
            phone: driverData.phoneNumber || 'N/A',
            address: driverData.address || 'N/A',
            city: driverData.city || 'N/A',
            state: driverData.state || 'N/A',
            zipCode: driverData.zipCode || 'N/A',
            licenseNumber: driverData.licenseNumber || 'N/A',
            licenseExpiry: driverData.licenseExpiry || 'N/A',
            licenseImageUrl: driverData.licenseImageUrl || '',
            profileImageUrl: driverData.profileImageUrl || '',
            experience: driverData.yearsOfExperience || '0',
            emergencyContactName: driverData.emergencyContactName || 'N/A',
            emergencyContactPhone: driverData.emergencyContactPhone || 'N/A',
            rating: driverData.rating || 0,
            reviews: driverData.reviews || [],
            status: driverData.status || 'pending',
            isApproved: driverData.isApproved || false,
            dateOfBirth: driverData.dateOfBirth || 'N/A',
            vehicleType: driverData.vehicleType || 'N/A',
            createdAt: driverData.createdAt ? new Date(driverData.createdAt.toDate()).toLocaleDateString() : 'N/A'
          });

          // Fetch vehicles
          const vehiclesQuery = query(
            collection(db, 'vehicles'),
            where('driverId', '==', driverId)
          );
          const vehiclesSnapshot = await getDocs(vehiclesQuery);
          const vehiclesList = vehiclesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setVehicles(vehiclesList);

          // Update average rating from the reviews array
          if (driverData.reviews && driverData.reviews.length > 0) {
            const total = driverData.reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
            setAverageRating((total / driverData.reviews.length).toFixed(1));
          }

          // Set feedbacks from reviews array
          if (driverData.reviews) {
            setFeedbacks(driverData.reviews.map((review, index) => ({
              id: index,
              rating: review.rating,
              feedback: review.feedback,
              createdAt: review.createdAt,
              sentiment: review.sentiment,
              sentimentScore: review.sentimentScore,
              normalizedRating: review.normalizedRating
            })));
          }
        } else {
          console.log('No driver found with ID:', driverId);
          setError('Driver not found. Please check the driver ID and try again.');
        }
      } catch (error) {
        console.error('Error fetching driver details:', error);
        setError('Failed to load driver details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDriverDetails();
  }, [driverId]);

  const handleFeedbackSubmit = async (driverId, rating, feedback, sentimentResult) => {
    try {
      // Save feedback to Firestore
      await addDoc(collection(db, 'feedback'), {
        driverId,
        rating,
        feedback,
        userId: currentUser?.uid || 'anonymous',
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        normalizedRating: sentimentResult.normalizedRating,
        createdAt: new Date(),
      });

      // Update driver's rating in Firestore
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      if (driverDoc.exists()) {
        const driverData = driverDoc.data();
        const currentRating = driverData.rating || 0;
        const currentReviews = driverData.reviews || [];
        
        const newRating = ((currentRating * currentReviews.length) + rating) / (currentReviews.length + 1);
        
        await updateDoc(doc(db, 'drivers', driverId), {
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
        setDriver(prev => ({
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
      <div className="loading">
        <h2>Loading driver details...</h2>
        <p>Please wait while we fetch the information.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="error">
        <h2>Driver Not Found</h2>
        <p>The requested driver could not be found.</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="driver-details-container">
      <div className="driver-profile">
        <div className="profile-header">
          <div className="profile-image">
            {driver.profileImageUrl ? (
              <img src={driver.profileImageUrl} alt={driver.name} />
            ) : (
              <FaUser className="user-icon" />
            )}
          </div>
          <div className="profile-info">
            <h1>{driver.name}</h1>
            <div className={`status-badge ${driver.isApproved ? 'approved' : 'pending'}`}>
              {driver.isApproved ? 'Approved' : 'Pending Approval'}
            </div>
            <div className="rating">
              <FaStar className="star-icon" />
              <span>{driver.rating || '0.0'}</span>
              <span className="review-count">({driver.reviews ? driver.reviews.length : 0} reviews)</span>
            </div>
          </div>
        </div>

        <div className="profile-sections">
          <div className="contact-info">
            <h2>Contact Information</h2>
            <div className="contact-item">
              <FaPhone className="contact-icon" />
              <div className="contact-details">
                <span>{driver.phone}</span>
                {driver.phone && (
                  <a 
                    href={`https://wa.me/${driver.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-link"
                  >
                    <FaWhatsapp className="whatsapp-icon" />
                    Chat with driver on WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
              <span>{driver.email}</span>
            </div>
            <div className="contact-item">
              <FaMapMarkerAlt className="contact-icon" />
              <span>{driver.address}, {driver.city}{driver.state ? `, ${driver.state}` : ''} - {driver.zipCode}</span>
            </div>
          </div>

          <div className="driver-info-section">
            <h2>Driver Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">License Number</span>
                <span className="info-value">{driver.licenseNumber}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Experience</span>
                <span className="info-value">{driver.experience} years</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date of Birth</span>
                <span className="info-value">{driver.dateOfBirth || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member Since</span>
                <span className="info-value">{driver.createdAt}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Emergency Contact</span>
                <span className="info-value">{driver.emergencyContactName}</span>
                <span className="info-value">{driver.emergencyContactPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="driver-vehicles">
        <h2>Available Vehicles</h2>
        {vehicles.length > 0 ? (
          <div className="vehicles-grid">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="vehicle-card">
                <div className="vehicle-image-container">
                <img 
                    src={vehicle.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="vehicle-image"
                />
                </div>
                <div className="vehicle-info">
                  <h3>{vehicle.make} {vehicle.model}</h3>
                  <p className="vehicle-year">{vehicle.year}</p>
                  <p className="vehicle-price">${vehicle.pricePerDay || "50"}/day</p>
                  <div className="vehicle-features">
                    <span>{vehicle.seatingCapacity || "4"} seats</span>
                    <span>{vehicle.transmission || 'Automatic'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-vehicles">No vehicles available</p>
        )}
      </div>

      <div className="feedback-section">
        <h2>Customer Reviews</h2>
        {feedbacks.length > 0 ? (
          <div className="feedbacks-list">
            {feedbacks.map(feedback => (
              <div key={feedback.id} className="feedback-card">
                <div className="feedback-header">
                  <div className="feedback-stars">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i} 
                        className={i < feedback.rating ? "star-filled" : "star-empty"} 
                      />
                    ))}
                  </div>
                  <div className="feedback-date">
                    {feedback.createdAt ? new Date(feedback.createdAt.toDate()).toLocaleDateString() : 'Unknown date'}
                  </div>
                </div>
                <div className="feedback-text">
                  {feedback.feedback || "No comment provided"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-feedbacks">No reviews yet</p>
        )}
      </div>

      <div className="rate-driver-section">
        <h2>Rate This Driver</h2>
        <FeedbackForm 
          driverId={driverId}
          onFeedbackSubmit={handleFeedbackSubmit}
        />
      </div>
    </div>
  );
};

export default DriverDetails; 