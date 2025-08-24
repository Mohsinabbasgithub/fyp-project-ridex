import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { FaMoneyBillWave, FaWallet, FaHistory, FaCreditCard, FaCashRegister, FaPlus, FaMinus } from 'react-icons/fa';
import '../styles/Payments.css';

const Payments = () => {
  const { currentUser, userRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddMethod, setShowAddMethod] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        let paymentsQuery;
        
        if (userRole === 'driver') {
          // For drivers, fetch payments where they are the driver
          paymentsQuery = query(
            collection(db, 'payments'),
            where('driverId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
        } else {
          // For users, fetch payments where they are the user
          paymentsQuery = query(
            collection(db, 'payments'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
        }
        
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

    const fetchWalletBalance = async () => {
      try {
        const walletRef = doc(db, 'wallets', currentUser.uid);
        const walletDoc = await getDocs(walletRef);
        if (walletDoc.exists()) {
          setWalletBalance(walletDoc.data().balance || 0);
        } else {
          // Create wallet if it doesn't exist
          await addDoc(collection(db, 'wallets'), {
            userId: currentUser.uid,
            balance: 0,
            createdAt: new Date()
          });
          setWalletBalance(0);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(0);
      }
    };

    const fetchPaymentMethods = async () => {
      try {
        const methodsQuery = query(
          collection(db, 'paymentMethods'),
          where('userId', '==', currentUser.uid)
        );
        const methodsSnapshot = await getDocs(methodsQuery);
        const methodsData = methodsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPaymentMethods(methodsData);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };

    if (currentUser) {
      fetchPayments();
      fetchWalletBalance();
      fetchPaymentMethods();
    }
  }, [currentUser, userRole]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
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

  const handleAddFunds = async (amount) => {
    try {
      const walletRef = doc(db, 'wallets', currentUser.uid);
      await updateDoc(walletRef, {
        balance: walletBalance + amount
      });
      setWalletBalance(walletBalance + amount);
      
      // Add payment record
      await addDoc(collection(db, 'payments'), {
        userId: currentUser.uid,
        amount: amount,
        type: 'wallet_recharge',
        status: 'completed',
        description: 'Wallet Recharge',
        paymentMethod: 'wallet',
        timestamp: new Date(),
        transactionId: `WAL-${Date.now()}`
      });
      
      alert(`Successfully added PKR ${amount} to your wallet!`);
    } catch (error) {
      console.error('Error adding funds:', error);
      alert('Failed to add funds. Please try again.');
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
        <h1>{userRole === 'driver' ? 'Driver Earnings' : 'Payments'}</h1>
        <div className="payment-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FaHistory /> {userRole === 'driver' ? 'Earnings History' : 'Payment History'}
          </button>
          <button
            className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            <FaWallet /> App Wallet
          </button>
          {userRole === 'user' && (
            <button
              className={`tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
              onClick={() => setActiveTab('methods')}
            >
              <FaCreditCard /> Payment Methods
            </button>
          )}
        </div>
      </div>

      {activeTab === 'history' ? (
        <div className="payment-history">
          <h2>{userRole === 'driver' ? 'Earnings History' : 'Payment History'}</h2>
          {payments.length > 0 ? (
            <div className="payments-list">
              {payments.map(payment => (
                <div key={payment.id} className="payment-card">
                  <div className="payment-info">
                    <div className="payment-primary">
                      <h3>{payment.description || 'Ride Payment'}</h3>
                      <span className={`payment-status ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="payment-details">
                      <p>Transaction ID: {payment.transactionId}</p>
                      <p>Date: {new Date(payment.timestamp?.toDate?.() || payment.timestamp).toLocaleDateString()}</p>
                      <p>Payment Method: {payment.paymentMethod === 'wallet' ? 'App Wallet' : payment.paymentMethod || 'Cash'}</p>
                      {userRole === 'driver' && payment.rideId && (
                        <p>Ride ID: {payment.rideId}</p>
                      )}
                    </div>
                  </div>
                  <div className="payment-amount">
                    <h3>PKR {payment.amount?.toFixed(2) || '0.00'}</h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-payments">
              <h3>No {userRole === 'driver' ? 'earnings' : 'payment'} history found</h3>
            </div>
          )}
        </div>
      ) : activeTab === 'wallet' ? (
        <div className="wallet-section">
          <h2>App Wallet</h2>
          <div className="wallet-balance-card">
            <FaWallet className="wallet-icon" />
            <div>
              <h3>Wallet Balance</h3>
              <p className="wallet-balance">PKR {walletBalance.toFixed(2)}</p>
            </div>
          </div>
          
          {userRole === 'user' && (
            <div className="wallet-actions">
              <button 
                className="add-funds-btn"
                onClick={() => handleAddFunds(100)}
              >
                <FaPlus /> Add PKR 100
              </button>
              <button 
                className="add-funds-btn"
                onClick={() => handleAddFunds(500)}
              >
                <FaPlus /> Add PKR 500
              </button>
              <button 
                className="add-funds-btn"
                onClick={() => handleAddFunds(1000)}
              >
                <FaPlus /> Add PKR 1000
              </button>
            </div>
          )}
          
          <div className="wallet-info">
            <p>You can pay for your rides using your App Wallet balance or choose Cash on Delivery at the end of your ride.</p>
            {userRole === 'user' && (
              <p>To add funds to your wallet, use the buttons above or contact support.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="payment-methods">
          <h2>Payment Methods</h2>
          <div className="methods-header">
            <button 
              className="add-method-btn"
              onClick={() => setShowAddMethod(true)}
            >
              <FaPlus /> Add Payment Method
            </button>
          </div>
          
          {paymentMethods.length > 0 ? (
            <div className="saved-methods">
              {paymentMethods.map(method => (
                <div key={method.id} className="method-card">
                  <div className="card-icon">
                    <FaCreditCard />
                  </div>
                  <div className="card-info">
                    <h3>{method.type}</h3>
                    <p>**** **** **** {method.last4}</p>
                  </div>
                  <div className="card-actions">
                    <button className="edit-btn">Edit</button>
                    <button className="delete-btn">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-methods">
              <h3>No payment methods saved</h3>
              <p>Add a payment method to make payments faster.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Payments; 