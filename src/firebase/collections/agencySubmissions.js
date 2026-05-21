import { db } from '../config';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';

export function subscribeSubmissions(options = {}, onData, onError) {
  const constraints = [];
  if (options.userId) constraints.push(where('userId', '==', options.userId));
  if (options.fileType) constraints.push(where('fileType', '==', options.fileType));
  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  }

  const q = constraints.length > 0
    ? query(collection(db, 'agencySubmissions'), ...constraints)
    : query(collection(db, 'agencySubmissions'));

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

export async function getSubmissions(options = {}) {
  const constraints = [];
  if (options.userId) constraints.push(where('userId', '==', options.userId));
  if (options.fileType) constraints.push(where('fileType', '==', options.fileType));
  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection || 'desc'));
  }

  const q = constraints.length > 0
    ? query(collection(db, 'agencySubmissions'), ...constraints)
    : query(collection(db, 'agencySubmissions'));

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createSubmission(data) {
  return addDoc(collection(db, 'agencySubmissions'), data);
}

export async function getSubmissionById(id) {
  const snap = await getDoc(doc(db, 'agencySubmissions', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateSubmission(id, data) {
  return updateDoc(doc(db, 'agencySubmissions', id), data);
}

export async function deleteSubmission(id) {
  return deleteDoc(doc(db, 'agencySubmissions', id));
}

export async function deleteSubmissionsByUserId(userId) {
  const q = query(collection(db, 'agencySubmissions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const promises = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(promises);
  return snap.docs.length;
}
