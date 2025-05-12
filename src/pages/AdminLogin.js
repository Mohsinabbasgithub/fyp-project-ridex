import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaCar } from 'react-icons/fa';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import '../styles/AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function setupAdminInFirestore(uid) {
    try {
      const adminRef = doc(db, 'admins', uid);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        // Create new admin document if it doesn't exist
        await setDoc(adminRef, {
          email: email,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else {
        // Update last login time if admin exists
        await setDoc(adminRef, {
          lastLogin: new Date().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error setting up admin:', error);
      throw new Error('Failed to setup admin account');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);

      // First sign in to get the user ID
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Setup or update admin in Firestore
      await setupAdminInFirestore(uid);

      // Proceed with login through AuthContext
      await login(email, password, true);
      navigate('/admin-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' 
        ? 'Invalid email or password' 
        : 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav className="admin-navbar">
        <div className="admin-navbar-container">
          <div className="admin-navbar-logo">
            <FaCar className="logo-icon" />
            <span>RideX Admin</span>
          </div>
        </div>
      </nav>
      <div className="admin-login-container">
        <div className="admin-login-form">
          <h2>Admin Login</h2>
          {error && <div className="error-alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button disabled={loading} type="submit" className="admin-login-btn">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
} 