import { db } from '../config';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';

export function subscribeUsers(onData, onError) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

export async function getUsers() {
  const snap = await getDocs(query(collection(db, 'users')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserById(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createUser(uid, data) {
  return setDoc(doc(db, 'users', uid), data);
}

export async function updateUser(uid, data) {
  return updateDoc(doc(db, 'users', uid), data);
}
