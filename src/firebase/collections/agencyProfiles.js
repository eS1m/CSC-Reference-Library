import { db } from '../config';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc } from 'firebase/firestore';

export function subscribeProfiles(onData, onError) {
  const q = query(collection(db, 'agencyProfiles'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

export function subscribeProfileById(uid, onData, onError) {
  return onSnapshot(doc(db, 'agencyProfiles', uid), (snap) => {
    onData(snap.data() || null);
  }, onError);
}

export async function getProfileById(uid) {
  const snap = await getDoc(doc(db, 'agencyProfiles', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getProfiles() {
  const snap = await getDocs(query(collection(db, 'agencyProfiles')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setProfile(uid, data, merge = true) {
  return setDoc(doc(db, 'agencyProfiles', uid), data, { merge });
}
