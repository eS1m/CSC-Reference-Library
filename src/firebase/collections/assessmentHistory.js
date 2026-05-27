import { db } from '../config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';

/**
 * Create a new assessment history record.
 * @param {Object} data
 */
export async function createAssessmentHistory(data) {
  return addDoc(collection(db, 'assessmentHistory'), data);
}

/**
 * Subscribe to assessment history for a specific agency.
 * Returns sorted by startedAt descending (most recent first).
 * @param {string} agencyId
 * @param {function} onData
 * @param {function} onError
 */
export function subscribeAssessmentHistory(agencyId, onData, onError) {
  if (!agencyId) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'assessmentHistory'),
    where('agencyId', '==', agencyId),
    orderBy('startedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

/**
 * Update an assessment history document.
 * @param {string} docId
 * @param {Object} data
 */
export async function updateAssessmentHistory(docId, data) {
  return updateDoc(doc(db, 'assessmentHistory', docId), data);
}

/**
 * Delete an assessment history document.
 * @param {string} docId
 */
export async function deleteAssessmentHistory(docId) {
  return deleteDoc(doc(db, 'assessmentHistory', docId));
}
