import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FaCreditCard, FaHistory, FaPlus } from 'react-icons/fa';
import '../styles/Payments.css';

const Payments = () => {
  const { currentUser, userProfile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPayments(paymentsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching payments:', error);
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchPayments();
    }
  }, [currentUser]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-success';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="payments-loading">
        <h2>Loading payments...</h2>
      </div>
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h1>Payments</h1>
        <div className="payment-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FaHistory /> Payment History
          </button>
          <button
            className={`tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
            onClick={() => setActiveTab('methods')}
          >
            <FaCreditCard /> Payment Methods
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="payment-history">
          <h2>Payment History</h2>
          {payments.length > 0 ? (
            <div className="payments-list">
              {payments.map(payment => (
                <div key={payment.id} className="payment-card">
                  <div className="payment-info">
                    <div className="payment-primary">
                      <h3>{payment.description}</h3>
                      <span className={`payment-status ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="payment-details">
                      <p>Transaction ID: {payment.transactionId}</p>
                      <p>Date: {new Date(payment.timestamp).toLocaleDateString()}</p>
                      <p>Payment Method: {payment.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="payment-amount">
                    <h3>${payment.amount.toFixed(2)}</h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-payments">
              <h3>No payment history found</h3>
            </div>
          )}
        </div>
      ) : (
        <div className="payment-methods">
          <div className="methods-header">
            <h2>Payment Methods</h2>
            <button className="add-method-btn">
              <FaPlus /> Add Payment Method
            </button>
          </div>

          <div className="saved-methods">
            <div className="method-card">
              <FaCreditCard className="card-icon" />
              <div className="card-info">
                <h3>•••• •••• •••• 1234</h3>
                <p>Expires 12/24</p>
              </div>
              <div className="card-actions">
                <button className="edit-btn">Edit</button>
                <button className="delete-btn">Delete</button>
              </div>
            </div>

            {/* Add more saved payment methods here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments; 