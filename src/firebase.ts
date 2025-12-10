// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfxiZZGXVW99Z0mW4zEGNhSncmIfkvTZo",
  authDomain: "spese-famiglia-a56e1.firebaseapp.com",
  projectId: "spese-famiglia-a56e1",
  storageBucket: "spese-famiglia-a56e1.firebasestorage.app",
  messagingSenderId: "959472036402",
  appId: "1:959472036402:web:2f3cab32160951e01c2a2b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

export default app;