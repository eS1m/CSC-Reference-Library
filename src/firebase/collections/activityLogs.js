import { db } from '../config';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

export const ACTIVITY_LOG_RETENTION_DAYS = 30;

const FIRESTORE_BATCH_LIMIT = 500;

export function subscribeActivityLogs(options = {}, onData, onError) {
  const constraints = [orderBy('timestamp', 'desc')];

  const q = query(collection(db, 'activityLogs'), ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}

/**
 * Delete activity logs older than ACTIVITY_LOG_RETENTION_DAYS.
 * @returns {number} Number of logs deleted
 */
export async function deleteExpiredActivityLogs() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVITY_LOG_RETENTION_DAYS);

    const q = query(
      collection(db, 'activityLogs'),
      where('timestamp', '<', Timestamp.fromDate(cutoff))
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let batch = writeBatch(db);
    let opsInBatch = 0;
    let deletedCount = 0;

    for (const logDoc of snap.docs) {
      batch.delete(logDoc.ref);
      opsInBatch += 1;
      deletedCount += 1;

      if (opsInBatch >= FIRESTORE_BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return deletedCount;
  } catch (err) {
    console.error('deleteExpiredActivityLogs error:', err);
    return 0;
  }
}

/**
 * Delete specific activity logs by document ID.
 * @param {string[]} logIds
 * @returns {number} Number of logs deleted
 */
export async function deleteActivityLogs(logIds) {
  if (!logIds?.length) return 0;

  try {
    let batch = writeBatch(db);
    let opsInBatch = 0;
    let deletedCount = 0;

    for (const logId of logIds) {
      batch.delete(doc(db, 'activityLogs', logId));
      opsInBatch += 1;
      deletedCount += 1;

      if (opsInBatch >= FIRESTORE_BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return deletedCount;
  } catch (err) {
    console.error('deleteActivityLogs error:', err);
    throw err;
  }
}

export async function deleteActivityLog(logId) {
  await deleteDoc(doc(db, 'activityLogs', logId));
}
