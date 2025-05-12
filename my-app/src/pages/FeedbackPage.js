import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FaStar, FaUser } from 'react-icons/fa';
import '../styles/FeedbackPage.css';

const FeedbackPage = () => {
  const { vehicleId } = useParams();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const feedbacksQuery = query(
          collection(db, 'feedback'),
          where('vehicleId', '==', vehicleId),
          orderBy('createdAt', 'desc')
        );
        
        const feedbacksSnapshot = await getDocs(feedbacksQuery);
        const feedbacksList = feedbacksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setFeedbacks(feedbacksList);
        
        // Calculate average rating
        if (feedbacksList.length > 0) {
          const total = feedbacksList.reduce((sum, feedback) => sum + feedback.rating, 0);
          setAverageRating((total / feedbacksList.length).toFixed(1));
          setTotalReviews(feedbacksList.length);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching feedbacks:', error);
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [vehicleId]);

  if (loading) {
    return <div className="loading">Loading feedbacks...</div>;
  }

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <h1>Customer Reviews</h1>
        <div className="rating-summary">
          <div className="average-rating">
            <span className="rating-number">{averageRating}</span>
            <div className="stars">
              {[...Array(5)].map((_, index) => (
                <FaStar
                  key={index}
                  className="star-icon"
                  color={index < Math.floor(averageRating) ? "#ffc107" : "#e4e5e9"}
                />
              ))}
            </div>
          </div>
          <p className="total-reviews">{totalReviews} reviews</p>
        </div>
      </div>

      <div className="feedbacks-list">
        {feedbacks.length > 0 ? (
          feedbacks.map(feedback => (
            <div key={feedback.id} className="feedback-card">
              <div className="feedback-header">
                <div className="user-avatar">
                  <FaUser className="user-icon" />
                </div>
                <div className="feedback-meta">
                  <div className="rating">
                    {[...Array(5)].map((_, index) => (
                      <FaStar
                        key={index}
                        className="star-icon"
                        color={index < feedback.rating ? "#ffc107" : "#e4e5e9"}
                      />
                    ))}
                  </div>
                  <span className="date">
                    {new Date(feedback.createdAt.toDate()).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="feedback-content">
                <p>{feedback.feedback}</p>
              </div>
              <div className="sentiment-indicator">
                <span className={`sentiment-badge ${feedback.sentiment > 0 ? 'positive' : feedback.sentiment < 0 ? 'negative' : 'neutral'}`}>
                  {feedback.sentiment > 0 ? 'Positive' : feedback.sentiment < 0 ? 'Negative' : 'Neutral'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-feedbacks">
            <p>No reviews yet. Be the first to review!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage; 