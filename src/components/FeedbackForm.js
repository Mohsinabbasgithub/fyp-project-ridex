import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { analyzeSentiment } from '../utils/sentiment';
import '../styles/FeedbackForm.css';

const FeedbackForm = ({ vehicleId, driverId, bookingId, onFeedbackSubmit, hideStars = false }) => {
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

    // Require either a manual star rating (if shown) or some feedback text to infer rating
    if ((!hideStars && rating === 0 && !feedback.trim()) || (hideStars && !feedback.trim())) {
      setError('Please select a rating or write feedback');
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
      // Analyze sentiment of the feedback (used for sentiment fields and auto-rating fallback)
      const sentimentResult = analyzeSentiment(feedback || '');

      // If stars are hidden, always use sentiment-only rating; otherwise fallback
      const finalRating = hideStars ? sentimentResult.normalizedRating : (rating || sentimentResult.normalizedRating);

      const reviewData = {
        rating: finalRating,
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
          bookingId: bookingId || null,
          type: 'vehicle'
        });
        // Best-effort: update vehicle doc aggregate (rules allow write for vehicles)
        try {
          const vehicleRef = doc(db, 'vehicles', vehicleId);
          const vehicleDoc = await getDoc(vehicleRef);
          if (vehicleDoc.exists()) {
            const vehicleData = vehicleDoc.data();
            const currentReviews = vehicleData.reviews || [];
            const newReview = { ...reviewData, id: currentReviews.length + 1 };
            const totalRating = currentReviews.reduce((sum, review) => sum + (review.rating || 0), 0) + finalRating;
            const newRating = totalRating / (currentReviews.length + 1);
            await updateDoc(vehicleRef, {
              rating: newRating,
              reviews: [...currentReviews, newReview],
              lastUpdated: serverTimestamp()
            });
          }
        } catch (aggErr) {
          console.warn('Vehicle aggregate update skipped:', aggErr?.message || aggErr);
        }
      }

      if (driverId) {
        // Save driver feedback
        await addDoc(collection(db, 'feedback'), {
          ...reviewData,
          driverId,
          bookingId: bookingId || null,
          type: 'driver'
        });
        // DO NOT update driver doc aggregates here: Firestore rules restrict users from updating drivers/*
        // Aggregation for drivers should be performed by backend (Cloud Function) or on-read in UI.
      }

      // Also update the related booking with the user's rating and feedback so RideHistory can show it
      if (bookingId) {
        try {
          const bookingRef = doc(db, 'bookings', bookingId);
          await updateDoc(bookingRef, {
            userRating: finalRating,
            userFeedback: feedback || '',
            userSentiment: sentimentResult.sentiment,
            userSentimentScore: sentimentResult.score,
            userNormalizedRating: sentimentResult.normalizedRating,
            feedbackAt: serverTimestamp()
          });
        } catch (bookingErr) {
          console.warn('Booking rating update skipped:', bookingErr?.message || bookingErr);
        }
      }
      
      setIsSuccess(true);
      setRating(0);
      setFeedback('');
      setTimeout(() => setIsSuccess(false), 1500);
      if (onFeedbackSubmit) onFeedbackSubmit();
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
        {!hideStars && (
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
        )}
        
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
            placeholder={currentUser ? (hideStars ? "Tell others about your experience (auto-rated by AI)" : "Tell others about your experience (optional)") : "Please log in to write a review"}
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
          disabled={isSubmitting || (!currentUser) || ((!hideStars && rating === 0 && !feedback.trim()) || (hideStars && !feedback.trim()))}
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