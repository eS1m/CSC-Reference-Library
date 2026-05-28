import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBpoz_WRDT6g6vWL-uRP1-JSfsfS0AFD04",
  authDomain: "csc-kl-stage.firebaseapp.com",
  projectId: "csc-kl-stage",
  storageBucket: "csc-kl-stage.firebasestorage.app",
  messagingSenderId: "961221173563",
  appId: "1:961221173563:web:a041b4c18a0b4f7e2d571e"
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
