import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { FaStar } from 'react-icons/fa';
import '../styles/FeedbackPage.css';

const StarRow = ({ value = 0 }) => (
  <div className="stars">
    {[...Array(5)].map((_, i) => (
      <FaStar key={i} className="star-icon" color={i < Math.round(value) ? '#ffc107' : '#e4e5e9'} />
    ))}
  </div>
);

const SentimentBadge = ({ sentiment }) => {
  const cls = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : 'neutral';
  const text = sentiment === 'positive' ? 'Positive' : sentiment === 'negative' ? 'Negative' : 'Neutral';
  return <span className={`sentiment-badge ${cls}`}>{text}</span>;
};

const AllReviews = () => {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [userNames, setUserNames] = useState({}); // uid -> displayName

  const header = useMemo(() => {
    return 'All Reviews';
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const base = collection(db, 'feedback');
        // Show all reviews (both driver and vehicle); sort client-side by createdAt desc
        const q = query(base);
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
          const bDate = b.createdAt?.toDate?.() ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
          return bDate - aDate;
        });
        setReviews(list);

        // Fetch names for all unique userIds present
        const uniqueUids = [...new Set(list.map(r => r.userId).filter(Boolean))];
        const nameMap = {};
        await Promise.all(uniqueUids.map(async (uid) => {
          try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              nameMap[uid] = data.name || data.fullName || data.displayName || null;
            }
          } catch (_) { /* ignore */ }
        }));
        setUserNames(nameMap);
      } catch (e) {
        console.error(e);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <h1>{header}</h1>
      </div>

      {loading && <div className="loading">Loading reviews...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <div className="feedbacks-list">
          {reviews.length === 0 ? (
            <div className="no-feedbacks">
              <p>No reviews yet.</p>
            </div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="feedback-card">
                <div className="feedback-header">
                  <div className="feedback-meta" style={{ width: '100%' }}>
                    <div className="review-top-row">
                      <span className="reviewer-name">
                        {userNames[r.userId] || (r.userEmail ? r.userEmail.split('@')[0] : 'Customer')}
                      </span>
                      <span className="rating-chip"><FaStar /> {Number(r.rating || 0).toFixed(1)}</span>
                    </div>
                    <StarRow value={r.rating} />
                    <span className="date">
                      {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleString() : ''}
                    </span>
                  </div>
                  <SentimentBadge sentiment={r.sentiment} />
                </div>
                <div className="feedback-content">
                  <p>{r.feedback || '(No comment)'}</p>
                </div>
                <div className="feedback-footer" style={{ display: 'flex', gap: 12, fontSize: 14, color: '#555' }}>
                  {r.type === 'driver' && r.driverId && (
                    <>
                      <span>Type: Driver</span>
                      <Link to={`/driver/${r.driverId}`}>View Driver</Link>
                    </>
                  )}
                  {r.type === 'vehicle' && r.vehicleId && (
                    <>
                      <span>Type: Vehicle</span>
                      <Link to={`/vehicle/${r.vehicleId}`}>View Vehicle</Link>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AllReviews;
