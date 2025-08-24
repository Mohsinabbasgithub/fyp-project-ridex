import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, orderBy, getDoc, addDoc } from 'firebase/firestore';
import { FaCar, FaPhone, FaMapMarkerAlt, FaClock, FaStar, FaToggleOn, FaToggleOff, FaUser, FaSignOutAlt, FaDollarSign, FaHandshake } from 'react-icons/fa';
import '../styles/DriverDashboard.css';
import LiveMap from '../components/LiveMap';
import InAppChat from '../components/InAppChat';
import { createRideNotification } from '../components/NotificationSystem';
// Simple continuous ring for incoming requests
const RING_TONE_URL = '/ring.mp3';
let ringAudio = null;
let audioContext = null;
let fallbackOscillator = null; // { osc1, osc2, gain, lfo, lfoGain, intervalId }

function startPrettyFallbackRingtone() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      // resume will be attempted by caller
    }
    // Avoid duplicating
    if (fallbackOscillator) return;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.1);

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sine';

    // Tremolo (amplitude modulation)
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.value = 6; // 6 Hz tremolo
    lfoGain.gain.value = 0.03; // depth
    lfo.connect(lfoGain).connect(gain.gain);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    // Simple ringtone pattern (ascending two-tone phrase)
    const notesHz = [740, 880, 988, 880]; // F#5, A5, B5, A5
    let idx = 0;
    const applyNote = (hz) => {
      const t = audioContext.currentTime;
      osc1.frequency.setValueAtTime(hz, t);
      osc2.frequency.setValueAtTime(hz * 0.5, t); // lower octave for richness
    };
    applyNote(notesHz[0]);

    const intervalId = setInterval(() => {
      idx = (idx + 1) % notesHz.length;
      applyNote(notesHz[idx]);
    }, 350);

    osc1.start();
    osc2.start();
    lfo.start();

    fallbackOscillator = { osc1, osc2, gain, lfo, lfoGain, intervalId };
  } catch (_e) {}
}

