import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PrivateRoute = ({ children, role, requireDriverRegistration }) => {
  const { currentUser, userRole, loading } = useAuth();
  const [driverRegistered, setDriverRegistered] = useState(null);
  useEffect(() => {
    const checkDriverRegistration = async () => {
      if (requireDriverRegistration && userRole === 'driver' && currentUser) {
        try {
          const driverRef = doc(db, 'drivers', currentUser.uid);
          const driverDoc = await getDoc(driverRef);
          setDriverRegistered(driverDoc.exists());
        } catch {
          setDriverRegistered(false);
        }
      } else {
        setDriverRegistered(null);
      }
    };
    checkDriverRegistration();
  }, [requireDriverRegistration, userRole, currentUser]);

  if (loading || (requireDriverRegistration && userRole === 'driver' && driverRegistered === null)) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/SignupForm" />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" />;
  }

  if (requireDriverRegistration && userRole === 'driver' && !driverRegistered) {
    return <Navigate to="/DriverRegistration" />;
  }

  return children;
};

export default PrivateRoute; 