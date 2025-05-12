import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { FaUser, FaIdCard, FaPhone, FaMapMarkerAlt, FaCar } from 'react-icons/fa';
import '../styles/DriverRegistration.css';

const DriverRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseImageUrl: '',
    profileImageUrl: '',
    vehicleType: '',
    yearsOfExperience: '',
    confirmations: {
      licenseInfo: false,
      backgroundCheck: false,
      termsAndConditions: false
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkDriverStatus = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const driverRef = doc(db, 'drivers', currentUser.uid);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          // If already a driver, redirect to DriverVehicle page instead of driver profile
          navigate('/DriverVehicle');
        }
      } catch (err) {
        console.error('Error checking driver status:', err);
        setError('Error checking driver status');
      } finally {
        setLoading(false);
      }
    };

    checkDriverStatus();
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const storageRef = ref(storage, `drivers/${currentUser.uid}/${type}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setFormData(prev => ({
        ...prev,
        [type === 'license' ? 'licenseImageUrl' : 'profileImageUrl']: downloadURL
      }));
    } catch (err) {
      setError('Error uploading image');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if driver already exists
      const driverRef = doc(db, 'drivers', currentUser.uid);
      const driverDoc = await getDoc(driverRef);
      
      if (driverDoc.exists()) {
        setError('You are already registered as a driver');
        return;
      }

      const driverData = {
        ...formData,
        userId: currentUser.uid,
        email: currentUser.email,
        createdAt: serverTimestamp(),
        status: 'pending',
        isApproved: false
      };

      // Add driver document to 'drivers' collection with user.uid as the document ID
      await setDoc(doc(db, 'drivers', currentUser.uid), driverData);
      navigate('/DriverVehicle');
    } catch (err) {
      setError('Error registering as driver: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-registration-container">
      <div className="registration-header">
        <h1>Become a Driver</h1>
        <p>Join our team of professional drivers and start earning today!</p>
        </div>

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-section">
          <h2>Personal Information</h2>
        <div className="form-group">
            <label>
              <FaUser className="input-icon" />
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
        </div>

        <div className="form-group">
            <label>
              <FaIdCard className="input-icon" />
              License Number
            </label>
            <input
              type="text"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              required
              placeholder="Enter your driver's license number"
            />
        </div>

        <div className="form-group">
            <label>
              <FaPhone className="input-icon" />
              Phone Number
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="Enter your phone number"
            />
        </div>
        </div>

        <div className="form-section">
          <h2>Address Information</h2>
        <div className="form-group">
            <label>
              <FaMapMarkerAlt className="input-icon" />
              Street Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              placeholder="Enter your street address"
            />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="Enter your city"
              />
            </div>

            <div className="form-group">
              <label>ZIP Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                placeholder="Enter your ZIP code"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Driver Information</h2>
          <div className="form-group">
            <label>
              <FaCar className="input-icon" />
              Years of Experience
            </label>
            <input
              type="number"
              name="yearsOfExperience"
              value={formData.yearsOfExperience}
              onChange={handleChange}
              required
              min="0"
              placeholder="Enter years of driving experience"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Emergency Contact</h2>
        <div className="form-group">
            <label>Contact Name</label>
            <input
              type="text"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              required
              placeholder="Enter emergency contact name"
            />
        </div>

        <div className="form-group">
            <label>Contact Phone</label>
            <input
              type="tel"
              name="emergencyContactPhone"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              required
              placeholder="Enter emergency contact phone number"
            />
        </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register as Driver'}
        </button>
      </form>
    </div>
  );
};

export default DriverRegistration;
