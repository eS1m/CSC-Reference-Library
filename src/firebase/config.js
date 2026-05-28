// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCD9C5IKEXeGhcppQNlNyAPPAq-1VvAr-I",
  authDomain: "csc-reference-library.firebaseapp.com",
  projectId: "csc-reference-library",
  storageBucket: "csc-reference-library.firebasestorage.app",
  messagingSenderId: "541637052436",
  appId: "1:541637052436:web:803b352e4e9277b6ddbf01",
  measurementId: "G-SBT4J399LH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error('Failed to set auth persistence:', err);
});
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
