import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { FaPaperPlane, FaPhone, FaTimes } from 'react-icons/fa';
import '../styles/InAppChat.css';

const InAppChat = ({ rideId, otherPartyName, otherPartyId, userRole, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for messages in real-time
  useEffect(() => {
    if (!rideId) {
      console.log('No rideId provided for chat');
      return;
    }

    console.log('Setting up chat listener for rideId:', rideId);

    const messagesRef = collection(db, 'chatMessages');
    const orderedQuery = query(
      messagesRef,
      where('rideId', '==', rideId),
      orderBy('timestamp', 'asc')
    );

    let activeUnsubscribe = null;

    const startOrderedListener = () => {
      activeUnsubscribe = onSnapshot(
        orderedQuery,
        (snapshot) => {
          const messageList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Chat messages received:', messageList.length, 'messages');
          setMessages(messageList);
        },
        (error) => {
          console.error('Error listening to chat messages:', error);
          if (error.code === 'failed-precondition') {
            console.log('Falling back to simple query without orderBy...');
            if (activeUnsubscribe) {
              try { activeUnsubscribe(); } catch (_e) {}
            }
            const simpleQuery = query(messagesRef, where('rideId', '==', rideId));
            activeUnsubscribe = onSnapshot(
              simpleQuery,
              (snapshot) => {
                const messageList = snapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() }))
                  .sort((a, b) => {
                    const timeA = a.timestamp?.toDate?.() || new Date(0);
                    const timeB = b.timestamp?.toDate?.() || new Date(0);
                    return timeA - timeB;
                  });
                console.log('Chat messages received (simple query):', messageList.length, 'messages');
                setMessages(messageList);
              },
              (simpleError) => {
                console.error('Error with simple query:', simpleError);
              }
            );
          }
        }
      );
    };

    startOrderedListener();

    return () => {
      console.log('Cleaning up chat listener');
      if (activeUnsubscribe) {
        try { activeUnsubscribe(); } catch (_e) {}
      }
    };
  }, [rideId]);

  // Listen for typing indicators
  useEffect(() => {
    if (!rideId) return;

    const typingRef = collection(db, 'typingIndicators');
    const q = query(
      typingRef,
      where('rideId', '==', rideId),
      where('userId', '!=', auth.currentUser?.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typingUsers = snapshot.docs.map(doc => doc.data());
      setIsTyping(typingUsers.length > 0);
    });

    return () => unsubscribe();
  }, [rideId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !rideId) {
      console.log('Cannot send message:', { newMessage: newMessage.trim(), rideId });
      return;
    }

    try {
      console.log('Sending message:', newMessage.trim(), 'for rideId:', rideId);
      console.log('Current user:', auth.currentUser?.uid, auth.currentUser?.email);
      
      // Add message to Firestore
      const messageData = {
        rideId,
        senderId: auth.currentUser?.uid,
        senderName: auth.currentUser?.email || 'Unknown',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        userRole
      };
      
      console.log('Message data to send:', messageData);
      
      const docRef = await addDoc(collection(db, 'chatMessages'), messageData);
      console.log('Message sent successfully with ID:', docRef.id);

      // Clear typing indicator
      await addDoc(collection(db, 'typingIndicators'), {
        rideId,
        userId: auth.currentUser?.uid,
        isTyping: false,
        timestamp: serverTimestamp()
      });

      setNewMessage('');
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again. Error: ' + error.message);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    // Update typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing indicator
    addDoc(collection(db, 'typingIndicators'), {
      rideId,
      userId: auth.currentUser?.uid,
      isTyping: true,
      timestamp: serverTimestamp()
    });

    // Clear typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      addDoc(collection(db, 'typingIndicators'), {
        rideId,
        userId: auth.currentUser?.uid,
        isTyping: false,
        timestamp: serverTimestamp()
      });
    }, 3000);
  };

  const handleCall = () => {
    // Get the other party's phone number from the ride data
    // For now, we'll show an alert with instructions
    if (userRole === 'driver') {
      // Driver calling user
      alert(`Calling passenger...\n\nIn a real app, this would:\n1. Show passenger's phone number\n2. Initiate a call using WebRTC or phone integration\n3. Connect the call between driver and passenger\n\nFor now, please contact the passenger through the chat.`);
    } else {
      // User calling driver
      alert(`Calling driver...\n\nIn a real app, this would:\n1. Show driver's phone number\n2. Initiate a call using WebRTC or phone integration\n3. Connect the call between user and driver\n\nFor now, please contact the driver through the chat.`);
    }
  };

  const handleClose = () => {
    console.log('Close button clicked!');
    console.log('Current isClosed state:', isClosed);
    setIsClosed(true);
    console.log('Setting isClosed to true');
    if (onClose) {
      console.log('Calling onClose callback');
      onClose();
    }
    console.log('Close function completed');
  };

  // Add touch-friendly close on swipe down (mobile)
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchStart(touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const diff = touchStart - touch.clientY;
    
    if (diff > 50) { // Swipe up to minimize
      setIsMinimized(true);
      setTouchStart(null);
    } else if (diff < -100) { // Swipe down to close
      handleClose();
      setTouchStart(null);
    }
  };

  const [touchStart, setTouchStart] = useState(null);

  const sendTestMessage = async () => {
    try {
      console.log('Sending test message for rideId:', rideId);
      
      const testMessageData = {
        rideId,
        senderId: auth.currentUser?.uid,
        senderName: auth.currentUser?.email || 'Test User',
        message: `Test message - Chat is working! (${new Date().toLocaleTimeString()})`,
        timestamp: serverTimestamp(),
        userRole
      };
      
      console.log('Test message data:', testMessageData);
      
      const docRef = await addDoc(collection(db, 'chatMessages'), testMessageData);
      console.log('Test message sent successfully with ID:', docRef.id);
      alert('Test message sent! Check console for details.');
    } catch (error) {
      console.error('Error sending test message:', error);
      alert('Failed to send test message: ' + error.message);
    }
  };

  if (!rideId || isClosed) return null;

  return (
    <div className={`in-app-chat ${isMinimized ? 'minimized' : ''}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      {!isMinimized ? (
        <>
          <div className="chat-header">
            <div className="chat-info">
              <h3>Chat with {otherPartyName}</h3>
              <span className="ride-id">Ride #{rideId.slice(-6)}</span>
            </div>
            <div className="chat-actions">
              <button className="call-btn" onClick={handleCall} title="Call">
                <FaPhone />
              </button>
              {/* Mirror user experience: minimize and close buttons */}
              <button className="minimize-btn" onClick={() => setIsMinimized(true)} title="Minimize">
                <FaTimes />
              </button>
              <button className="close-btn" onClick={handleClose} title="Close Chat" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', marginLeft: '4px', minWidth: '32px', minHeight: '32px' }}>
                ✕
              </button>
            </div>
          </div>

          <div className="messages-container">
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.senderId === auth.currentUser?.uid ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  <p>{message.message}</p>
                  <span className="message-time">
                    {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Now'}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <span>{otherPartyName} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="message-input">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              maxLength="500"
            />
            <button type="submit" disabled={!newMessage.trim()}>
              <FaPaperPlane />
            </button>
          </form>
        </>
      ) : (
        <div className="chat-minimized">
          <div className="minimized-info" onClick={() => setIsMinimized(false)}>
            <h4>Chat with {otherPartyName}</h4>
            <span>{messages.length} messages</span>
          </div>
          <div className="minimized-actions">
            <button className="expand-btn" onClick={() => setIsMinimized(false)} title="Expand" style={{ minWidth: '32px', minHeight: '32px' }}>
              <FaTimes />
            </button>
            <button className="close-btn" onClick={handleClose} title="Close Chat" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', marginLeft: '4px', minWidth: '32px', minHeight: '32px' }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InAppChat;
