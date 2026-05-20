import { db } from '../config';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * Subscribe to the evidence-unlock status for a single agency.
 * @param {string} agencyId
 * @param {function} onData - callback({ unlocked })
 * @param {function} onError
 */
export function subscribeEvidenceUnlock(agencyId, onData, onError) {
  if (!agencyId) {
    onData({ unlocked: false });
    return () => {};
  }
  return onSnapshot(
    doc(db, 'evidenceUnlocks', agencyId),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data());
      } else {
        onData({ unlocked: false });
      }
    },
    onError
  );
}

/**
 * Unlock Evidence Requirements for an agency.
 * @param {string} agencyId
 */
export async function unlockEvidence(agencyId) {
  await setDoc(doc(db, 'evidenceUnlocks', agencyId), {
    unlocked: true,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Lock Evidence Requirements for an agency.
 * @param {string} agencyId
 */
export async function lockEvidence(agencyId) {
  if (!agencyId) return;
  await deleteDoc(doc(db, 'evidenceUnlocks', agencyId));
}
