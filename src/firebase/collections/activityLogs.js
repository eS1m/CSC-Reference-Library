import { db } from '../config';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

export function subscribeActivityLogs(options = {}, onData, onError) {
  const constraints = [orderBy('timestamp', 'desc')];
  if (options.limit) {
    // Note: limit() requires import from firebase/firestore
    // Keeping simple for now; pages can slice client-side
  }

  const q = query(collection(db, 'activityLogs'), ...constraints);
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(data);
  }, onError);
}
