import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Bookings.css';

const Bookings = () => {
  const { currentUser } = useAuth();

  return (
    <div className="bookings-container">
      <h1>My Bookings</h1>
      <div className="bookings-list">
        {/* Bookings will be displayed here */}
        <p>No bookings found</p>
      </div>
    </div>
  );
};

export default Bookings; 