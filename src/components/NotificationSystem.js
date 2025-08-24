import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { FaBell, FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import '../styles/NotificationSystem.css';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState('default');

  const notificationRef = useRef(null);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setPermission(permission);
        });
      }
    }
  }, []);

  // Listen for notifications in real-time
  useEffect(() => {
    if (!auth.currentUser) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Auto-close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date()
      });
      // Optimistically update local state so UI responds immediately
      setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true,
          readAt: new Date()
        })
      );
      await Promise.all(updatePromises);
      // Optimistic local update
      setNotifications((prev) => prev.map(n => ({ ...n, read: true, readAt: n.read ? n.readAt : new Date() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // In a real app, you might want to mark as deleted instead of actually deleting
      await updateDoc(doc(db, 'notifications', notificationId), {
        deleted: true,
        deletedAt: new Date()
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheck className="notification-icon success" />;
      case 'warning':
        return <FaExclamationTriangle className="notification-icon warning" />;
      case 'error':
        return <FaExclamationTriangle className="notification-icon error" />;
      default:
        return <FaInfoCircle className="notification-icon info" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => !n.deleted);

  return (
    <div className="notification-system" ref={notificationRef}>
      <button 
        className="notification-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button 
                className="close-btn"
                onClick={() => setIsOpen(false)}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <div className="notification-icon-wrapper">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-details">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="delete-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <FaBell className="no-notifications-icon" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Utility function to create notifications (can be called from other components)
export const createNotification = async (userId, title, message, type = 'info', data = {}) => {
  try {
    const notificationData = {
      userId,
      title,
      message,
      type,
      data,
      read: false,
      timestamp: new Date(),
      deleted: false
    };

    await addDoc(collection(db, 'notifications'), notificationData);

    // Show browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'ridex-notification'
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Utility function to create ride-specific notifications
export const createRideNotification = async (userId, rideId, action, driverName = null) => {
  const notifications = {
    'ride_requested': {
      title: 'Ride Requested',
      message: 'Your ride request has been sent to nearby drivers.',
      type: 'info'
    },
    'driver_accepted': {
      title: 'Driver Accepted',
      message: `${driverName || 'A driver'} has accepted your ride request.`,
      type: 'success'
    },
    'driver_arrived': {
      title: 'Driver Arrived',
      message: `${driverName || 'Your driver'} has arrived at your pickup location.`,
      type: 'success'
    },
    'ride_started': {
      title: 'Ride Started',
      message: 'Your ride has begun. Enjoy your journey!',
      type: 'success'
    },
    'ride_completed': {
      title: 'Ride Completed',
      message: 'Your ride has been completed. Please rate your experience.',
      type: 'success'
    },
    'ride_cancelled': {
      title: 'Ride Cancelled',
      message: 'Your ride has been cancelled.',
      type: 'warning'
    },
    'new_message': {
      title: 'New Message',
      message: `You have a new message from ${driverName || 'your driver'}.`,
      type: 'info'
    }
  };

  const notification = notifications[action];
  if (notification) {
    await createNotification(userId, notification.title, notification.message, notification.type, { rideId });
  }
};

export default NotificationSystem;
