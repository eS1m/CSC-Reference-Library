import { db } from '../config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

/**
 * Subscribe to the evidence-unlock status for a single agency.
 * @param {string} agencyId
 * @param {function} onData - callback({ unlocked, lockedReason })
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
    lockedReason: null,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Lock Evidence Requirements for an agency.
 * @param {string} agencyId
 * @param {'oa-recommended'|'removed'} reason - Why it was locked
 */
export async function lockEvidence(agencyId, reason = 'removed') {
  if (!agencyId) return;
  await setDoc(doc(db, 'evidenceUnlocks', agencyId), {
    unlocked: false,
    lockedReason: reason,
    updatedAt: new Date().toISOString()
  });
}
