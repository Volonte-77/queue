// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQqOpwNwWhTalYzBl2aCASI6wv4c7NnPI",
  authDomain: "fole-8172e.firebaseapp.com",
  databaseURL: "https://fole-8172e-default-rtdb.firebaseio.com",
  projectId: "fole-8172e",
  storageBucket: "fole-8172e.firebasestorage.app",
  messagingSenderId: "977447329710",
  appId: "1:977447329710:web:630a7a45a60d57e628b23f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;