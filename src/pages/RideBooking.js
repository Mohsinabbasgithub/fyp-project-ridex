import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { FaMapMarkerAlt, FaCar, FaClock, FaUser, FaPhone, FaStar, FaLocationArrow, FaDollarSign, FaHandshake } from 'react-icons/fa';
import '../styles/RideBooking.css';
import LiveMap from '../components/LiveMap';
import InAppChat from '../components/InAppChat';
import { createRideNotification } from '../components/NotificationSystem';
import FeedbackForm from '../components/FeedbackForm';

const RideBooking = () => {
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState({
    pickupLocation: '',
    destination: '',
    rideType: 'standard',
    paymentMethod: 'card'
  });
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('searching'); // searching, bidding, driver-selected, confirmed, in-progress, completed
  const [currentBooking, setCurrentBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  
  // Bidding system states
  const [userProposedPrice, setUserProposedPrice] = useState(0);
  const [biddingStatus, setBiddingStatus] = useState('none'); // none, waiting, accepted, rejected, counter-offer
  const [driverCounterOffer, setDriverCounterOffer] = useState(0);
  const [biddingHistory, setBiddingHistory] = useState([]);
  const [chatClosed, setChatClosed] = useState(false);

  const rideTypes = [
    { id: 'standard', name: 'Standard', price: 1, icon: '🚗' },
    { id: 'premium', name: 'Premium', price: 1.5, icon: '🚙' },
    { id: 'luxury', name: 'Luxury', price: 2, icon: '🏎️' },
    { id: 'suv', name: 'SUV', price: 1.8, icon: '🚐' }
  ];

  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // Calculate estimated price and time
  useEffect(() => {
    if (bookingData.pickupLocation && bookingData.destination) {
      // Simulate distance calculation (in real app, use Google Maps API)
      const distance = Math.random() * 20 + 5; // 5-25 km
      // PKR-based pricing (configurable via env)
      const basePrice = parseFloat(process.env.REACT_APP_BASE_FARE_PKR || '250'); // Base fare in PKR
      const pricePerKm = parseFloat(process.env.REACT_APP_PRICE_PER_KM_PKR || '120'); // Price per kilometer in PKR
      const selectedRideType = rideTypes.find(rt => rt.id === bookingData.rideType);
      
      const totalPrice = (basePrice + (distance * pricePerKm)) * selectedRideType.price;
      const timeMinutes = Math.round(distance * 2 + Math.random() * 10); // 2 min per km + random traffic
      
      setEstimatedPrice(totalPrice.toFixed(2));
      setEstimatedTime(timeMinutes);
      setEstimatedDistance(parseFloat(distance.toFixed(1)));
      
      // Set initial proposed price to estimated price
      if (userProposedPrice === 0) {
        setUserProposedPrice(parseFloat(totalPrice.toFixed(2)));
      }
    }
  }, [bookingData.pickupLocation, bookingData.destination, bookingData.rideType]);

  // Fetch available drivers
  useEffect(() => {
    if (bookingStatus === 'searching' || bookingStatus === 'bidding') {
      const fetchAvailableDrivers = async () => {
        try {
          const driversRef = collection(db, 'drivers');
          const q = query(driversRef, where('isOnline', '==', true), where('isAvailable', '==', true));
          const querySnapshot = await getDocs(q);
          
          const drivers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Enrich drivers with computed rating and overall sentiment from feedback collection
          const enriched = await Promise.all(
            drivers.map(async (d) => {
              try {
                const fbQ = query(collection(db, 'feedback'), where('driverId', '==', d.id));
                const fbSnap = await getDocs(fbQ);
                if (fbSnap.empty) {
                  const baseAvg = d.rating || 0;
                  const overallSentiment = baseAvg >= 3.5 ? 'positive' : baseAvg >= 2.5 ? 'neutral' : 'negative';
                  return { ...d, rating: baseAvg, overallSentiment };
                }
                let sum = 0;
                let count = 0;
                fbSnap.docs.forEach((revDoc) => {
                  const data = revDoc.data();
                  const r = Number(data.rating || data.normalizedRating || 0);
                  sum += r;
                  count += 1;
                });
                const avg = count > 0 ? sum / count : 0;
                const overallSentiment = avg >= 3.5 ? 'positive' : avg >= 2.5 ? 'neutral' : 'negative';
                return { ...d, rating: avg, overallSentiment };
              } catch (_) {
                const baseAvg = d.rating || 0;
                const overallSentiment = baseAvg >= 3.5 ? 'positive' : baseAvg >= 2.5 ? 'neutral' : 'negative';
                return { ...d, rating: baseAvg, overallSentiment };
              }
            })
          );
          setAvailableDrivers(enriched);
        } catch (error) {
          console.error('Error fetching drivers:', error);
        }
      };

      fetchAvailableDrivers();
    }
  }, [bookingStatus]);

  // Listen for booking updates
  useEffect(() => {
    if (currentBooking?.id) {
      console.log('Setting up booking listener for ID:', currentBooking.id);
      
      const unsubscribe = onSnapshot(doc(db, 'bookings', currentBooking.id), (docSnap) => {
        if (docSnap.exists()) {
          const bookingData = docSnap.data();
          console.log('Booking update received:', bookingData);
          console.log('New status:', bookingData.status);
          console.log('Driver ID:', bookingData.driverId);
          
          setCurrentBooking({ id: docSnap.id, ...bookingData });
          setBookingStatus(bookingData.status);
          
          // Update bidding status
          if (bookingData.biddingStatus) {
            setBiddingStatus(bookingData.biddingStatus);
            setDriverCounterOffer(bookingData.driverCounterOffer || 0);
            setBiddingHistory(bookingData.biddingHistory || []);
          }

          // If a driver has accepted from their side, auto-select the driver for user flow
          if (!selectedDriver && bookingData.driverId && bookingData.driverName && bookingData.status === 'driver-selected') {
            (async () => {
              try {
                // Fetch driver doc for additional fields
                const driverRef = doc(db, 'drivers', bookingData.driverId);
                const driverDoc = await getDoc(driverRef);
                const base = driverDoc.exists() ? { id: driverDoc.id, ...driverDoc.data() } : { id: bookingData.driverId };
                // Compute rating from feedback
                const fbQ = query(collection(db, 'feedback'), where('driverId', '==', bookingData.driverId));
                const fbSnap = await getDocs(fbQ);
                let avg = 0; let count = 0;
                fbSnap.docs.forEach((revDoc) => {
                  const data = revDoc.data();
                  const r = Number(data.rating || data.normalizedRating || 0);
                  avg += r; count += 1;
                });
                avg = count > 0 ? avg / count : (base.rating || 0);
                const overallSentiment = avg >= 3.5 ? 'positive' : avg >= 2.5 ? 'neutral' : 'negative';
                setSelectedDriver({
                  ...base,
                  fullName: bookingData.driverName,
                  phone: bookingData.driverPhone || base.phone || '',
                  rating: avg,
                  overallSentiment
                });
              } catch (e) {
                setSelectedDriver({
                  id: bookingData.driverId,
                  fullName: bookingData.driverName,
                  phone: bookingData.driverPhone || ''
                });
              }
            })();
          }
        } else {
          console.log('Booking document does not exist');
        }
      }, (error) => {
        console.error('Error listening to booking updates:', error);
      });

      return () => {
        console.log('Cleaning up booking listener');
        unsubscribe();
      };
    }
  }, [currentBooking?.id]);

  // Listen for driver location updates when ride is confirmed or in-progress
  useEffect(() => {
    if ((bookingStatus === 'confirmed' || bookingStatus === 'in-progress') && currentBooking?.driverId) {
      const driverRef = doc(db, 'drivers', currentBooking.driverId);
      const unsubscribe = onSnapshot(driverRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.location) setDriverLocation(data.location);
        }
      });
      return () => unsubscribe();
    }
  }, [bookingStatus, currentBooking?.driverId]);

  // Update user location in Firestore during active ride
  useEffect(() => {
    let watchId;
    if (bookingStatus === 'confirmed' || bookingStatus === 'in-progress') {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            if (currentBooking?.id) {
              updateDoc(doc(db, 'bookings', currentBooking.id), { userLocation: loc });
            }
          },
          (err) => {},
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      }
    }
    return () => {
      if (watchId && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    };
  }, [bookingStatus, currentBooking?.id]);

  // Listen for user location updates from Firestore (for driver marker)
  useEffect(() => {
    if ((bookingStatus === 'confirmed' || bookingStatus === 'in-progress') && currentBooking?.id) {
      const bookingRef = doc(db, 'bookings', currentBooking.id);
      const unsubscribe = onSnapshot(bookingRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userLocation) setUserLocation(data.userLocation);
        }
      });
      return () => unsubscribe();
    }
  }, [bookingStatus, currentBooking?.id]);

  // Show feedback on completion instead of auto-navigating away.
  // Navigation to confirmation will happen after feedback submission.
  // This avoids hiding the feedback option right after ride completion.
  // (See Feedback section below and onFeedbackSubmit navigate call.)

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearchDrivers = async () => {
    if (!bookingData.pickupLocation || !bookingData.destination) {
      alert('Please enter pickup and destination locations');
      return;
    }

    if (userProposedPrice <= 0) {
      alert('Please enter a valid proposed price');
      return;
    }

    setLoading(true);
    setBookingStatus('bidding');

    try {
      // Create booking in Firestore with bidding information
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        pickupLocation: bookingData.pickupLocation,
        destination: bookingData.destination,
        rideType: bookingData.rideType,
        paymentMethod: bookingData.paymentMethod,
        estimatedPrice: parseFloat(estimatedPrice),
        userProposedPrice: parseFloat(userProposedPrice),
        estimatedTime: estimatedTime,
        estimatedDistance: estimatedDistance,
        status: 'bidding',
        biddingStatus: 'waiting',
        biddingHistory: [{
          type: 'user_proposal',
          price: parseFloat(userProposedPrice),
          timestamp: new Date(),
          userId: auth.currentUser?.uid
        }],
        createdAt: new Date(),
        driverId: null,
        driverName: null,
        driverPhone: null
      });

      setCurrentBooking({ 
        id: bookingRef.id,
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        pickupLocation: bookingData.pickupLocation,
        destination: bookingData.destination,
        rideType: bookingData.rideType,
        paymentMethod: bookingData.paymentMethod,
        estimatedPrice: parseFloat(estimatedPrice),
        userProposedPrice: parseFloat(userProposedPrice),
        estimatedTime: estimatedTime,
        estimatedDistance: estimatedDistance,
        status: 'bidding',
        biddingStatus: 'waiting',
        biddingHistory: [{
          type: 'user_proposal',
          price: parseFloat(userProposedPrice),
          timestamp: new Date(),
          userId: auth.currentUser?.uid
        }],
        createdAt: new Date(),
        driverId: null,
        driverName: null,
        driverPhone: null
      });
      
      // Create notification
      await createRideNotification(auth.currentUser?.uid, bookingRef.id, 'ride_requested');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCounterOffer = async () => {
    try {
      const finalPrice = driverCounterOffer || userProposedPrice;
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        status: 'driver-selected',
        biddingStatus: 'accepted',
        finalPrice: finalPrice,
        biddingHistory: [
          ...biddingHistory,
          {
            type: 'user_acceptance',
            price: finalPrice,
            timestamp: new Date(),
            userId: auth.currentUser?.uid
          }
        ]
      });
      setBookingStatus('driver-selected');
      setBiddingStatus('accepted');
      
      // Create notification
      await createRideNotification(auth.currentUser?.uid, currentBooking.id, 'driver_accepted', currentBooking.driverName);
    } catch (error) {
      console.error('Error accepting counter offer:', error);
    }
  };

  const handleRejectCounterOffer = async () => {
    try {
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        biddingStatus: 'rejected',
        biddingHistory: [
          ...biddingHistory,
          {
            type: 'user_rejection',
            price: driverCounterOffer,
            timestamp: new Date(),
            userId: auth.currentUser?.uid
          }
        ]
      });
      setBiddingStatus('rejected');
      setBookingStatus('searching');
    } catch (error) {
      console.error('Error rejecting counter offer:', error);
    }
  };

  const handleSelectDriver = async (driver) => {
    setSelectedDriver(driver);
    setBookingStatus('driver-selected');

    try {
      // Update booking with selected driver
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        driverId: driver.id,
        driverName: driver.fullName,
        driverPhone: driver.phone,
        status: 'driver-selected'
      });

      // Update driver status
      await updateDoc(doc(db, 'drivers', driver.id), {
        isAvailable: false,
        currentBookingId: currentBooking.id
      });
    } catch (error) {
      console.error('Error selecting driver:', error);
    }
  };

  const handleConfirmBooking = async () => {
    try {
      console.log('Confirm booking clicked');
      console.log('Current booking:', currentBooking);
      console.log('Current booking ID:', currentBooking?.id);
      
      if (!currentBooking?.id) {
        console.error('No current booking ID found');
        alert('No booking found to confirm. Please try again.');
        return;
      }

      console.log('Updating booking status to confirmed...');
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        status: 'confirmed'
      });
      
      console.log('Booking status updated successfully');
      setBookingStatus('confirmed');
      
      // Create notification
      console.log('Creating notification...');
      // Notify that driver accepted and ride is moving to confirmed
      await createRideNotification(auth.currentUser?.uid, currentBooking.id, 'driver_accepted', selectedDriver?.fullName);
      console.log('Notification created successfully');
      
      alert('Ride confirmed! Your driver is on the way.');
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert('Failed to confirm booking. Please try again.');
    }
  };

  const handleStartRide = async () => {
    try {
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        status: 'in-progress',
        startTime: new Date()
      });
      setBookingStatus('in-progress');
      
      // Create notification
      await createRideNotification(auth.currentUser?.uid, currentBooking.id, 'ride_started');
    } catch (error) {
      console.error('Error starting ride:', error);
    }
  };

  const handleCompleteRide = async () => {
    try {
      const endTime = new Date();
      const duration = (endTime - currentBooking.startTime?.toDate()) / (1000 * 60); // minutes
      
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        status: 'completed',
        endTime: endTime,
        actualDuration: duration,
        finalPrice: parseFloat(estimatedPrice)
      });

      // Make driver available again
      if (currentBooking.driverId) {
        await updateDoc(doc(db, 'drivers', currentBooking.driverId), {
          isAvailable: true,
          currentBookingId: null
        });
      }

      setBookingStatus('feedback');
      
      // Create notification
      await createRideNotification(auth.currentUser?.uid, currentBooking.id, 'ride_completed');
      // Inform the user and show feedback form
      alert('Your ride is completed! Please take a moment to provide feedback.');
      setBookingStatus('feedback');
    } catch (error) {
      console.error('Error completing ride:', error);
    }
  };

  const handleCancelBooking = async () => {
    try {
      await updateDoc(doc(db, 'bookings', currentBooking.id), {
        status: 'cancelled'
      });

      // Make driver available again
      if (currentBooking.driverId) {
        await updateDoc(doc(db, 'drivers', currentBooking.driverId), {
          isAvailable: true,
          currentBookingId: null
        });
      }

      setBookingStatus('searching');
      setCurrentBooking(null);
      setSelectedDriver(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  return (
    <div className="ride-booking-container">
      <div className="booking-header">
        <h1>Book Your Ride</h1>
        <p>Get a ride in minutes with our reliable drivers</p>
      </div>

      {/* Location Input Section */}
      <div className="location-section">
        <div className="location-input">
          <FaMapMarkerAlt className="location-icon pickup" />
          <input
            type="text"
            placeholder="Enter pickup location"
            value={bookingData.pickupLocation}
            onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
            disabled={bookingStatus !== 'searching'}
          />
        </div>
        <div className="location-input">
          <FaMapMarkerAlt className="location-icon destination" />
          <input
            type="text"
            placeholder="Enter destination"
            value={bookingData.destination}
            onChange={(e) => handleInputChange('destination', e.target.value)}
            disabled={bookingStatus !== 'searching'}
          />
        </div>
      </div>

      {/* Ride Type Selection */}
      <div className="ride-type-section">
        <h3>Choose Your Ride</h3>
        <div className="ride-types">
          {rideTypes.map(rideType => (
            <div
              key={rideType.id}
              className={`ride-type-card ${bookingData.rideType === rideType.id ? 'selected' : ''}`}
              onClick={() => handleInputChange('rideType', rideType.id)}
            >
              <div className="ride-icon">{rideType.icon}</div>
              <div className="ride-info">
                <h4>{rideType.name}</h4>
                <p>{rideType.price}x base fare</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Estimation and Bidding */}
      {estimatedPrice > 0 && (
        <div className="price-estimation">
          <div className="estimation-card">
            <div className="estimation-item">
              <FaClock />
              <span>Estimated Time: {estimatedTime} min</span>
            </div>
            <div className="estimation-item">
              <FaCar />
              <span>Estimated Price: PKR {estimatedPrice}</span>
            </div>
          </div>
          
          {/* Bidding Section */}
          {bookingStatus === 'searching' && (
            <div className="bidding-section">
              <h3><FaDollarSign /> Propose Your Fare</h3>
              <div className="bidding-input">
                <label>Your Proposed Price (PKR):</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={userProposedPrice}
                  onChange={(e) => setUserProposedPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Enter your proposed fare"
                />
                <small>Propose a fare that works for you. Drivers can accept or counter-offer.</small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Button */}
      {bookingStatus === 'searching' && (
        <button 
          className="search-drivers-btn"
          onClick={handleSearchDrivers}
          disabled={loading || !bookingData.pickupLocation || !bookingData.destination || userProposedPrice <= 0}
        >
          {loading ? 'Searching...' : 'Propose Fare & Search Drivers'}
        </button>
      )}

      {/* Bidding Status */}
      {bookingStatus === 'bidding' && (
        <div className="bidding-status">
          <div className="bidding-status-card">
            <h3><FaHandshake /> Waiting for Driver Response</h3>
            <div className="bidding-info">
              <p>Your proposed fare: <strong>PKR {userProposedPrice}</strong></p>
              <p>Waiting for drivers to accept or counter your offer...</p>
            </div>
            <div className="bidding-actions">
              <button className="cancel-btn" onClick={handleCancelBooking}>
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter Offer */}
      {biddingStatus === 'counter-offer' && (
        <div className="counter-offer">
          <div className="counter-offer-card">
            <h3><FaHandshake /> Driver Counter Offer</h3>
            <div className="offer-details">
              <p>Your proposed fare: <strong>PKR {userProposedPrice}</strong></p>
              <p>Driver's counter offer: <strong>PKR {driverCounterOffer}</strong></p>
              <p>Difference: <strong>PKR {(driverCounterOffer - userProposedPrice).toFixed(2)}</strong></p>
            </div>
            <div className="counter-offer-actions">
              <button className="accept-btn" onClick={handleAcceptCounterOffer}>
                Accept PKR {driverCounterOffer}
              </button>
              <button className="reject-btn" onClick={handleRejectCounterOffer}>
                Reject & Continue Searching
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bidding History */}
      {biddingHistory.length > 0 && (
        <div className="bidding-history">
          <h3>Bidding History</h3>
          <div className="history-list">
            {biddingHistory.map((bid, index) => (
              <div key={index} className="history-item">
                <div className="bid-type">
                  {bid.type === 'user_proposal' && <FaDollarSign />}
                  {bid.type === 'driver_counter' && <FaHandshake />}
                  {bid.type === 'user_acceptance' && <FaHandshake />}
                  {bid.type === 'user_rejection' && <FaHandshake />}
                </div>
                <div className="bid-info">
                  <span className="bid-price">PKR {bid.price}</span>
                  <span className="bid-time">
                    {bid.timestamp?.toDate?.()?.toLocaleTimeString() || 'Now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Selection */}
      {bookingStatus === 'searching' && availableDrivers.length > 0 && (
        <div className="drivers-section">
          <h3>Available Drivers</h3>
          <div className="drivers-list">
            {availableDrivers.map(driver => (
              <div
                key={driver.id}
                className={`driver-card ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                onClick={() => handleSelectDriver(driver)}
              >
                <div className="driver-avatar">
                  {driver.imageUrl ? (
                    <img src={driver.imageUrl} alt={driver.fullName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {driver.fullName?.charAt(0) || 'D'}
                    </div>
                  )}
                </div>
                <div className="driver-info">
                  <h4>{driver.fullName}</h4>
                  <div className="driver-rating">
                    <FaStar className="star" />
                    <span>{driver.rating?.toFixed(1) || '0.0'}</span>
                    {driver.overallSentiment && (
                      <span style={{ marginLeft: 8 }} className={`sentiment-badge ${driver.overallSentiment}`}>
                        {driver.overallSentiment.charAt(0).toUpperCase() + driver.overallSentiment.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="driver-vehicle">
                    {driver.vehicleMake} {driver.vehicleModel} • {driver.vehicleColor}
                  </p>
                </div>
                <div className="driver-actions">
                  <button className="call-btn">
                    <FaPhone />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Confirmation */}
      {bookingStatus === 'driver-selected' && selectedDriver && (
        <div className="booking-confirmation">
          <h3>Confirm Your Ride</h3>
          <div className="confirmation-card">
            <div className="driver-summary">
              <div className="driver-avatar">
                {selectedDriver.imageUrl ? (
                  <img src={selectedDriver.imageUrl} alt={selectedDriver.fullName} />
                ) : (
                  <div className="avatar-placeholder">
                    {selectedDriver.fullName?.charAt(0) || 'D'}
                  </div>
                )}
              </div>
              <div className="driver-details">
                <h4>{selectedDriver.fullName}</h4>
                <div className="driver-rating">
                  <FaStar className="star" />
                  <span>{selectedDriver.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <p>{selectedDriver.vehicleMake} {selectedDriver.vehicleModel}</p>
              </div>
            </div>
            <div className="ride-details">
              <div className="ride-route">
                <div className="route-point">
                  <FaMapMarkerAlt className="pickup" />
                  <span>{bookingData.pickupLocation}</span>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                  <FaMapMarkerAlt className="destination" />
                  <span>{bookingData.destination}</span>
                </div>
              </div>
              <div className="ride-summary">
                <p>Estimated Time: {estimatedTime} min</p>
                <p>Estimated Price: PKR {estimatedPrice}</p>
              </div>
            </div>
            <div className="confirmation-actions">
              <button className="cancel-btn" onClick={handleCancelBooking}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleConfirmBooking}>
                Confirm Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ride in Progress */}
      {bookingStatus === 'confirmed' && (
        <div className="ride-progress">
          <h3>Your Driver is Coming</h3>
          <div className="progress-card">
            <div className="driver-info">
              <div className="driver-avatar">
                {selectedDriver.imageUrl ? (
                  <img src={selectedDriver.imageUrl} alt={selectedDriver.fullName} />
                ) : (
                  <div className="avatar-placeholder">
                    {selectedDriver.fullName?.charAt(0) || 'D'}
                  </div>
                )}
              </div>
              <div className="driver-details">
                <h4>{selectedDriver.fullName}</h4>
                <p>{selectedDriver.vehicleMake} {selectedDriver.vehicleModel}</p>
                <p>License: {selectedDriver.licenseNumber}</p>
              </div>
            </div>
            <div className="progress-actions">
              <button className="call-btn">
                <FaPhone /> Call Driver
              </button>
              <button className="start-ride-btn" onClick={handleStartRide}>
                <FaLocationArrow /> Start Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Ride */}
      {bookingStatus === 'in-progress' && (
        <div className="active-ride">
          <h3>Ride in Progress</h3>
          <div className="active-ride-card">
            <div className="ride-timer">
              <FaClock />
              <span>Ride started</span>
            </div>
            <div className="ride-actions">
              <button className="call-btn">
                <FaPhone /> Call Driver
              </button>
              <button className="complete-ride-btn" onClick={handleCompleteRide}>
                Complete Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {(bookingStatus === 'driver-selected' || bookingStatus === 'confirmed' || bookingStatus === 'in-progress') && (
        <LiveMap
          userLocation={userLocation}
          driverLocation={driverLocation}
          pickupLocation={currentBooking?.pickupLocation || bookingData.pickupLocation}
          destination={currentBooking?.destination || bookingData.destination}
          showRoute={true}
        />
      )}

      {/* In-App Chat */}
      {currentBooking?.driverId && !chatClosed && (bookingStatus === 'driver-selected' || bookingStatus === 'confirmed' || bookingStatus === 'in-progress' || bookingStatus === 'bidding') && (
        <InAppChat
          rideId={currentBooking.id}
          otherPartyName={currentBooking.driverName || 'Driver'}
          otherPartyId={currentBooking.driverId}
          userRole="user"
          onClose={() => setChatClosed(true)}
        />
      )}

      {/* Reopen Chat Floating Button */}
      {currentBooking?.driverId && chatClosed && (bookingStatus === 'driver-selected' || bookingStatus === 'confirmed' || bookingStatus === 'in-progress' || bookingStatus === 'bidding') && (
        <button
          onClick={() => setChatClosed(false)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 10001,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 16px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            cursor: 'pointer'
          }}
          aria-label="Open chat"
        >
          💬 Chat
        </button>
      )}

      {/* Feedback Form */}
      {(bookingStatus === 'feedback' || bookingStatus === 'completed') && currentBooking && (
        <div className="feedback-section">
          <h3>How was your ride?</h3>
          <div className="feedback-card">
            <FeedbackForm
              driverId={currentBooking.driverId}
              vehicleId={currentBooking.vehicleId}
              bookingId={currentBooking.id}
              hideStars={true}
              onFeedbackSubmit={() => {
                navigate('/booking-confirmation/' + currentBooking.id);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RideBooking;
