import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null); // New state for user role

  async function login(email, password, isAdminLogin = false) {
    try {
      console.log("Attempting login...", { email, isAdminLogin });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (isAdminLogin) {
        console.log("Admin login attempt, checking admin status...");
        // Check if user is admin
        const adminRef = doc(db, 'admins', userCredential.user.uid);
        const adminDoc = await getDoc(adminRef);
        
        if (!adminDoc.exists()) {
          console.log("Admin document not found, signing out...");
          await signOut(auth);
          throw new Error('Not authorized as admin');
        }
        console.log("Admin verification successful");
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      
      // Fetch user role after login
      const driverRef = doc(db, 'drivers', userCredential.user.uid);
      const driverDoc = await getDoc(driverRef);
      if (driverDoc.exists()) {
        setUserRole('driver');
      } else {
        setUserRole('user');
      }
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      throw error; // keep logging and rethrow since we add context
    }
  }

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (isAdmin) {
      await signOut(auth);
      setIsAdmin(false);
      setCurrentUser(null);
      setUserProfile(null);
      return;
    }
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Check if user is admin
        const adminRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminRef);
        setIsAdmin(adminDoc.exists());

        // Get user profile
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
        // Fetch user role
        const driverRef = doc(db, 'drivers', user.uid);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
          setUserRole('driver');
        } else {
          setUserRole('user');
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setUserRole(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    userRole, // Expose userRole in context
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 