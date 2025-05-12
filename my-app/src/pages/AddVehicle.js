import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/AddVehicle.css';

const AddVehicle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicleData, setVehicleData] = useState({
    make: '',
    model: '',
    year: '',
    type: '',
    color: '',
    licensePlate: '',
    registrationNumber: '',
    capacity: '',
    rate: '',
    status: 'pending',
    isApproved: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const vehicleRef = collection(db, 'vehicles');
      await addDoc(vehicleRef, {
        ...vehicleData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      navigate('/admin-dashboard');
    } catch (err) {
      setError('Failed to add vehicle: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-vehicle-container">
      <h2>Add New Vehicle</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="add-vehicle-form">
        <div className="form-group">
          <label>Make</label>
          <input
            type="text"
            name="make"
            value={vehicleData.make}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Model</label>
          <input
            type="text"
            name="model"
            value={vehicleData.model}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Year</label>
          <input
            type="number"
            name="year"
            value={vehicleData.year}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Type</label>
          <select
            name="type"
            value={vehicleData.type}
            onChange={handleChange}
            required
          >
            <option value="">Select Type</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
          </select>
        </div>

        <div className="form-group">
          <label>Color</label>
          <input
            type="text"
            name="color"
            value={vehicleData.color}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>License Plate</label>
          <input
            type="text"
            name="licensePlate"
            value={vehicleData.licensePlate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Registration Number</label>
          <input
            type="text"
            name="registrationNumber"
            value={vehicleData.registrationNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Capacity (persons)</label>
          <input
            type="number"
            name="capacity"
            value={vehicleData.capacity}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Rate (per day)</label>
          <input
            type="number"
            name="rate"
            value={vehicleData.rate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Vehicle'}
          </button>
          <button type="button" onClick={() => navigate('/admin-dashboard')} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicle; 