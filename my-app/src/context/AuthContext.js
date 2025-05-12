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
      
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    try {
      if (isAdmin) {
        await signOut(auth);
        setIsAdmin(false);
        setCurrentUser(null);
        setUserProfile(null);
        return;
      }
      return signOut(auth);
    } catch (error) {
      throw error;
    }
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
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    isAdmin,
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