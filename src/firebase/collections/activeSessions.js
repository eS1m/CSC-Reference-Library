import { db } from '../config';
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection } from 'firebase/firestore';

export async function createSession(userId, email, role) {
  await setDoc(doc(db, 'activeSessions', userId), {
    userId,
    email: email || '',
    role: role || '',
    loginAt: serverTimestamp(),
    lastHeartbeat: serverTimestamp(),
  });
}

export async function heartbeat(userId) {
  await setDoc(doc(db, 'activeSessions', userId), {
    lastHeartbeat: serverTimestamp(),
  }, { merge: true });
}

export async function removeSession(userId) {
  await deleteDoc(doc(db, 'activeSessions', userId));
}

export function subscribeActiveSessions(callback, onError) {
  return onSnapshot(collection(db, 'activeSessions'), callback, onError);
}
