import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const BookingConfirmation = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'bookings', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setBooking({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading confirmation...</div>;
  if (error) return <div style={{ padding: '2rem' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <h1>Booking Confirmed</h1>
      <p>Your ride has been completed successfully.</p>
      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: 8 }}>
        <p><strong>Booking ID:</strong> {id}</p>
        {booking && (
          <>
            <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
            <p><strong>Destination:</strong> {booking.destination}</p>
            <p><strong>Final Price:</strong> {booking.finalPrice || booking.estimatedPrice || 0}</p>
            <p><strong>Status:</strong> {booking.status}</p>
          </>
        )}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/ride-history">Go to Ride History</Link>
      </div>
    </div>
  );
};

export default BookingConfirmation;

 