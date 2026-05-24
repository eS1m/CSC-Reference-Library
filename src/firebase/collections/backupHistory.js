import { db } from '../config';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit
} from 'firebase/firestore';

export function subscribeBackupHistory(onData, onError, maxResults = 50) {
  const q = query(
    collection(db, 'backupHistory'),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}
