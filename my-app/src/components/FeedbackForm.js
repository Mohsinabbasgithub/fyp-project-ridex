import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { analyzeSentiment } from '../utils/sentiment';
import '../styles/FeedbackForm.css';

const FeedbackForm = ({ vehicleId, driverId, onFeedbackSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/login', { 
      state: { 
        returnUrl: window.location.pathname,
        message: 'Please log in to submit your review' 
      } 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!currentUser) {
      setError('Please log in to submit a review');
      setTimeout(() => {
        handleLoginRedirect();
      }, 2000);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Analyze sentiment of the feedback
      const sentimentResult = analyzeSentiment(feedback);
      
      const reviewData = {
        rating,
        feedback,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        normalizedRating: sentimentResult.normalizedRating,
        createdAt: serverTimestamp()
      };

      if (vehicleId) {
        // Save vehicle feedback
        await addDoc(collection(db, 'feedback'), {
          ...reviewData,
          vehicleId,
          type: 'vehicle'
        });

        // Update vehicle's rating
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        
        if (vehicleDoc.exists()) {
          const vehicleData = vehicleDoc.data();
          const currentReviews = vehicleData.reviews || [];
          const newReview = {
            ...reviewData,
            id: currentReviews.length + 1
          };
          
          // Calculate new average rating
          const totalRating = currentReviews.reduce((sum, review) => sum + (review.rating || 0), 0) + rating;
          const newRating = totalRating / (currentReviews.length + 1);
          
          await updateDoc(vehicleRef, {
            rating: newRating,
            reviews: [...currentReviews, newReview],
            lastUpdated: serverTimestamp()
          });
        }
      } else if (driverId) {
        // Save driver feedback
        await addDoc(collection(db, 'feedback'), {
          ...reviewData,
          driverId,
          type: 'driver'
        });

        // Update driver's rating
        const driverRef = doc(db, 'drivers', driverId);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          const currentReviews = driverData.reviews || [];
          const newReview = {
            ...reviewData,
            id: currentReviews.length + 1
          };
          
          // Calculate new average rating
          const totalRating = currentReviews.reduce((sum, review) => sum + (review.rating || 0), 0) + rating;
          const newRating = totalRating / (currentReviews.length + 1);
          
          await updateDoc(driverRef, {
            rating: newRating,
            reviews: [...currentReviews, newReview],
            lastUpdated: serverTimestamp()
          });
        }
      }
      
      setIsSuccess(true);
      setRating(0);
      setFeedback('');
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="feedback-form-container">
      <h3>Write a Review</h3>
      <p className="form-description">Share your experience with others</p>
      
      <form onSubmit={handleSubmit}>
        <div className="rating-container">
          {[...Array(5)].map((_, index) => {
            const ratingValue = index + 1;
            return (
              <button
                type="button"
                key={ratingValue}
                className={ratingValue <= (hover || rating) ? "star-btn on" : "star-btn off"}
                onClick={() => {
                  if (!currentUser) {
                    setError('Please log in to submit a review');
                    setTimeout(() => {
                      handleLoginRedirect();
                    }, 2000);
                    return;
                  }
                  setRating(ratingValue);
                }}
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(rating)}
                aria-label={`Rate ${ratingValue} stars`}
              >
                <span className="star">★</span>
              </button>
            );
          })}
        </div>
        
        <div className="feedback-input">
          <textarea
            value={feedback}
            onChange={(e) => {
              if (!currentUser) {
                setError('Please log in to submit a review');
                setTimeout(() => {
                  handleLoginRedirect();
                }, 2000);
                return;
              }
              setFeedback(e.target.value);
            }}
            placeholder={currentUser ? "Tell others about your experience (optional)" : "Please log in to write a review"}
            rows="4"
            maxLength="500"
            disabled={!currentUser}
          />
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span>
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          className="submit-btn"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? 'Submitting...' : currentUser ? 'Submit Review' : 'Login to Review'}
        </button>

        {isSuccess && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            Thank you for your review!
          </div>
        )}
      </form>
    </div>
  );
};

export default FeedbackForm; 