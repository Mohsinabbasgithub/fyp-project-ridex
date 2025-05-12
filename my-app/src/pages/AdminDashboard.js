import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/AdminDashboard.css';
import { FaUsers, FaCar, FaCalendarAlt, FaCheck, FaTimes, FaSignOutAlt, FaEdit, FaFilter } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    fetchPendingData();
  }, [activeTab]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin-login');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'vehicles':
          await fetchVehicles();
          break;
        case 'users':
          await fetchUsers();
          break;
        case 'bookings':
          await fetchBookings();
          break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      let vehiclesQuery;
      
      if (statusFilter === 'all') {
        // Show all vehicles, including approved ones
        vehiclesQuery = query(collection(db, 'vehicles'));
      } else {
        // Filter by status
        vehiclesQuery = query(
          collection(db, 'vehicles'),
          where('status', '==', statusFilter.toLowerCase())
        );
      }
      
      const snapshot = await getDocs(vehiclesQuery);
      const vehiclesData = [];
      
      for (const vehicleDoc of snapshot.docs) {
        const data = vehicleDoc.data();
        const vehicleData = {
          id: vehicleDoc.id,
          ...data,
          status: data.status || (data.isApproved ? 'approved' : 'pending')
        };
        
        if (vehicleData.driverId) {
          const driverRef = doc(db, 'drivers', vehicleData.driverId);
          const driverDoc = await getDoc(driverRef);
          if (driverDoc.exists()) {
            vehicleData.driverDetails = driverDoc.data();
          }
        }
        
        vehiclesData.push(vehicleData);
      }

      // Sort vehicles to show approved ones first
      const sortedVehicles = vehiclesData.sort((a, b) => {
        if (a.status === 'approved' && b.status !== 'approved') return -1;
        if (a.status !== 'approved' && b.status === 'approved') return 1;
        return 0;
      });

      setVehicles(sortedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to fetch vehicles');
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch both users and their driver profiles if they exist
      const usersQuery = query(collection(db, 'users'));
      const driversQuery = query(collection(db, 'drivers'));
      
      const [usersSnapshot, driversSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(driversQuery)
      ]);

      // Create a map of driver data by userId
      const driversMap = {};
      driversSnapshot.docs.forEach(doc => {
        driversMap[doc.data().userId] = {
          ...doc.data(),
          driverId: doc.id
        };
      });

      const usersData = usersSnapshot.docs.map(doc => {
        const userData = doc.data();
        const driverData = driversMap[doc.id] || null;
        
        return {
          id: doc.id,
          email: userData.email,
          name: userData.fullName || userData.displayName || 'N/A',
          role: userData.role || 'user',
          status: userData.status || 'active',
          isDriver: !!driverData,
          driverDetails: driverData,
          driverId: driverData?.driverId
        };
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    }
  };

  const fetchBookings = async () => {
    const bookingsQuery = query(collection(db, 'bookings'));
    const snapshot = await getDocs(bookingsQuery);
    const bookingsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setBookings(bookingsData);
  };

  const fetchPendingData = async () => {
    try {
      // Fetch pending drivers
      const driversQuery = query(
        collection(db, 'drivers'),
        where('isApproved', '==', false)
      );
      const driversSnapshot = await getDocs(driversQuery);
      const driversData = driversSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingDrivers(driversData);

      // Fetch pending vehicles
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('isApproved', '==', false)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingVehicles(vehiclesData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching pending data:', error);
      setLoading(false);
    }
  };

  const handleApproval = async (id, type, status) => {
    try {
      const docRef = doc(db, type === 'driver' ? 'drivers' : 'vehicles', id);
      const normalizedStatus = status.toLowerCase();
      const updateData = {
        status: normalizedStatus,
        updatedAt: new Date(),
        isApproved: normalizedStatus === 'approved',
        approvedAt: normalizedStatus === 'approved' ? new Date() : null,
        isVisible: normalizedStatus === 'approved'
      };
      
      // First update the vehicle/driver document
      await updateDoc(docRef, updateData);

      if (type === 'vehicle') {
        const vehicleDoc = await getDoc(docRef);
        const vehicleData = vehicleDoc.data();
        
        if (vehicleData.driverId) {
          // Get the driver's document
          const driverRef = doc(db, 'drivers', vehicleData.driverId);
          const driverDoc = await getDoc(driverRef);
          
          if (driverDoc.exists()) {
            // Get current vehicles array or initialize it
            const currentVehicles = driverDoc.data().vehicles || {};
            
            // Update the vehicle status in the driver's vehicles collection
            const updatedVehicles = {
              ...currentVehicles,
              [id]: {
                ...vehicleData,
                ...updateData,
                id: id
              }
            };
            
            // Update the driver document with the new vehicles data
            await updateDoc(driverRef, {
              vehicles: updatedVehicles,
              lastUpdated: new Date()
            });
          }
        }
      }

      // Refresh the data immediately
      await fetchData();
      await fetchPendingData();
    } catch (error) {
      console.error('Error updating approval status:', error);
      alert('Failed to update approval status');
    }
  };

  const handleEditVehicle = async (vehicleId) => {
    const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
    setSelectedVehicle({ id: vehicleId, ...vehicleDoc.data() });
    setIsEditModalOpen(true);
  };

  const handleUpdateVehicle = async (updatedData) => {
    try {
      const vehicleRef = doc(db, 'vehicles', selectedVehicle.id);
      await updateDoc(vehicleRef, {
        ...updatedData,
        updatedAt: new Date()
      });
      
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle');
    }
  };

  const renderVehicles = () => (
    <div className="admin-table-container">
      <div className="table-controls">
        <div className="status-filter">
          <FaFilter className="filter-icon" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Type</th>
            <th>Status</th>
            <th>Registration Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map(vehicle => (
            <tr key={vehicle.id} className={`status-${vehicle.status || 'pending'}`}>
              <td>{vehicle.make} {vehicle.model}</td>
              <td>
                {vehicle.driverDetails ? (
                  <div className="driver-info">
                    <span>{vehicle.driverDetails.fullName}</span>
                    <small>{vehicle.driverDetails.phone}</small>
                  </div>
                ) : (
                  vehicle.driverName
                )}
              </td>
              <td>{vehicle.type}</td>
              <td>
                <span className={`status-badge ${vehicle.status || ''}`}>
                  {vehicle.status === 'pending' ? '' : vehicle.status}
                </span>
              </td>
              <td>
                {vehicle.createdAt ? new Date(vehicle.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </td>
              <td>
                <div className="action-buttons">
                  {vehicle.status === 'pending' && (
                    <>
                      <button
                        className="approve-btn"
                        onClick={() => handleApproval(vehicle.id, 'vehicle', 'approved')}
                      >
                        <FaCheck /> Approve
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleApproval(vehicle.id, 'vehicle', 'denied')}
                      >
                        <FaTimes /> Deny
                      </button>
                    </>
                  )}
                  <button
                    className="edit-btn"
                    onClick={() => handleEditVehicle(vehicle.id)}
                  >
                    <FaEdit /> Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditModalOpen && selectedVehicle && (
        <div className="edit-modal">
          <div className="modal-content">
            <h2>Edit Vehicle</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const updatedData = Object.fromEntries(formData.entries());
              handleUpdateVehicle(updatedData);
            }}>
              <div className="form-group">
                <label>Make</label>
                <input name="make" defaultValue={selectedVehicle.make} required />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input name="model" defaultValue={selectedVehicle.model} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input name="type" defaultValue={selectedVehicle.type} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" defaultValue={selectedVehicle.status || 'pending'}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">Save Changes</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="admin-table-container">
      <div className="table-controls">
        <div className="status-filter">
          <FaFilter className="filter-icon" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="driver">Drivers Only</option>
            <option value="user">Regular Users</option>
          </select>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Driver Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users
            .filter(user => {
              if (statusFilter === 'driver') return user.isDriver;
              if (statusFilter === 'user') return !user.isDriver;
              return true;
            })
            .map(user => (
              <tr key={user.id} className={user.isDriver ? 'is-driver' : ''}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.isDriver && (
                    <span className={`status-badge ${user.driverDetails?.isApproved ? 'approved' : 'pending'}`}>
                      {user.driverDetails?.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  )}
                  {!user.isDriver && (
                    <span className="status-badge user">Regular User</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    {user.isDriver && !user.driverDetails?.isApproved && (
                      <>
                        <button
                          className="approve-btn"
                          onClick={() => handleApproval(user.driverId, 'driver', 'approved')}
                        >
                          <FaCheck /> Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleApproval(user.driverId, 'driver', 'denied')}
                        >
                          <FaTimes /> Deny
                        </button>
                      </>
                    )}
                    {user.isDriver && (
                      <button
                        className="edit-btn"
                        onClick={() => navigate(`/driver/${user.driverId}`)}
                      >
                        <FaEdit /> View Details
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  const renderBookings = () => (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Vehicle</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.id}>
              <td>{booking.userName}</td>
              <td>{booking.vehicleName}</td>
              <td>
                {new Date(booking.startDate).toLocaleDateString()} - 
                {new Date(booking.endDate).toLocaleDateString()}
              </td>
              <td>
                <span className={`status-badge ${booking.status}`}>
                  {booking.status}
                </span>
              </td>
              <td>${booking.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
        </div>
        <nav>
          <button
            className={`nav-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <FaCar /> Vehicles
          </button>
          <button
            className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FaUsers /> Users
          </button>
          <button
            className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <FaCalendarAlt /> Bookings
          </button>
        </nav>
      </div>

      <div className="admin-content">
        {activeTab === 'vehicles' && renderVehicles()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'bookings' && renderBookings()}
      </div>
    </div>
  );
};

export default AdminDashboard; 