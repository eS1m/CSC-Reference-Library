import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCD9C5IKEXeGhcppQNlNyAPPAq-1VvAr-I",
  authDomain: "csc-reference-library.firebaseapp.com",
  projectId: "csc-reference-library",
  storageBucket: "csc-reference-library.firebasestorage.app",
  messagingSenderId: "541637052436",
  appId: "1:541637052436:web:803b352e4e9277b6ddbf01",
  measurementId: "G-SBT4J399LH"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope('https://www.googleapis.com/auth/drive.file');