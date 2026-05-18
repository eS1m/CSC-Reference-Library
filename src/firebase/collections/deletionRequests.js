import { db } from '../config';
import { addDoc, collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';

export function subscribeDeletionRequests(options = {}, onData, onError) {
  const constraints = [];
  if (options.status) {
    if (Array.isArray(options.status)) {
      constraints.push(where('status', 'in', options.status));
    } else {
      constraints.push(where('status', '==', options.status));
    }
  }
  if (options.userId) constraints.push(where('userId', '==', options.userId));

  const q = constraints.length > 0
    ? query(collection(db, 'deletionRequests'), ...constraints)
    : query(collection(db, 'deletionRequests'));

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

export async function createDeletionRequest(data) {
  return addDoc(collection(db, 'deletionRequests'), data);
}

export async function updateDeletionRequest(id, data) {
  return updateDoc(doc(db, 'deletionRequests', id), data);
}