function stopPrettyFallbackRingtone() {
  if (!fallbackOscillator) return;
  try { if (fallbackOscillator.intervalId) clearInterval(fallbackOscillator.intervalId); } catch (_e) {}
  try { fallbackOscillator.osc1.stop(); } catch (_e) {}
  try { fallbackOscillator.osc2.stop(); } catch (_e) {}
  try { fallbackOscillator.lfo.stop(); } catch (_e) {}
  fallbackOscillator = null;
}

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0
  });
  const [loading, setLoading] = useState(true);
  const [chatClosed, setChatClosed] = useState(false);
  
  // Bidding states
  const [selectedBiddingRequest, setSelectedBiddingRequest] = useState(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState(0);

  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // Add ride flow states
  const [rideStep, setRideStep] = useState('accepted'); // accepted, navigating, pickup, in-progress, completed
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [etaToPickup, setEtaToPickup] = useState(null);
  const [rideStartTime, setRideStartTime] = useState(null);
  const [rideEndTime, setRideEndTime] = useState(null);

  // Add missing states for ride flow fix
  const [isManualUpdate, setIsManualUpdate] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Fetch driver data with real-time listener
  useEffect(() => {
    if (!auth.currentUser) {
      console.log('No current user found');
      setLoading(false);
      return;
    }

    console.log('Setting up real-time listener for driver data:', auth.currentUser.uid);
          const driverRef = doc(db, 'drivers', auth.currentUser.uid);
          
    // Set up real-time listener for driver data
    const unsubscribe = onSnapshot(driverRef, (driverDoc) => {
          if (driverDoc.exists()) {
            const data = driverDoc.data();
        console.log('Driver data updated:', data);
        console.log('isApproved:', data.isApproved, 'status:', data.status);
        setDriverData({
          ...data,
          id: auth.currentUser.uid // Add the document ID
        });
            setIsOnline(data.isOnline || false);
            setIsAvailable(data.isAvailable || false);
      } else {
        console.log('No driver document found for:', auth.currentUser.uid);
        setDriverData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to driver data:', error);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up driver data listener');
      unsubscribe();
    };
  }, []);

  // Listen for active ride status changes
  useEffect(() => {
    if (activeRide && activeRide.id) {
      console.log('Setting up listener for active ride:', activeRide.id);
      
      const rideRef = doc(db, 'bookings', activeRide.id);
      const unsubscribe = onSnapshot(rideRef, (rideDoc) => {
        if (rideDoc.exists()) {
          const rideData = rideDoc.data();
          console.log('Active ride status updated:', rideData.status);
          
          // Only update rideStep if not in manual update mode
          if (!isManualUpdate) {
            let newStep = 'accepted';
            
            switch (rideData.status) {
              case 'driver-navigating':
                newStep = 'navigating';
                break;
              case 'driver-arrived':
                newStep = 'pickup';
                break;
              case 'in-progress':
                newStep = 'in-progress';
                break;
              case 'completed':
                newStep = 'completed';
                break;
              default:
                newStep = 'accepted';
            }
            
            console.log('Updating rideStep from listener:', newStep);
            setRideStep(newStep);
          } else {
            console.log('Skipping rideStep update due to manual update flag');
          }
          
          // Update activeRide with latest data
          setActiveRide(prev => ({
            ...prev,
            ...rideData
          }));
        }
      }, (error) => {
        console.error('Error listening to active ride:', error);
      });

      return () => {
        console.log('Cleaning up active ride listener');
        unsubscribe();
      };
    }
  }, [activeRide?.id, isManualUpdate]);

  // Listen for incoming ride requests (including bidding requests)
  useEffect(() => {
    console.log('Checking for incoming requests - isOnline:', isOnline, 'isAvailable:', isAvailable);
    
    if (isOnline && isAvailable) {
      const requestsRef = collection(db, 'bookings');
      
      // Simplified query to avoid index issues
      const q = query(
        requestsRef,
        where('status', 'in', ['searching', 'bidding'])
      );

      console.log('Setting up listener for incoming requests with query:', q);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Raw snapshot received:', snapshot.docs.length, 'documents');
        
        const allRequests = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Document data:', doc.id, data);
          return {
          id: doc.id,
            ...data
          };
        });
        
        // Filter out requests that already have a driver assigned
        const availableRequests = allRequests.filter(request => {
          const hasDriver = request.driverId && request.driverId !== null && request.driverId !== '';
          console.log(`Request ${request.id}: hasDriver=${hasDriver}, driverId=${request.driverId}, status=${request.status}`);
          return !hasDriver;
        });
        
        console.log('Available requests after filtering:', availableRequests.length, availableRequests);
        setIncomingRequests(availableRequests);

        // Ring continuously if there is at least one available request
        try {
          if (availableRequests.length > 0) {
            // Prefer a nicer ringtone if present, then fallback
            const tryPlay = (url) => {
              ringAudio = new Audio(url);
              ringAudio.loop = true;
              ringAudio.volume = 0.7;
              return ringAudio.play();
            };
            tryPlay('/ringtone.mp3')
              .catch(() => tryPlay('/alarm.mp3'))
              .catch(() => tryPlay(RING_TONE_URL))
              .catch(() => {
                try {
                  if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  }
                  if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(() => {});
                  }
                  startPrettyFallbackRingtone();
                } catch (_err) {}
              });
          } else {
            if (ringAudio) {
              ringAudio.pause();
              ringAudio.currentTime = 0;
            }
            stopPrettyFallbackRingtone();
          }
        } catch (_e) {}
      }, (error) => {
        console.error('Error listening to incoming requests:', error);
      });

      return () => {
        console.log('Cleaning up incoming requests listener');
        unsubscribe();
        if (ringAudio) {
          ringAudio.pause();
          ringAudio.currentTime = 0;
        }
      };
    } else {
      console.log('Driver not online or not available, clearing incoming requests');
      setIncomingRequests([]);
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
      }
    }
  }, [isOnline, isAvailable]);

  // Listen for active ride
  useEffect(() => {
    if (driverData?.id) {
      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('driverId', '==', driverData.id),
        where('status', 'in', ['driver-selected', 'confirmed', 'in-progress'])
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const ride = snapshot.docs[0];
          setActiveRide({ id: ride.id, ...ride.data() });
        } else {
          setActiveRide(null);
        }
      });

      return () => unsubscribe();
    }
  }, [driverData?.id]);

  // Listen for user location updates when there is an active ride
  useEffect(() => {
    if (activeRide?.id) {
      const bookingRef = doc(db, 'bookings', activeRide.id);
      const unsubscribe = onSnapshot(bookingRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userLocation) setUserLocation(data.userLocation);
        }
      });
      return () => unsubscribe();
    }
  }, [activeRide?.id]);

  // Update driver location in Firestore during active ride
  useEffect(() => {
    let watchId;
    if (activeRide && (activeRide.status === 'confirmed' || activeRide.status === 'in-progress')) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setDriverLocation(loc);
            if (auth.currentUser?.uid) {
              updateDoc(doc(db, 'drivers', auth.currentUser.uid), { location: loc });
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
  }, [activeRide]);

  // Calculate earnings
  useEffect(() => {
    const calculateEarnings = async () => {
      if (driverData?.id) {
        try {
          const bookingsRef = collection(db, 'bookings');
          const q = query(
            bookingsRef,
            where('driverId', '==', driverData.id),
            where('status', '==', 'completed')
          );

          const snapshot = await getDocs(q);
          const completedRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());

          const toJsDate = (ts) => {
            if (!ts) return null;
            if (typeof ts.toDate === 'function') return ts.toDate();
            if (ts instanceof Date) return ts;
            const d = new Date(ts);
            return isNaN(d.getTime()) ? null : d;
          };
          const getEndDate = (ride) => toJsDate(ride.endTime) || toJsDate(ride.rideEndTime) || toJsDate(ride.completedAt);
          const getAmount = (ride) => (ride.finalPrice ?? ride.userProposedPrice ?? ride.estimatedPrice ?? 0);

          const todayEarnings = completedRides
            .filter(ride => {
              const d = getEndDate(ride);
              return d && d >= today;
            })
            .reduce((sum, ride) => sum + getAmount(ride), 0);

          const weekEarnings = completedRides
            .filter(ride => {
              const d = getEndDate(ride);
              return d && d >= weekAgo;
            })
            .reduce((sum, ride) => sum + getAmount(ride), 0);

          const monthEarnings = completedRides
            .filter(ride => {
              const d = getEndDate(ride);
              return d && d >= monthAgo;
            })
            .reduce((sum, ride) => sum + getAmount(ride), 0);

          setEarnings({
            today: todayEarnings,
            week: weekEarnings,
            month: monthEarnings
          });
        } catch (error) {
          console.error('Error calculating earnings:', error);
        }
      }
    };

    calculateEarnings();
  }, [driverData?.id]);

  // Check for existing active ride when driver data loads
  useEffect(() => {
    const checkActiveRide = async () => {
      if (driverData?.id && driverData.currentBookingId) {
        try {
          console.log('Checking for existing active ride:', driverData.currentBookingId);
          const rideRef = doc(db, 'bookings', driverData.currentBookingId);
          const rideDoc = await getDoc(rideRef);
          
          if (rideDoc.exists()) {
            const rideData = rideDoc.data();
            console.log('Found existing active ride:', rideData);
            
            // Only set as active if it's not completed
            if (rideData.status !== 'completed') {
              setActiveRide({
                ...rideData,
                id: driverData.currentBookingId
              });
              
              // Set appropriate ride step based on status
              let initialStep = 'accepted';
              switch (rideData.status) {
                case 'driver-navigating':
                  initialStep = 'navigating';
                  break;
                case 'driver-arrived':
                  initialStep = 'pickup';
                  break;
                case 'in-progress':
                  initialStep = 'in-progress';
                  break;
                default:
                  initialStep = 'accepted';
              }
              
              setRideStep(initialStep);
              console.log('Active ride restored with step:', initialStep);
            } else {
              console.log('Existing ride is completed, clearing currentBookingId');
              // Clear the currentBookingId if ride is completed
              await updateDoc(doc(db, 'drivers', driverData.id), {
                currentBookingId: null,
                isAvailable: true
              });
            }
          } else {
            console.log('No existing ride found, clearing currentBookingId');
            // Clear the currentBookingId if no ride document exists
            await updateDoc(doc(db, 'drivers', driverData.id), {
              currentBookingId: null,
              isAvailable: true
            });
          }
        } catch (error) {
          console.error('Error checking active ride:', error);
        }
      }
    };

    checkActiveRide();
  }, [driverData?.id, driverData?.currentBookingId]);

  const toggleOnlineStatus = async () => {
    try {
      // Check if driver is approved before allowing them to go online
      if (!driverData.isApproved && driverData.status !== 'approved') {
        alert('You need to be approved by admin before you can go online.');
        return;
      }

      const newStatus = !isOnline;
      console.log('Toggling online status to:', newStatus);
      
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isOnline: newStatus,
        isAvailable: newStatus
      });
      
      console.log('Successfully updated online status in Firestore');
      setIsOnline(newStatus);
      setIsAvailable(newStatus);
      // On first user interaction after going online, attempt to unlock audio context
      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      } catch (_e) {}
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
      }
      console.log('=== handleAcceptRequest START ===');
      console.log('Accepting request:', request);

      // Update booking with driver info
      await updateDoc(doc(db, 'bookings', request.id), {
        driverId: auth.currentUser.uid,
        driverName: driverData.fullName,
        driverPhone: driverData.phone,
        status: 'driver-selected',
        finalPrice: request.userProposedPrice || request.estimatedPrice
      });

      // Update driver status
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isAvailable: false,
        currentBookingId: request.id
      });

      setIsAvailable(false);
      
      // Set active ride immediately
      setActiveRide({
        ...request,
        id: request.id
      });
      setRideStep('accepted');
      console.log('Active ride set:', request.id);
      
      // Create notification for user
      await createRideNotification(request.userId, request.id, 'driver_accepted', driverData.fullName);
      
      console.log('=== handleAcceptRequest SUCCESS ===');
    } catch (error) {
      console.error('=== handleAcceptRequest ERROR ===');
      console.error('Error accepting request:', error);
      alert(`Failed to accept request: ${error.message}`);
    }
  };

  const handleAcceptBiddingRequest = async (request) => {
    try {
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
      }
      console.log('=== handleAcceptBiddingRequest START ===');
      console.log('Accepting bidding request:', request);

      // Update booking with driver info and accept the user's proposed price
      await updateDoc(doc(db, 'bookings', request.id), {
        driverId: auth.currentUser.uid,
        driverName: driverData.fullName,
        driverPhone: driverData.phone,
        status: 'driver-selected',
        biddingStatus: 'accepted',
        finalPrice: request.userProposedPrice,
        biddingHistory: [
          ...(request.biddingHistory || []),
          {
            type: 'driver_acceptance',
            price: request.userProposedPrice,
            timestamp: new Date(),
            driverId: auth.currentUser.uid
          }
        ]
      });

      // Update driver status
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isAvailable: false,
        currentBookingId: request.id
      });

      setIsAvailable(false);
      setSelectedBiddingRequest(null);
      
      // Set active ride immediately
      setActiveRide({
        ...request,
        id: request.id
      });
      setRideStep('accepted');
      console.log('Active ride set from bidding:', request.id);
      
      // Create notification for user
      await createRideNotification(request.userId, request.id, 'driver_accepted', driverData.fullName);
      
      console.log('=== handleAcceptBiddingRequest SUCCESS ===');
    } catch (error) {
      console.error('=== handleAcceptBiddingRequest ERROR ===');
      console.error('Error accepting bidding request:', error);
      alert(`Failed to accept bidding request: ${error.message}`);
    }
  };

  const handleCounterOffer = async (request) => {
    if (counterOfferAmount <= 0) {
      alert('Please enter a valid counter offer amount');
      return;
    }

    try {
      await updateDoc(doc(db, 'bookings', request.id), {
        driverId: auth.currentUser.uid,
        driverName: driverData.fullName,
        driverPhone: driverData.phone,
        biddingStatus: 'counter-offer',
        driverCounterOffer: counterOfferAmount,
        biddingHistory: [
          ...(request.biddingHistory || []),
          {
            type: 'driver_counter',
            price: counterOfferAmount,
            timestamp: new Date(),
            driverId: auth.currentUser.uid
          }
        ]
      });

      setSelectedBiddingRequest(null);
      setCounterOfferAmount(0);
    } catch (error) {
      console.error('Error making counter offer:', error);
    }
  };

  const handleRejectBiddingRequest = async (request) => {
    try {
      await updateDoc(doc(db, 'bookings', request.id), {
        biddingStatus: 'rejected',
        biddingHistory: [
          ...(request.biddingHistory || []),
          {
            type: 'driver_rejection',
            price: request.userProposedPrice,
            timestamp: new Date(),
            driverId: auth.currentUser.uid
          }
        ]
      });

      setSelectedBiddingRequest(null);
    } catch (error) {
      console.error('Error rejecting bidding request:', error);
    }
  };

  const handleStartNavigation = async () => {
    try {
      console.log('=== handleStartNavigation START ===');
      console.log('Current rideStep before:', rideStep);
      console.log('Active ride ID:', activeRide?.id);
      console.log('Driver data:', driverData);

      setStepLoading(true);
      setIsManualUpdate(true); // Prevent listener from overriding
      console.log('handleStartNavigation: Updating Firestore to driver-navigating...');

      // Immediate state update FIRST with force re-render
      setRideStep('navigating');
      setForceUpdate(prev => prev + 1); // Force re-render
      console.log('handleStartNavigation: Immediate state update to navigating');

      // Resolve a safe booking id
      const bookingId = activeRide?.id || driverData?.currentBookingId;
      if (!bookingId) {
        throw new Error('No active booking ID found');
      }

      // Then update Firestore
      console.log('About to update Firestore document:', bookingId);
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'driver-navigating',
        driverStartTime: new Date()
      });
      console.log('Firestore update successful');

      console.log('About to create notification');
      // Ensure we have a userId for notification
      let notifyUserId = activeRide?.userId;
      if (!notifyUserId) {
        const bSnap = await getDoc(doc(db, 'bookings', bookingId));
        notifyUserId = bSnap.exists() ? (bSnap.data().userId || '') : '';
      }
      await createRideNotification(notifyUserId, bookingId, 'driver_navigating', driverData.fullName);
      console.log('Notification created successfully');

      setStepLoading(false);
      console.log('=== handleStartNavigation SUCCESS ===');
      alert('Navigation started! Head to the pickup location.');

      // Allow listener to work again after a delay
      setTimeout(() => {
        setIsManualUpdate(false);
        console.log('Manual update flag cleared');
      }, 1000);

      // Force a re-render to ensure UI updates
      setTimeout(() => {
        console.log('Current rideStep after timeout:', rideStep);
        if (rideStep !== 'navigating') {
          console.error('Ride step did not update to navigating. Current rideStep:', rideStep);
          // Force update again
          setRideStep('navigating');
          setForceUpdate(prev => prev + 1);
        }
      }, 100);

    } catch (error) {
      console.error('=== handleStartNavigation ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      setStepLoading(false);
      setIsManualUpdate(false); // Clear flag on error
      console.error('Error starting navigation:', error);
      alert(`Failed to start navigation: ${error.message}`);
    }
  };

  const handleArrivedAtPickup = async () => {
    try {
      console.log('=== handleArrivedAtPickup START ===');
      console.log('Current rideStep before:', rideStep);

      setStepLoading(true);
      setIsManualUpdate(true); // Prevent listener from overriding
      console.log('handleArrivedAtPickup: Updating Firestore to driver-arrived...');

      // Immediate state update FIRST
      setRideStep('pickup');
      setForceUpdate(prev => prev + 1);
      console.log('handleArrivedAtPickup: Immediate state update to pickup');

      // Resolve a safe booking id
      const bookingId = activeRide?.id || driverData?.currentBookingId;
      if (!bookingId) {
        throw new Error('No active booking ID found');
      }

      // Then update Firestore
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'driver-arrived',
        driverArrivalTime: new Date()
      });
      console.log('Firestore update successful');
      
      // Create notification for user
      let notifyUserId = activeRide?.userId;
      if (!notifyUserId) {
        const bSnap = await getDoc(doc(db, 'bookings', bookingId));
        notifyUserId = bSnap.exists() ? (bSnap.data().userId || '') : '';
      }
      await createRideNotification(notifyUserId, bookingId, 'driver_arrived', driverData.fullName);
      console.log('Notification created successfully');
      
      setStepLoading(false);
      console.log('=== handleArrivedAtPickup SUCCESS ===');
      alert('You have arrived at pickup location. Please wait for the passenger.');

      // Allow listener to work again after a delay
      setTimeout(() => {
        setIsManualUpdate(false);
        console.log('Manual update flag cleared');
      }, 1000);

    } catch (error) {
      console.error('=== handleArrivedAtPickup ERROR ===');
      console.error('Error details:', error);
      setStepLoading(false);
      setIsManualUpdate(false); // Clear flag on error
      console.error('Error marking arrival:', error);
      alert(`Failed to mark arrival: ${error.message}`);
    }
  };

  const handleStartRide = async () => {
    try {
      console.log('=== handleStartRide START ===');
      console.log('Current rideStep before:', rideStep);

      setStepLoading(true);
      setIsManualUpdate(true); // Prevent listener from overriding
      console.log('handleStartRide: Updating Firestore to in-progress...');

      // Immediate state update FIRST
      setRideStep('in-progress');
      setRideStartTime(new Date());
      setForceUpdate(prev => prev + 1);
      console.log('handleStartRide: Immediate state update to in-progress');

      // Resolve a safe booking id
      const bookingId = activeRide?.id || driverData?.currentBookingId;
      if (!bookingId) {
        throw new Error('No active booking ID found');
      }

      // Then update Firestore
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'in-progress',
        rideStartTime: new Date()
      });
      console.log('Firestore update successful');
      
      // Create notification for user
      let notifyUserId = activeRide?.userId;
      if (!notifyUserId) {
        const bSnap = await getDoc(doc(db, 'bookings', bookingId));
        notifyUserId = bSnap.exists() ? (bSnap.data().userId || '') : '';
      }
      await createRideNotification(notifyUserId, bookingId, 'ride_started', driverData.fullName);
      console.log('Notification created successfully');
      
      setStepLoading(false);
      console.log('=== handleStartRide SUCCESS ===');
      alert('Ride started! Drive safely to the destination.');

      // Allow listener to work again after a delay
      setTimeout(() => {
        setIsManualUpdate(false);
        console.log('Manual update flag cleared');
      }, 1000);

    } catch (error) {
      console.error('=== handleStartRide ERROR ===');
      console.error('Error details:', error);
      setStepLoading(false);
      setIsManualUpdate(false); // Clear flag on error
      console.error('Error starting ride:', error);
      alert(`Failed to start ride: ${error.message}`);
    }
  };

  const handleCompleteRide = async () => {
    try {
      console.log('=== handleCompleteRide START ===');
      console.log('Current rideStep before:', rideStep);

      setStepLoading(true);
      setIsManualUpdate(true); // Prevent listener from overriding
      console.log('handleCompleteRide: Updating Firestore to completed...');

      // Immediate state update FIRST
      setRideStep('completed');
      setRideEndTime(new Date());
      setForceUpdate(prev => prev + 1);
      console.log('handleCompleteRide: Immediate state update to completed');
      
      // Calculate final price
      const startTime = rideStartTime || new Date();
      const endTime = new Date();
      const durationMinutes = (endTime - startTime) / (1000 * 60);
      const finalPrice = activeRide.finalPrice || activeRide.userProposedPrice || 0;
      
      console.log('About to update Firestore with completion data');
      // Resolve a safe booking id
      const bookingId = activeRide?.id || driverData?.currentBookingId;
      if (!bookingId) {
        throw new Error('No active booking ID found');
      }

      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'completed',
        rideEndTime: new Date(),
        finalPrice: finalPrice,
        rideDuration: durationMinutes
      });
      console.log('Firestore booking update successful');
      
      // Create payment record
      console.log('About to create payment record');
      await addDoc(collection(db, 'payments'), {
        userId: activeRide.userId,
        driverId: auth.currentUser.uid,
        rideId: bookingId,
        amount: finalPrice,
        type: 'ride_payment',
        status: 'completed',
        description: `Ride from ${activeRide.pickupLocation} to ${activeRide.destination}`,
        paymentMethod: activeRide.paymentMethod || 'cash',
        timestamp: new Date(),
        transactionId: `RIDE-${Date.now()}`
      });
      console.log('Payment record created successfully');
      
      // Update driver status
      console.log('About to update driver status');
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isAvailable: true,
        currentBookingId: null
      });
      console.log('Driver status updated successfully');
      
      // Create notification for user
      console.log('About to create completion notification');
      let notifyUserId = activeRide?.userId;
      if (!notifyUserId) {
        const bSnap = await getDoc(doc(db, 'bookings', bookingId));
        notifyUserId = bSnap.exists() ? (bSnap.data().userId || '') : '';
      }
      await createRideNotification(notifyUserId, bookingId, 'ride_completed', driverData.fullName);
      console.log('Completion notification created successfully');
      
      setStepLoading(false);
      console.log('=== handleCompleteRide SUCCESS ===');
      alert(`Ride completed! You earned PKR ${finalPrice.toFixed(2)}`);
      
      // Clear active ride after a short delay
      setTimeout(() => {
      setActiveRide(null);
        setRideStep('accepted');
        setIsManualUpdate(false);
        console.log('Active ride cleared and manual update flag reset');
      }, 2000);

    } catch (error) {
      console.error('=== handleCompleteRide ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      setStepLoading(false);
      setIsManualUpdate(false); // Clear flag on error
      console.error('Error completing ride:', error);
      alert(`Failed to complete ride: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await updateDoc(doc(db, 'drivers', auth.currentUser.uid), {
        isOnline: false,
        isAvailable: false
      });
      await auth.signOut();
      navigate('/login');
      // Stop any sounds
      if (ringAudio) {
        ringAudio.pause();
        ringAudio.currentTime = 0;
        ringAudio = null;
      }
      stopPrettyFallbackRingtone();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <h2>Loading driver dashboard...</h2>
      </div>
    );
  }

  if (!driverData) {
    return (
      <div className="driver-dashboard-error">
        <h2>Driver profile not found</h2>
        <p>Please complete your driver registration first.</p>
        <button onClick={() => navigate('/DriverRegistration')}>
          Complete Registration
        </button>
      </div>
    );
  }

  // Check if driver has completed vehicle registration
  if (driverData && !driverData.hasVehicle) {
    return (
      <div className="driver-dashboard-error">
        <h2>Vehicle Registration Required</h2>
        <p>Please add your vehicle details to start accepting rides.</p>
        <button onClick={() => navigate('/DriverVehicle')}>
          Add Vehicle
        </button>
      </div>
    );
  }

  // Check if driver has been approved by admin
  if (driverData && !driverData.isApproved && driverData.status !== 'approved') {
    console.log('Driver not approved:', driverData);
    
    const checkApprovalStatus = async () => {
      try {
        const driverRef = doc(db, 'drivers', auth.currentUser.uid);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          const data = driverDoc.data();
          console.log('Current driver data:', data);
          const approvalStatus = data.isApproved ? 'Approved' : 'Pending';
          const statusField = data.status || 'N/A';
          alert(`Approval status: ${approvalStatus}\nStatus field: ${statusField}\nHas Vehicle: ${data.hasVehicle ? 'Yes' : 'No'}`);
        } else {
          alert('Driver document not found!');
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
        alert('Error checking approval status: ' + error.message);
      }
    };
    
    const forceRefresh = async () => {
      try {
        setLoading(true);
        const driverRef = doc(db, 'drivers', auth.currentUser.uid);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          const data = driverDoc.data();
          console.log('Force refreshed driver data:', data);
          setDriverData(data);
          setIsOnline(data.isOnline || false);
          setIsAvailable(data.isAvailable || false);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error force refreshing:', error);
        setLoading(false);
      }
    };
    
    const testApprove = async () => {
      try {
        const driverRef = doc(db, 'drivers', auth.currentUser.uid);
        await updateDoc(driverRef, {
          isApproved: true,
          status: 'approved',
          approvedAt: new Date(),
          updatedAt: new Date()
        });
        alert('Test approval completed! Please refresh the page.');
      } catch (error) {
        console.error('Error in test approval:', error);
        alert('Error in test approval: ' + error.message);
      }
    };
    
    const testCheckBookings = async () => {
      try {
        const bookingsRef = collection(db, 'bookings');
        const snapshot = await getDocs(bookingsRef);
        const allBookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('All bookings in database:', allBookings);
        
        const availableBookings = allBookings.filter(booking => 
          (booking.status === 'searching' || booking.status === 'bidding') && 
          (!booking.driverId || booking.driverId === null || booking.driverId === '')
        );
        
        console.log('Available bookings for drivers:', availableBookings);
        alert(`Found ${allBookings.length} total bookings, ${availableBookings.length} available for drivers`);
        
        // Also test the exact query we're using
        const q = query(
          bookingsRef,
          where('status', 'in', ['searching', 'bidding']),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const queryResults = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Query results:', queryResults);
        alert(`Query found ${queryResults.length} bookings with status 'searching' or 'bidding'`);
      } catch (error) {
        console.error('Error checking bookings:', error);
        alert('Error checking bookings: ' + error.message);
      }
    };
    
    return (
      <div className="driver-dashboard-error">
        <h2>Account Pending Approval</h2>
        <p>Your driver account is pending admin approval. You will be able to accept rides once approved.</p>
        <div className="approval-status">
          <p><strong>Status:</strong> Pending Approval</p>
          <p><strong>Submitted:</strong> {driverData.createdAt ? new Date(driverData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
          <p><strong>isApproved field:</strong> {driverData.isApproved ? 'true' : 'false'}</p>
          <p><strong>status field:</strong> {driverData.status || 'N/A'}</p>
          <p><strong>hasVehicle field:</strong> {driverData.hasVehicle ? 'true' : 'false'}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={checkApprovalStatus}
            style={{ padding: '8px 16px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Check Approval Status
          </button>
          <button 
            onClick={forceRefresh}
            style={{ padding: '8px 16px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Force Refresh
          </button>
          <button 
            onClick={testApprove}
            style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Approve
          </button>
          <button 
            onClick={testCheckBookings}
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Test Check Bookings
          </button>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-dashboard-container">
      {/* Header */}
      <div className="driver-header">
        <div className="driver-profile">
          <div className="driver-avatar">
            {driverData.imageUrl ? (
              <img src={driverData.imageUrl} alt={driverData.fullName} />
            ) : (
              <div className="avatar-placeholder">
                {driverData.fullName?.charAt(0) || 'D'}
              </div>
            )}
          </div>
          <div className="driver-info">
            <h2>{driverData.fullName}</h2>
            <p>{driverData.vehicleMake} {driverData.vehicleModel}</p>
            <div className="driver-rating">
              <FaStar className="star" />
              <span>{driverData.rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </div>

      {/* Online Status Toggle */}
      <div className="status-toggle">
        <div className="toggle-info">
          <h3>Go Online</h3>
          <p>Start accepting ride requests</p>
          <div className="status-indicators">
            <p><strong>Approval Status:</strong> {driverData.isApproved ? '✅ Approved' : '⏳ Pending'}</p>
            <p><strong>Online Status:</strong> {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
            <p><strong>Available Status:</strong> {isAvailable ? '🟢 Available' : '🔴 Busy'}</p>
            <p><strong>Vehicle Status:</strong> {driverData.hasVehicle ? '✅ Vehicle Added' : '❌ No Vehicle'}</p>
          </div>
        </div>
        <button 
          className={`toggle-btn ${isOnline ? 'online' : 'offline'}`}
          onClick={toggleOnlineStatus}
          disabled={!driverData.isApproved && driverData.status !== 'approved'}
        >
          {isOnline ? <FaToggleOn /> : <FaToggleOff />}
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Earnings Summary */}
      <div className="earnings-section">
        <h3>Earnings</h3>
        <div className="earnings-grid">
          <div className="earning-card">
            <h4>Today</h4>
            <p>${earnings.today.toFixed(2)}</p>
          </div>
          <div className="earning-card">
            <h4>This Week</h4>
            <p>${earnings.week.toFixed(2)}</p>
          </div>
          <div className="earning-card">
            <h4>This Month</h4>
            <p>${earnings.month.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Active Ride Flow */}
      {activeRide && (
        <div className="active-ride-flow">
          <h3>🚗 Active Ride - {activeRide.userEmail}</h3>
          
          {/* Ride Status Indicator */}
          <div className="ride-status-indicator">
            <div className={`status-step ${rideStep === 'accepted' ? 'active' : ''}`}>
              <div className="step-icon">✅</div>
              <span>Accepted</span>
                </div>
            <div className={`status-step ${rideStep === 'navigating' ? 'active' : ''}`}>
              <div className="step-icon">🗺️</div>
              <span>Navigating</span>
                </div>
            <div className={`status-step ${rideStep === 'pickup' ? 'active' : ''}`}>
              <div className="step-icon">📍</div>
              <span>At Pickup</span>
              </div>
            <div className={`status-step ${rideStep === 'in-progress' ? 'active' : ''}`}>
              <div className="step-icon">🚗</div>
              <span>In Progress</span>
            </div>
            <div className={`status-step ${rideStep === 'completed' ? 'active' : ''}`}>
              <div className="step-icon">💰</div>
              <span>Completed</span>
            </div>
          </div>

          {/* Ride Details */}
              <div className="ride-details">
            <div className="ride-info">
              <div className="info-item">
                <FaMapMarkerAlt className="info-icon" />
                <div>
                  <strong>Pickup:</strong> {activeRide.pickupLocation}
              </div>
            </div>
              <div className="info-item">
                <FaMapMarkerAlt className="info-icon" />
                <div>
                  <strong>Destination:</strong> {activeRide.destination}
                </div>
              </div>
              <div className="info-item">
                <FaDollarSign className="info-icon" />
                <div>
                  <strong>Price:</strong> PKR {activeRide.finalPrice || activeRide.userProposedPrice || 0}
                </div>
              </div>
              <div className="info-item">
                <FaUser className="info-icon" />
                <div>
                  <strong>Passenger:</strong> {activeRide.userEmail}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
            <div className="ride-actions">
            {rideStep === 'accepted' && (
              <button 
                className="action-btn primary"
                onClick={handleStartNavigation}
                disabled={stepLoading}
              >
                {stepLoading ? '🔄 Processing...' : '🗺️ Start Navigation to Pickup'}
              </button>
            )}
            
            {rideStep === 'navigating' && (
              <button 
                className="action-btn primary"
                onClick={handleArrivedAtPickup}
                disabled={stepLoading}
              >
                {stepLoading ? '🔄 Processing...' : '📍 I\'ve Arrived at Pickup'}
                </button>
              )}
            
            {rideStep === 'pickup' && (
              <button 
                className="action-btn primary"
                onClick={handleStartRide}
                disabled={stepLoading}
              >
                {stepLoading ? '🔄 Processing...' : '🚗 Start Ride'}
                </button>
              )}
            
            {rideStep === 'in-progress' && (
              <button 
                className="action-btn success"
                onClick={handleCompleteRide}
                disabled={stepLoading}
              >
                {stepLoading ? '🔄 Processing...' : '✅ Complete Ride'}
              </button>
            )}
            
            {rideStep === 'completed' && (
              <div className="completion-message">
                <h4>🎉 Ride Completed Successfully!</h4>
                <p>You earned PKR {(activeRide.finalPrice || activeRide.userProposedPrice || 0).toFixed(2)}</p>
                <p>Check your earnings in the Driver Earnings section.</p>
            </div>
            )}

            {/* Debug Buttons for Testing */}
            {process.env.NODE_ENV === 'development' && (
              <div className="debug-buttons" style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                <h5>🔧 Debug Controls (Development Only)</h5>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => {
                      console.log('DEBUG: Force setting rideStep to navigating');
                      setRideStep('navigating');
                      setForceUpdate(prev => prev + 1);
                    }}
                    style={{ padding: '5px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Force: Navigating
                  </button>
                  <button 
                    onClick={() => {
                      console.log('DEBUG: Force setting rideStep to pickup');
                      setRideStep('pickup');
                      setForceUpdate(prev => prev + 1);
                    }}
                    style={{ padding: '5px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Force: Pickup
                  </button>
                  <button 
                    onClick={() => {
                      console.log('DEBUG: Force setting rideStep to in-progress');
                      setRideStep('in-progress');
                      setForceUpdate(prev => prev + 1);
                    }}
                    style={{ padding: '5px 10px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Force: In Progress
                  </button>
                  <button 
                    onClick={() => {
                      console.log('DEBUG: Force setting rideStep to completed');
                      setRideStep('completed');
                      setForceUpdate(prev => prev + 1);
                    }}
                    style={{ padding: '5px 10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Force: Completed
                  </button>
                  <button 
                    onClick={() => {
                      console.log('DEBUG: Current state dump');
                      console.log('rideStep:', rideStep);
                      console.log('isManualUpdate:', isManualUpdate);
                      console.log('stepLoading:', stepLoading);
                      console.log('forceUpdate:', forceUpdate);
                      console.log('activeRide:', activeRide);
                      alert(`Current State:\nrideStep: ${rideStep}\nisManualUpdate: ${isManualUpdate}\nstepLoading: ${stepLoading}\nforceUpdate: ${forceUpdate}`);
                    }}
                    style={{ display: 'none' }}
                  >
                    
                  </button>
          </div>
              </div>
            )}
          </div>

          {/* Live Map */}
          <div className="ride-map-section">
            <h4>📍 Live Navigation</h4>
            <LiveMap
              userLocation={userLocation}
              driverLocation={driverLocation}
              pickupLocation={activeRide.pickupLocation}
              destination={activeRide.destination}
              showRoute={true}
            />
          </div>

          {/* Chat Section */}
          {!chatClosed && (rideStep === 'accepted' || rideStep === 'navigating' || rideStep === 'pickup' || rideStep === 'in-progress') && (
            <InAppChat
              rideId={activeRide.id}
              otherPartyName={activeRide.userEmail || 'Passenger'}
              otherPartyId={activeRide.userId}
              userRole="driver"
              onClose={() => setChatClosed(true)}
            />
          )}

          {/* Reopen Chat Floating Button */}
          {chatClosed && (rideStep === 'accepted' || rideStep === 'navigating' || rideStep === 'pickup' || rideStep === 'in-progress') && (
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
        </div>
      )}

      {/* Incoming Requests */}
      {isOnline && isAvailable && incomingRequests.length > 0 && (
        <div className="incoming-requests-section">
          <h3>Incoming Requests</h3>
          <div className="requests-list">
            {incomingRequests.map(request => (
              <div key={request.id} className="request-card">
                <div className="request-info">
                  <div className="request-route">
                    <div className="route-point">
                      <FaMapMarkerAlt className="pickup" />
                      <span>{request.pickupLocation}</span>
                    </div>
                    <div className="route-line"></div>
                    <div className="route-point">
                      <FaMapMarkerAlt className="destination" />
                      <span>{request.destination}</span>
                    </div>
                  </div>
                  <div className="request-details">
                    <p><FaCar /> ${request.estimatedPrice}</p>
                    <p><FaClock /> {request.estimatedTime} min</p>
                    <p><FaUser /> {request.userEmail}</p>
                    {request.status === 'bidding' && (
                      <div className="bidding-info">
                        <p><FaDollarSign /> User Proposed: <strong>${request.userProposedPrice}</strong></p>
                        <p><FaHandshake /> Bidding Request</p>
                  </div>
                    )}
                </div>
                </div>
                <div className="request-actions">
                  {request.status === 'bidding' ? (
                    <div className="bidding-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleAcceptBiddingRequest(request)}
                      >
                        Accept ${request.userProposedPrice}
                      </button>
                      <button 
                        className="counter-btn"
                        onClick={() => setSelectedBiddingRequest(request)}
                      >
                        Counter Offer
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRejectBiddingRequest(request)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                <button 
                  className="accept-btn"
                  onClick={() => handleAcceptRequest(request)}
                >
                  Accept
                </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counter Offer Modal */}
      {selectedBiddingRequest && (
        <div className="counter-offer-modal">
          <div className="modal-content">
            <h3>Make Counter Offer</h3>
            <div className="offer-details">
              <p>User's proposed fare: <strong>${selectedBiddingRequest.userProposedPrice}</strong></p>
              <p>Estimated fare: <strong>${selectedBiddingRequest.estimatedPrice}</strong></p>
            </div>
            <div className="counter-input">
              <label>Your Counter Offer ($):</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={counterOfferAmount}
                onChange={(e) => setCounterOfferAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter your counter offer"
              />
            </div>
            <div className="modal-actions">
              <button 
                className="submit-btn"
                onClick={() => handleCounterOffer(selectedBiddingRequest)}
                disabled={counterOfferAmount <= 0}
              >
                Send Counter Offer
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setSelectedBiddingRequest(null);
                  setCounterOfferAmount(0);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ride Flow Guide */}
      {isOnline && isAvailable && incomingRequests.length === 0 && !activeRide && (
        <div className="ride-flow-guide">
          <h3>🚗 How It Works When You Receive a Ride</h3>
          <div className="flow-steps">
            <div className="flow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>📱 Receive Ride Request</h4>
                <p>When a user books a ride, you'll see it in "Incoming Requests" with pickup/destination details and proposed price.</p>
              </div>
            </div>
            
            <div className="flow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>💰 Review & Accept</h4>
                <p>Review the ride details, proposed price, and user information. Click "Accept" to take the ride.</p>
              </div>
            </div>
            
            <div className="flow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>🗺️ Navigate to Pickup</h4>
                <p>Use the live map to navigate to the pickup location. Real-time GPS tracking shows your location.</p>
              </div>
            </div>
            
            <div className="flow-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>👤 Pick Up Passenger</h4>
                <p>Arrive at pickup location, confirm passenger identity, and start the ride.</p>
              </div>
            </div>
            
            <div className="flow-step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h4>🚗 Complete Ride</h4>
                <p>Drive to destination, complete the ride, and receive payment automatically.</p>
              </div>
            </div>
            
            <div className="flow-step">
              <div className="step-number">6</div>
              <div className="step-content">
                <h4>💳 Get Paid</h4>
                <p>Payment is processed automatically. Check your earnings in the "Driver Earnings" section.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offline State */}
      {!isOnline && (
        <div className="offline-state">
          <div className="offline-content">
            <FaToggleOff className="offline-icon" />
            <h3>You're Offline</h3>
            <p>Go online to start accepting ride requests</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
