import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { currentUser, loading, isAdmin } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser || !isAdmin) {
    return <Navigate to="/admin-login" />;
  }
  
  return children;
};

export default AdminRoute; 