import { db } from '../config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export function subscribeEmployeesById(uid, onData, onError) {
  return onSnapshot(doc(db, 'agencyEmployees', uid), (snap) => {
    onData(snap.data() || null);
  }, onError);
}

export async function setEmployees(uid, data) {
  return setDoc(doc(db, 'agencyEmployees', uid), data);
}
