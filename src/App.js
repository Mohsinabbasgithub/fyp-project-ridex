import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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

// Protected Pages
import Dashboard from "./pages/Dashboard";
import DriverRegistration from "./pages/DriverRegistration";
import DriverVehicle from "./pages/DriverVehicle";
import Profile from "./pages/Profile";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import BookingConfirmation from "./pages/BookingConfirmation";
import Settings from "./pages/Settings";
import FeedbackPage from './pages/FeedbackPage';



const App = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/admin-');

  return (
    <AuthProvider>
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
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/add-vehicle"
              element={
                <AdminRoute>
                  <AddVehicle />
                </AdminRoute>
              }
            />

            {/* Protected Routes */}
            <Route path="/Dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/DriverRegistration" element={
              <PrivateRoute>
                <DriverRegistration />
              </PrivateRoute>
            } />
            <Route path="/DriverVehicle" element={
              <PrivateRoute>
                <DriverVehicle />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/bookings" element={
              <PrivateRoute>
                <Bookings />
              </PrivateRoute>
            } />
            <Route path="/payments" element={
              <PrivateRoute>
                <Payments />
              </PrivateRoute>
            } />
            <Route path="/booking-confirmation/:id" element={
              <PrivateRoute>
                <BookingConfirmation />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } />
            <Route path="/vehicle/:vehicleId/feedback" element={<FeedbackPage />} />
          </Routes>
        </main>
        {!isAdminPage && <Footer />}
        {!isAdminPage && <Chatbot />}
      </div>
    </AuthProvider>
  );
};

export default App;
