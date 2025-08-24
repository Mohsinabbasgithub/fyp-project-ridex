import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ADMIN_CONFIG } from '../config/adminConfig';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Check if the user is an admin using the config
      if (currentUser && ADMIN_CONFIG.VALID_ADMIN_EMAILS.includes(currentUser.email)) {
        setAdmin(currentUser);
        // Ensure an admin document exists for Firestore rules to allow privileged writes
        const ensureAdminDoc = async () => {
          try {
            const adminRef = doc(db, 'admins', currentUser.uid);
            const snap = await getDoc(adminRef);
            if (!snap.exists()) {
              await setDoc(adminRef, {
                email: currentUser.email,
                createdAt: new Date()
              });
            }
          } catch (_e) {
            // No-op: UI auth still works; rules-side admin writes might fail without this
          }
        };
        ensureAdminDoc();
      } else {
        setAdmin(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!ADMIN_CONFIG.VALID_ADMIN_EMAILS.includes(email)) {
      throw new Error('Invalid admin email');
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    try {
      // Create/ensure admin doc so Firestore rules grant admin privileges
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email,
        createdAt: new Date()
      }, { merge: true });
    } catch (_e) {
      // Swallow to avoid blocking login UI
    }
    return userCredential.user;
  };

  const logout = async () => {
  await signOut(auth);
  setAdmin(null);
  };

  const value = {
    admin,
    loading,
    login,
    logout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
} 