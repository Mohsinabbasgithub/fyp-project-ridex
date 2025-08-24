import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { GoogleMapsProvider } from "./context/GoogleMapsContext";
import PrivateRoute from "./components/PrivateRoute";
import Chatbot from './components/Chatbot';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminRoute from './components/AdminRoute';

// Layout Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Public Pages
import Home from "./pages/Home";
import SignupForm from "./pages/SignupForm";
import Signupregister from "./pages/Signupregister";
import AllVehicles from "./pages/AllVehicles";
import VehicleDetails from "./pages/VehicleDetails";
import AddVehicle from "./pages/AddVehicle";
import DriverDetails from "./pages/DriverDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import LoginForm from './pages/LoginForm';
import UserSignup from './pages/UserSignup';
import DriverSignup from './pages/DriverSignup';

// Protected Pages
import Dashboard from "./pages/Dashboard";
import DriverRegistration from "./pages/DriverRegistration";
import DriverVehicle from "./pages/DriverVehicle";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import BookingConfirmation from "./pages/BookingConfirmation";
import FeedbackPage from './pages/FeedbackPage';
import AllReviews from './pages/AllReviews';

// InDrive-like Features
import RideBooking from "./pages/RideBooking";
import DriverDashboard from "./pages/DriverDashboard";
import RideHistory from './pages/RideHistory';


const App = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin-');

  return (
    <AuthProvider>
      <GoogleMapsProvider>
        <div className="app-container">
          {!isAdminPage && <Navbar />}
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/SignupForm" element={<SignupForm />} />
              <Route path="/Signupregister" element={<Signupregister />} />
              <Route path="/all-vehicles" element={<AllVehicles />} />
              <Route path="/vehicle/:id" element={<VehicleDetails />} />
              <Route path="/driver/:driverId" element={<DriverDetails />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/admin-login" element={
                <AdminAuthProvider>
                  <AdminLogin />
                </AdminAuthProvider>
              } />
              <Route path="/signup-user" element={<UserSignup />} />
              <Route path="/signup-driver" element={<DriverSignup />} />

              {/* Admin Routes - Only for admins */}
              <Route
                path="/admin-dashboard"
                element={
                  <AdminAuthProvider>
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  </AdminAuthProvider>
                }
              />
              <Route
                path="/add-vehicle"
                element={
                  <AdminAuthProvider>
                    <AdminRoute>
                      <AddVehicle />
                    </AdminRoute>
                  </AdminAuthProvider>
                }
              />

              {/* User-only Protected Routes */}
              <Route path="/Dashboard" element={
                <PrivateRoute role="user">
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute role="user">
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="/bookings" element={
                <PrivateRoute role="user">
                  <Bookings />
                </PrivateRoute>
              } />
              <Route path="/payments" element={
                <PrivateRoute role="user">
                  <Payments />
                </PrivateRoute>
              } />
              <Route path="/booking-confirmation/:id" element={
                <PrivateRoute role="user">
                  <BookingConfirmation />
                </PrivateRoute>
              } />
              <Route path="/ride-booking" element={
                <PrivateRoute role="user">
                  <RideBooking />
                </PrivateRoute>
              } />

              {/* Driver-only Protected Routes */}
              <Route path="/DriverRegistration" element={
                <PrivateRoute role="driver">
                  <DriverRegistration />
                </PrivateRoute>
              } />
              <Route path="/DriverVehicle" element={
                <PrivateRoute role="driver" requireDriverRegistration={true}>
                  <DriverVehicle />
                </PrivateRoute>
              } />
              <Route path="/driver-dashboard" element={
                <PrivateRoute role="driver" requireDriverRegistration={true}>
                  <DriverDashboard />
                </PrivateRoute>
              } />

              {/* Shared but protected: RideHistory (user or driver only) */}
              <Route path="/ride-history" element={
                <PrivateRoute>
                  <RideHistory />
                </PrivateRoute>
              } />
              <Route path="/feedback" element={<AllReviews />} />
              <Route path="/vehicle/:vehicleId/feedback" element={<FeedbackPage />} />
            </Routes>
          </main>
          {!isAdminPage && <Footer />}
          {!isAdminPage && <Chatbot />}
        </div>
      </GoogleMapsProvider>
    </AuthProvider>
  );
};

export default App;
