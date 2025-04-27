import React, { useState, useEffect } from "react";
import { FaCar, FaSearch, FaCalendarAlt, FaStar } from "react-icons/fa";
import axios from "axios";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import "../styles/Home.css"; // Make sure you have this file
import { useNavigate } from "react-router-dom"; // 👈 Add this at the top

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    type: '',
    priceRange: '',
    location: ''
  });
  const navigate = useNavigate()
  // State variables to hold data from the backend
  const [categories, setCategories] = useState([]);
  const [howItWorks, setHowItWorks] = useState([]);
  const [topRatedVehicles, setTopRatedVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch backend data when the component mounts
  useEffect(() => {
    axios.get("http://localhost:5000/api/categories")
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Categories error:", err));

    axios.get("http://localhost:5000/api/how-it-works")
      .then((res) => setHowItWorks(res.data))
      .catch((err) => console.error("How-it-works error:", err));

    // Fetch top rated vehicles from Firestore
    const fetchTopRatedVehicles = async () => {
      try {
        // Create a query to get top 3 vehicles sorted by rating
        const vehiclesQuery = query(
          collection(db, "vehicles"),
          orderBy("rating", "desc"),
          limit(3)
        );

        const querySnapshot = await getDocs(vehiclesQuery);
        const vehicles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setTopRatedVehicles(vehicles);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching top rated vehicles:", error);
        setLoading(false);
      }
    };

    fetchTopRatedVehicles();
  }, []);

  const handleSearch = () => {
    // Build query parameters including filters
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm);
    if (filters.type) params.set('type', filters.type);
    if (filters.priceRange) params.set('priceRange', filters.priceRange);
    if (filters.location) params.set('location', filters.location);

    // Navigate with all parameters
    navigate(`/all-vehicles?${params.toString()}`);
  };

  return (
    <div className="home-container">
      {/* Header Section */}
      <header className="hero-section">
        <h1>Find Your Perfect Ride</h1>
        <p>Book your ride with AI-powered recommendations and verified reviews</p>

        {/* Search Bar with Filters */}
        <div className="search-section">
        <div className="search-bar">
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-options">
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="luxury">Luxury</option>
            </select>

            <select
              value={filters.priceRange}
              onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
              className="filter-select"
            >
              <option value="">All Prices</option>
              <option value="low">$0 - $50</option>
              <option value="medium">$51 - $100</option>
              <option value="high">$100+</option>
            </select>

            <select
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className="filter-select"
            >
              <option value="">All Locations</option>
              <option value="new-york">New York</option>
              <option value="los-angeles">Los Angeles</option>
              <option value="chicago">Chicago</option>
            </select>

            <button onClick={handleSearch} className="search-btn">
              Search Cars
            </button>
          </div>
        </div>
      </header>

      {/* Popular Car Categories */}
      <section className="categories-section">
        <h2>Popular Car Categories</h2>
        <div className="categories">
          {categories.length > 0 ? (
            categories.map((car, index) => (
              <div className="category-card" key={index}>
                <p className="price-label">From {car.price}</p>
                <h3>{car.name}</h3>
                <p className="desc">{car.desc}</p>
                <button className="view-cars-btn"
                  onClick={() => navigate(`/all-vehicles?type=${car.type}`)}>View Cars</button>
              </div>
            ))
          ) : (
            // Fallback static content if backend data is not loaded
            <>
              <div className="category-card">
                <p className="price-label">From 350pkr/day</p>
                <h3>Economy</h3>
                <p className="desc">Compact cars for budget-conscious travelers</p>
                <button className="view-cars-btn"
                  onClick={() => navigate(`/all-vehicles?type=sedan`)}>View Cars</button>
              </div>
              <div className="category-card">
                <p className="price-label">From 600pkr/day</p>
                <h3>SUVs</h3>
                <p className="desc">Spacious SUVs perfect for families</p>
                <button className="view-cars-btn"
                  onClick={() => navigate(`/all-vehicles?type=suv`)}>View Cars</button>
              </div>
              <div className="category-card">
                <p className="price-label">From 1000/day</p>
                <h3>Luxury</h3>
                <p className="desc">Premium rides for special occasions</p>
                <button className="view-cars-btn"
                  onClick={() => navigate(`/all-vehicles?type=luxury`)}>View Cars</button>
              </div>
              <div className="category-card">
                <p className="price-label">From /day</p>
                <h3>Electric</h3>
                <p className="desc">Eco-friendly vehicles for the future</p>
                <button className="view-cars-btn"
                  onClick={() => navigate(`/all-vehicles?type=electric`)}>View Cars</button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          {howItWorks.length > 0 ? (
            howItWorks.map((item, index) => (
              <div className="step-card" key={index}>
                <div className="icon-circle">
                  {item.icon === "search" ? <FaSearch /> : item.icon === "calendar" ? <FaCalendarAlt /> : <FaCar />}
                </div>
                <h3>Step {index + 1}</h3>
                <p>{item.step}</p>
              </div>
            ))
          ) : (
            // Fallback static content
            <>
              <div className="step-card">
                <div className="icon-circle"><FaSearch /></div>
                <h3>Step 1</h3>
                <p>Search</p>
              </div>
              <div className="step-card">
                <div className="icon-circle"><FaCalendarAlt /></div>
                <h3>Step 2</h3>
                <p>Book</p>
              </div>
              <div className="step-card">
                <div className="icon-circle"><FaCar /></div>
                <h3>Step 3</h3>
                <p>Drive</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Top Rated Vehicles */}
      <section className="top-rated">
        <h2>Top Rated Vehicles</h2>
        <div className="vehicle-list">
          {loading ? (
            <p>Loading top rated vehicles...</p>
          ) : topRatedVehicles.length > 0 ? (
            topRatedVehicles.map((vehicle) => (
              <div 
                key={vehicle.id} 
                className="vehicle-item"
                onClick={() => navigate(`/vehicle/${vehicle.id}`)}
              >
                <div className="vehicle-image">
                  <img 
                    src={vehicle.imageUrl || 'https://via.placeholder.com/150'} 
                    alt={`${vehicle.make} ${vehicle.model}`}
                  />
                </div>
                <div className="vehicle-details">
                  <h4>{vehicle.make} {vehicle.model}</h4>
                  <p className="vehicle-type">{vehicle.vehicleType}</p>
                  <div className="vehicle-rating">
                    <span className="price">${vehicle.price}/day</span>
                    <span className="rating">
                      <FaStar className="star-icon" />
                      {vehicle.rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>No vehicles found</p>
          )}
        </div>
        <button 
          className="view-all-btn"
          onClick={() => navigate("/all-vehicles")}
        >
          View All Vehicles
        </button>
      </section>

      {/* Become a Driver Partner */}
<section className="driver-partner">
  <div className="driver-container">
    {/* Left Side - Text Content */}
    <div className="driver-info">
      <h2>Become a Driver Partner</h2>
      <p style={{ textAlign: "justify" }}>
        RIDEX will be a platform built to simplify and improve the vehicle rental process for 
        customers. This platform allows customers to easily rent and book cars, make secure payments 
        and track their payment history through our platform. Vehicle owners will be registering their 
        vehicles and will be registering as a driver and developing their business with us.
      </p>
            <button className="register-btn"
            onClick={() => navigate("/DriverRegistration")}>Register as Driver</button>
    </div>

    {/* Right Side - Car Image */}
    <div className="driver-image">
      <img src="https://img.freepik.com/free-photo/man-car-driving_23-2148889981.jpg?ga=GA1.1.1390298110.1738004125&semt=ais_hybrid" alt="Car" />
    </div>
  </div>
</section>
    </div>
  );
};

export default Home;
