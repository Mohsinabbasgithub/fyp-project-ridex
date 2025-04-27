import React, { useState, useEffect } from 'react';
import { getVehicle } from '../utils/firebaseUtils';
import Rating from './Rating';

const AllVehicles = () => {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      // Assuming you have a function to fetch all vehicles
      // This is a placeholder for the actual implementation
      const fetchedVehicles = await fetchVehiclesFromServer();
      setVehicles(fetchedVehicles);
    };

    fetchVehicles();
  }, []);

  return (
    <div>
      <h1>All Vehicles</h1>
      {vehicles.map((vehicle) => (
        <div key={vehicle.id}>
          <h2>{vehicle.name}</h2>
          <p>{vehicle.description}</p>
          <Rating />
        </div>
      ))}
    </div>
  );
};

export default AllVehicles; 