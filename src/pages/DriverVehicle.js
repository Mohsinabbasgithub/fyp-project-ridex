import React, { useState, useEffect } from "react";
import { db, storage } from "../firebase";
import { collection, addDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import "../styles/DriverVehicle.css";
const DriverVehicle = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    licensePlate: '',
    vehicleType: '',
    seatingCapacity: '',
    transmission: '',
    fuelType: '',
    imageUrl: '',
    price: '',
    features: {
      airConditioning: false,
      musicSystem: false,
      wifi: false,
      chargingPorts: false,
      childSeat: false,
      gps: false
    },
    confirmations: {
      vehicleInfo: false,
      termsAndConditions: false
    },
    type: '',
    location: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchDriverId = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const driverRef = doc(db, 'drivers', currentUser.uid);
        const driverDoc = await getDoc(driverRef);
        
        if (driverDoc.exists()) {
          console.log('Driver found:', driverDoc.data());
          setDriverId(currentUser.uid);
          setError('');
        } else {
          console.log('No driver found for:', currentUser.uid);
          setError('Please complete your driver registration first');
          setDriverId(null);
        }
      } catch (err) {
        console.error('Error fetching driver:', err);
        setError('Error fetching driver information');
        setDriverId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDriverId();
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prevData) => ({
        ...prevData,
        features: {
          ...prevData.features,
          [name]: checked
        }
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
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

  const handleConfirmationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      confirmations: {
        ...prev.confirmations,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driverId) {
      setError('Driver information not found');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const vehicleData = {
        ...formData,
        driverId,
        createdAt: serverTimestamp(),
        isApproved: false,
        status: 'pending'
      };

      const vehiclesRef = collection(db, 'vehicles');
      await addDoc(vehiclesRef, vehicleData);
      
      // Initialize driver profile with online/available status
      const driverRef = doc(db, 'drivers', driverId);
      await updateDoc(driverRef, {
        isOnline: false,
        isAvailable: false,
        hasVehicle: true,
        lastUpdated: serverTimestamp()
      });
      
      navigate('/driver-dashboard');
    } catch (err) {
      setError('Error adding vehicle');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h2 className="title">Loading...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="title">Vehicle Registration</h2>
      <p className="subtitle">Add your vehicle details to start accepting rides</p>

      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
          {!driverId && (
            <button 
              className="register-btn" 
              onClick={() => navigate('/DriverRegistration')}
            >
              Register as Driver
            </button>
          )}
        </div>
      )}

      {driverId && (
        <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Make</label>
            <input type="text" name="make" value={formData.make} onChange={handleChange} placeholder="Enter vehicle make" required />
        </div>

        <div className="form-group">
          <label>Model</label>
            <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="Enter vehicle model" required />
        </div>

        <div className="form-group">
          <label>Year</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} placeholder="Enter vehicle year" required />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} placeholder="Enter vehicle color" required />
        </div>

        <div className="form-group">
            <label>License Plate Number</label>
            <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} placeholder="Enter license plate number" required />
        </div>

        <div className="form-group">
            <label>Vehicle Type</label>
            <select name="type" value={formData.type} onChange={handleChange} required>
              <option value="">Select vehicle type</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="van">Van</option>
              <option value="luxury">Luxury</option>
            </select>
        </div>

        <div className="form-group">
            <label>Seating Capacity</label>
            <input type="number" name="seatingCapacity" value={formData.seatingCapacity} onChange={handleChange} placeholder="Enter seating capacity" required />
        </div>

        <div className="form-group">
            <label>Transmission</label>
            <select name="transmission" value={formData.transmission} onChange={handleChange} required>
              <option value="">Select transmission type</option>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
        </div>

        <div className="form-group">
            <label>Fuel Type</label>
            <select name="fuelType" value={formData.fuelType} onChange={handleChange} required>
              <option value="">Select fuel type</option>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
        </div>

        <div className="form-group">
            <label>Vehicle Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="Enter vehicle image URL"
            required
          />
            {formData.imageUrl && (
          <div className="image-preview">
                <p>Image Preview:</p>
              <img 
                  src={formData.imageUrl} 
                  alt="Vehicle preview" 
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/300x200?text=Invalid+Image+URL";
                  }} 
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Price Per Day</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Enter price per day" required />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Enter vehicle location" required />
          </div>

          <div className="form-group">
            <label>Features</label>
            <div className="checkbox-group">
              <label>
                <input type="checkbox" name="airConditioning" checked={formData.features.airConditioning} onChange={(e) => handleCheckboxChange('features', 'airConditioning', e.target.checked)} />
                Air Conditioning
              </label>
              <label>
                <input type="checkbox" name="musicSystem" checked={formData.features.musicSystem} onChange={(e) => handleCheckboxChange('features', 'musicSystem', e.target.checked)} />
                Music System
              </label>
              <label>
                <input type="checkbox" name="wifi" checked={formData.features.wifi} onChange={(e) => handleCheckboxChange('features', 'wifi', e.target.checked)} />
                WiFi
              </label>
              <label>
                <input type="checkbox" name="chargingPorts" checked={formData.features.chargingPorts} onChange={(e) => handleCheckboxChange('features', 'chargingPorts', e.target.checked)} />
                Charging Ports
              </label>
              <label>
                <input type="checkbox" name="childSeat" checked={formData.features.childSeat} onChange={(e) => handleCheckboxChange('features', 'childSeat', e.target.checked)} />
                Child Seat
              </label>
              <label>
                <input type="checkbox" name="gps" checked={formData.features.gps} onChange={(e) => handleCheckboxChange('features', 'gps', e.target.checked)} />
                GPS Navigation
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmations</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.confirmations.vehicleInfo}
                  onChange={(e) => handleConfirmationChange('vehicleInfo', e.target.checked)}
                />
                I confirm that all vehicle information is accurate
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.confirmations.termsAndConditions}
                  onChange={(e) => handleConfirmationChange('termsAndConditions', e.target.checked)}
                />
                I agree to the terms and conditions
              </label>
            </div>
          </div>

          <div className="button-group">
            <button type="button" className="cancel-btn" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>Register Vehicle</button>
          </div>
      </form>
      )}
    </div>
  );
};

export default DriverVehicle;
