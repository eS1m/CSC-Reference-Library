import { db } from '../config';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export async function getQuickGuideById(uid) {
  const snap = await getDoc(doc(db, 'agencyActionPlanQG', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeQuickGuideById(uid, onData, onError) {
  if (!uid) {
    onData(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'agencyActionPlanQG', uid),
    (snap) => {
      onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    onError
  );
}

export async function setQuickGuide(uid, data) {
  return setDoc(
    doc(db, 'agencyActionPlanQG', uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
