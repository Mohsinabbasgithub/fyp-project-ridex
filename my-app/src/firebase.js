// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBe2bI63aABjuTm5PhooKBb7lWwLxykNv4",
  authDomain: "ridex-57860.firebaseapp.com",
  projectId: "ridex-57860",
  storageBucket: "ridex-57860.appspot.com",
  messagingSenderId: "526415275673",
  appId: "1:52641527567eb:69c81afc45dd8a0547ba08",
  measurementId: "G-8HNPHYGYHZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, analytics };
