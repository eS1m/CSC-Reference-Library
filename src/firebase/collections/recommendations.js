import { db } from '../config';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';

export function subscribeRecommendations(onData, onError) {
  const q = query(collection(db, 'recommendations'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

export async function createRecommendation(data) {
  return addDoc(collection(db, 'recommendations'), data);
}

export async function updateRecommendation(id, data) {
  return updateDoc(doc(db, 'recommendations', id), data);
}

export async function deleteRecommendation(id) {
  return deleteDoc(doc(db, 'recommendations', id));
}
