import { db } from '../config';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where, writeBatch } from 'firebase/firestore';

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

/**
 * Delete all recommendation docs for a specific agency.
 * @param {string} agencyId
 */
export async function deleteRecommendationsByAgencyId(agencyId) {
  if (!agencyId) return;
  const q = query(collection(db, 'recommendations'), where('agencyId', '==', agencyId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Archive all active recommendation docs for a specific agency.
 * @param {string} agencyId
 * @param {string} archivedYear - the assessment year being archived
 */
export async function archiveRecommendationsByAgencyId(agencyId, archivedYear) {
  if (!agencyId) return;
  const q = query(collection(db, 'recommendations'), where('agencyId', '==', agencyId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    if (!d.data().archived) {
      batch.update(d.ref, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedYear: archivedYear || null
      });
    }
  });
  await batch.commit();
}
