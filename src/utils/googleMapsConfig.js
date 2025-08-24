// Shared Google Maps API configuration
export const googleMapsConfig = {
  googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  libraries: ['maps', 'places']
};

// Default map options
export const defaultMapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

// Default center (India)
export const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

// Container style for maps
export const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px',
  margin: '20px 0',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
};
