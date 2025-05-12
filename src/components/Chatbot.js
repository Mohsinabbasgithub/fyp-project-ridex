import React, { useState, useRef, useEffect } from 'react';
import '../styles/Chatbot.css';
import { FaComments, FaTimes, FaPaperPlane, FaWhatsapp } from 'react-icons/fa';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "Hello! How can I help you today? Please select a question or type your own:", 
      isBot: true 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const messagesEndRef = useRef(null);

  const quickQuestions = [
    "What are your rental prices?",
    "How can I book a vehicle?",
    "What documents do I need?",
    "What is the security deposit?",
    "How to become a driver?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuickQuestion = (question) => {
    // Add user's question to messages
    const userMessage = { text: question, isBot: false };
    setMessages(prev => [...prev, userMessage]);

    // Get bot response
    const botResponse = getBotResponse(question);
    
    // Add bot response with delay
    setTimeout(() => {
      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    }, 1000);
  };

  const getBotResponse = (question) => {
    const responses = {
      "What are your rental prices?": "Our vehicle rental prices start from $50 per day. Prices vary based on vehicle type and rental duration. Would you like to see specific vehicle prices?",
      "How can I book a vehicle?": "Booking a vehicle is easy! Simply browse our available vehicles, select your desired dates, and complete the booking process. You'll need to be registered and logged in to make a booking.",
      "What documents do I need?": "You'll need: \n- Valid driver's license\n- Proof of identity (ID card/passport)\n- Proof of address\n- Valid credit card for security deposit",
      "What is the security deposit?": "The security deposit ranges from $200-$500 depending on the vehicle type. It's fully refundable upon return of the vehicle in its original condition.",
      "How to become a driver?": "To become a driver partner:\n1. Register on our platform\n2. Submit required documents\n3. Complete vehicle registration\n4. Pass our verification process",
    };

    return responses[question] || "I'm not sure about that. Would you like to continue this conversation on WhatsApp for more detailed assistance?";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { text: inputMessage, isBot: false };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Add bot response suggesting WhatsApp
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "For more detailed assistance, would you like to continue this conversation on WhatsApp?", 
        isBot: true,
        showWhatsAppButton: true
      }]);
    }, 1000);
  };

  const handleWhatsAppClick = () => {
    if (!userName) {
      setShowNameInput(true);
      return;
    }
    
    // Format the initial message
    const message = `Hello! I'm ${userName} from Ridex website and I need assistance.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp with your number and pre-filled message
    window.open(`https://wa.me/923091736516?text=${encodedMessage}`, '_blank');
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setShowNameInput(false);
      handleWhatsAppClick();
    }
  };

  return (
    <div className="chatbot-container">
      {!isOpen && (
        <button className="chat-button" onClick={() => setIsOpen(true)}>
          <FaComments /> Chat with us
        </button>
      )}

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Ridex Support</h3>
            <button className="close-button" onClick={() => setIsOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="quick-questions">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-question-button"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index}>
                <div className={`message ${message.isBot ? 'bot' : 'user'}`}>
                  {message.text}
                </div>
                {message.showWhatsAppButton && (
                  <button className="whatsapp-button" onClick={handleWhatsAppClick}>
                    <FaWhatsapp /> Continue on WhatsApp
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {showNameInput ? (
            <form onSubmit={handleNameSubmit} className="name-input-container">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="message-input"
              />
              <button type="submit" className="send-button">
                <FaPaperPlane />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendMessage} className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="message-input"
              />
              <button type="submit" className="send-button">
                <FaPaperPlane />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Chatbot; 