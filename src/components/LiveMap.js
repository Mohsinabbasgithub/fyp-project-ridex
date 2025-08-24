/* global google */
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useGoogleMaps } from '../context/GoogleMapsContext';
import { defaultMapOptions, defaultCenter, mapContainerStyle } from '../utils/googleMapsConfig';

const LiveMap = ({ userLocation, driverLocation, pickupLocation, destination, showRoute = false }) => {
  const { isLoaded } = useGoogleMaps();

  const [directions, setDirections] = useState(null);
  const [eta, setEta] = useState(null);

  // Center map between user and driver if both exist
  let center = defaultCenter;
  if (userLocation && driverLocation) {
    center = {
      lat: (userLocation.lat + driverLocation.lat) / 2,
      lng: (userLocation.lng + driverLocation.lng) / 2
    };
  } else if (userLocation) {
    center = userLocation;
  } else if (driverLocation) {
    center = driverLocation;
  }

  // Calculate route and ETA
  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !pickupLocation || !destination) return;

    const directionsService = new google.maps.DirectionsService();
    
    try {
      const result = await directionsService.route({
        origin: pickupLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      setDirections(result);
      
      // Calculate ETA
      if (result.routes[0]?.legs[0]?.duration) {
        const duration = result.routes[0].legs[0].duration.text;
        setEta(duration);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [isLoaded, pickupLocation, destination]);

  useEffect(() => {
    if (showRoute) {
      calculateRoute();
    }
  }, [showRoute, calculateRoute]);

  // Auto-update driver location every 10 seconds
  useEffect(() => {
    if (!driverLocation) return;

    const interval = setInterval(() => {
      // This would typically update the driver's location in Firestore
      // For now, we'll just log the current location
      console.log('Driver location updated:', driverLocation);
    }, 10000);

    return () => clearInterval(interval);
  }, [driverLocation]);

  return isLoaded ? (
    <div className="live-map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={defaultMapOptions}
      >
        {/* Route display */}
        {showRoute && directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              polylineOptions: {
                strokeColor: '#4285F4',
                strokeWeight: 4,
              },
            }}
          />
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            label={{ text: 'You', color: 'white', fontWeight: 'bold' }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
        )}

        {/* Driver location marker */}
        {driverLocation && (
          <Marker
            position={driverLocation}
            label={{ text: 'Driver', color: 'white', fontWeight: 'bold' }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
        )}

        {/* Pickup location marker */}
        {pickupLocation && !userLocation && (
          <Marker
            position={pickupLocation}
            label={{ text: 'Pickup', color: 'white', fontWeight: 'bold' }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
        )}

        {/* Destination marker */}
        {destination && (
          <Marker
            position={destination}
            label={{ text: 'Destination', color: 'white', fontWeight: 'bold' }}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
          />
        )}
      </GoogleMap>

      {/* ETA Display */}
      {eta && (
        <div className="eta-display">
          <div className="eta-info">
            <span className="eta-label">Estimated Arrival:</span>
            <span className="eta-time">{eta}</span>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div style={{ textAlign: 'center', padding: '30px 0' }}>Loading map...</div>
  );
};

export default React.memo(LiveMap);
