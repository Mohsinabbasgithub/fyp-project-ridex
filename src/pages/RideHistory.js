import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FaMapMarkerAlt, FaClock, FaDollarSign, FaStar, FaFilter, FaSort, FaCalendar, FaCar, FaUser, FaPhone } from 'react-icons/fa';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { defaultMapOptions, defaultCenter, mapContainerStyle } from '../utils/googleMapsConfig';
import '../styles/RideHistory.css';

const RideHistory = () => {
  const { currentUser, userRole } = useAuth();
  const { isLoaded } = useGoogleMaps();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, cancelled, in-progress
  const [sortBy, setSortBy] = useState('date'); // date, price, distance
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [selectedRide, setSelectedRide] = useState(null);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalDistance: 0
  });
  const [feedbackAverage, setFeedbackAverage] = useState(0);

  // Live ride history updates
  useEffect(() => {
    if (!currentUser) return;

    try {
      const bookingsRef = collection(db, 'bookings');
      const q = userRole === 'driver'
        ? query(bookingsRef, where('driverId', '==', currentUser.uid))
        : query(bookingsRef, where('userId', '==', currentUser.uid));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ridesData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || (a.createdAt ? new Date(a.createdAt) : 0);
            const bDate = b.createdAt?.toDate?.() || (b.createdAt ? new Date(b.createdAt) : 0);
            return bDate - aDate;
          });
        setRides(ridesData);
        calculateStats(ridesData);
        setLoading(false);
      }, (error) => {
        console.error('Ride history listener error:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting ride history listener:', error);
      setLoading(false);
    }
  }, [currentUser, userRole]);

  // Fallback rating source: live average from feedback collection
  useEffect(() => {
    if (!currentUser) return;
    try {
      const feedbackRef = collection(db, 'feedback');
      const q = userRole === 'driver'
        ? query(feedbackRef, where('driverId', '==', currentUser.uid))
        : query(feedbackRef, where('userId', '==', currentUser.uid));

      const unsub = onSnapshot(q, (snap) => {
        const ratings = snap.docs.map(d => d.data()?.rating || 0).filter(r => typeof r === 'number' && r > 0);
        const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
        setFeedbackAverage(avg);
      }, (error) => {
        console.error('Feedback listener error:', error);
        setFeedbackAverage(0);
      });

      return () => unsub();
    } catch (e) {
      console.error('Error setting feedback listener:', e);
      setFeedbackAverage(0);
    }
  }, [currentUser, userRole]);

  // Recalculate stats whenever feedbackAverage updates to reflect latest ratings
  // from the feedback collection (useful for drivers where bookings may lack ratings)
  useEffect(() => {
    if (!currentUser) return;
    calculateStats(rides);
  }, [feedbackAverage]);

  const calculateStats = (ridesData) => {
    const completedRides = ridesData.filter(ride => ride.status === 'completed');
    const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.finalPrice ?? ride.userProposedPrice ?? ride.estimatedPrice ?? 0), 0);
    const totalDistance = completedRides.reduce((sum, ride) => sum + (ride.distance || ride.estimatedDistance || 0), 0);
    // derive rating from embedded reviews if ride.userRating not present
    const ratingPerRide = completedRides.map(ride => {
      if (ride.userRating) return ride.userRating;
      if (Array.isArray(ride.reviews) && ride.reviews.length > 0) {
        const total = ride.reviews.reduce((s, r) => s + (r.rating || 0), 0);
        return total / ride.reviews.length;
      }
      return 0;
    });
    const nonZeroRatings = ratingPerRide.filter(r => r > 0);
    let averageRating = nonZeroRatings.length > 0
      ? nonZeroRatings.reduce((s, r) => s + r, 0) / nonZeroRatings.length
      : 0;

    // If bookings don't carry ratings yet (legacy rides), fallback to feedback average
    if (!averageRating || Number.isNaN(averageRating)) {
      averageRating = feedbackAverage || 0;
    }

    setStats({
      totalRides: ridesData.length,
      totalEarnings,
      averageRating,
      totalDistance
    });
  };

  const filteredAndSortedRides = rides
    .filter(ride => {
      if (filter === 'all') return true;
      return ride.status === filter;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'date':
          aValue = a.createdAt?.toDate?.() || (a.createdAt ? new Date(a.createdAt) : 0);
          bValue = b.createdAt?.toDate?.() || (b.createdAt ? new Date(b.createdAt) : 0);
          break;
        case 'price':
          aValue = a.finalPrice || 0;
          bValue = b.finalPrice || 0;
          break;
        case 'distance':
          aValue = a.distance || 0;
          bValue = b.distance || 0;
          break;
        default:
          aValue = a.createdAt?.toDate?.() || new Date(a.createdAt);
          bValue = b.createdAt?.toDate?.() || new Date(b.createdAt);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'in-progress':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'in-progress':
        return 'In Progress';
      case 'confirmed':
        return 'Confirmed';
      case 'driver-selected':
        return 'Driver Selected';
      default:
        return status;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="ride-history-loading">
        <h2>Loading ride history...</h2>
      </div>
    );
  }

  return (
    <div className="ride-history-container">
      <div className="ride-history-header">
        <h1>Ride History</h1>
        <p>Track your ride history and performance</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaCar />
          </div>
          <div className="stat-content">
            <h3>{stats.totalRides}</h3>
            <p>Total Rides</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaDollarSign />
          </div>
          <div className="stat-content">
            <h3>${stats.totalEarnings.toFixed(2)}</h3>
            <p>Total {userRole === 'driver' ? 'Earnings' : 'Spent'}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaStar />
          </div>
          <div className="stat-content">
            <h3>{stats.averageRating.toFixed(1)}</h3>
            <p>Average Rating</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FaMapMarkerAlt />
          </div>
          <div className="stat-content">
            <h3>{stats.totalDistance.toFixed(1)} km</h3>
            <p>Total Distance</p>
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Rides</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="in-progress">In Progress</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Date</option>
            <option value="price">Price</option>
            <option value="distance">Distance</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Order:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Rides List */}
      <div className="rides-list">
        {filteredAndSortedRides.length > 0 ? (
          filteredAndSortedRides.map(ride => (
            <div 
              key={ride.id} 
              className={`ride-card ${selectedRide?.id === ride.id ? 'selected' : ''}`}
              onClick={() => setSelectedRide(selectedRide?.id === ride.id ? null : ride)}
            >
              <div className="ride-header">
                <div className="ride-info">
                  <h3>Ride #{ride.id.slice(-6)}</h3>
                  <span className={`status-badge ${getStatusColor(ride.status)}`}>
                    {getStatusText(ride.status)}
                  </span>
                </div>
                <div className="ride-date">
                  <FaCalendar />
                  <span>{formatDate(ride.createdAt)}</span>
                </div>
              </div>

              <div className="ride-route">
                <div className="route-point">
                  <FaMapMarkerAlt className="pickup" />
                  <span>{ride.pickupLocation}</span>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                  <FaMapMarkerAlt className="destination" />
                  <span>{ride.destination}</span>
                </div>
              </div>

              <div className="ride-details">
                <div className="detail-item">
                  <FaDollarSign />
                  <span>${ride.finalPrice || ride.estimatedPrice || 0}</span>
                </div>
                <div className="detail-item">
                  <FaClock />
                  <span>{formatDuration(ride.actualDuration || ride.estimatedTime)}</span>
                </div>
                {ride.distance && (
                  <div className="detail-item">
                    <FaMapMarkerAlt />
                    <span>{ride.distance.toFixed(1)} km</span>
                  </div>
                )}
                {ride.userRating && (
                  <div className="detail-item">
                    <FaStar />
                    <span>{ride.userRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {userRole === 'user' && ride.driverName && (
                <div className="driver-info">
                  <FaUser />
                  <span>{ride.driverName}</span>
                  {ride.driverPhone && (
                    <>
                      <FaPhone />
                      <span>{ride.driverPhone}</span>
                    </>
                  )}
                </div>
              )}

              {userRole === 'driver' && ride.userEmail && (
                <div className="user-info">
                  <FaUser />
                  <span>{ride.userEmail}</span>
                </div>
              )}

              {/* Expanded Ride Details */}
              {selectedRide?.id === ride.id && (
                <div className="ride-expanded">
                  <div className="expanded-details">
                    <h4>Ride Details</h4>
                    <div className="detail-grid">
                      <div className="detail-row">
                        <span>Ride Type:</span>
                        <span>{ride.rideType || 'Standard'}</span>
                      </div>
                      <div className="detail-row">
                        <span>Payment Method:</span>
                        <span>{ride.paymentMethod || 'Card'}</span>
                      </div>
                      {ride.startTime && (
                        <div className="detail-row">
                          <span>Start Time:</span>
                          <span>{formatDate(ride.startTime)}</span>
                        </div>
                      )}
                      {ride.endTime && (
                        <div className="detail-row">
                          <span>End Time:</span>
                          <span>{formatDate(ride.endTime)}</span>
                        </div>
                      )}
                      {ride.biddingHistory && ride.biddingHistory.length > 0 && (
                        <div className="detail-row">
                          <span>Bidding History:</span>
                          <span>{ride.biddingHistory.length} offers</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Map for completed rides */}
                  {ride.status === 'completed' && isLoaded && (
                    <div className="ride-map">
                      <h4>Ride Route</h4>
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '200px', borderRadius: '8px' }}
                        center={{ lat: 20.5937, lng: 78.9629 }}
                        zoom={10}
                      >
                        {ride.pickupLocation && (
                          <Marker
                            position={{ lat: 20.5937, lng: 78.9629 }}
                            label="Pickup"
                          />
                        )}
                        {ride.destination && (
                          <Marker
                            position={{ lat: 20.5937 + 0.01, lng: 78.9629 + 0.01 }}
                            label="Destination"
                          />
                        )}
                      </GoogleMap>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-rides">
            <FaCar className="no-rides-icon" />
            <h3>No rides found</h3>
            <p>Your ride history will appear here once you complete your first ride.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistory;
