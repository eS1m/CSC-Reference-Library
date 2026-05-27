import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZ8nQFwZSKa7mtfhSiOHtrtUcZdYfWJU0",
  authDomain: "csc-kl-dev.firebaseapp.com",
  projectId: "csc-kl-dev",
  storageBucket: "csc-kl-dev.firebasestorage.app",
  messagingSenderId: "958266481429",
  appId: "1:958266481429:web:2ed2077ee9a4366672e71c"
};

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error('Failed to set auth persistence:', err);
});
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
