import { db } from './config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';

/**
 * Create a notification for every admin and CSC RO X user.
 * Notifications are stored under each user's subcollection:
 *   users/{recipientId}/notifications/{notifId}
 * @param {Object} params
 * @param {string} params.type - "PROFILE_COMPLETE" | "PROFILE_UPDATE" | "EMPLOYEE_COMPLETE" | "EMPLOYEE_UPDATE" | "SELF_ASSESSMENT_UPLOAD" | "ACTION_PLAN_UPLOAD"
 * @param {string} params.agencyId - Firebase Auth UID of the agency
 * @param {string} params.agencyName - Display name of the agency
 * @param {string} [params.fileName] - Optional file name for upload notifications
 */
export async function createAdminNotifications({ type, agencyId, agencyName, fileName }) {
  try {
    /* Find all admin and CSC RO X users */
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', 'in', ['p', 'admin']));
    const snap = await getDocs(q);

    if (snap.empty) return;

    const { title, message } = getNotificationText(type, agencyName, fileName);

    const batch = writeBatch(db);

    snap.forEach(userDoc => {
      const recipientId = userDoc.id;
      const notifRef = doc(collection(db, 'users', recipientId, 'notifications'));
      batch.set(notifRef, {
        type,
        title,
        message,
        agencyId,
        agencyName,
        fileName: fileName || null,
        read: false,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
  } catch (err) {
    console.error('createAdminNotifications error:', err);
  }
}

function getNotificationText(type, agencyName, fileName) {
  switch (type) {
    case 'PROFILE_COMPLETE':
      return {
        title: 'Agency Profile Completed',
        message: `${agencyName} has completed their agency profile.`
      };
    case 'PROFILE_UPDATE':
      return {
        title: 'Agency Profile Updated',
        message: `${agencyName} has updated their agency profile details.`
      };
    case 'EMPLOYEE_COMPLETE':
      return {
        title: 'Employee Profile Completed',
        message: `${agencyName} has completed their employee profile.`
      };
    case 'EMPLOYEE_UPDATE':
      return {
        title: 'Employee Profile Updated',
        message: `${agencyName} has updated their employee profile details.`
      };
    case 'SELF_ASSESSMENT_UPLOAD':
      return {
        title: 'Self-Assessment Uploaded',
        message: `${agencyName} uploaded a Self-Assessment file${fileName ? `: ${fileName}` : '.'}`
      };
    case 'ACTION_PLAN_UPLOAD':
      return {
        title: 'Action Plan Uploaded',
        message: `${agencyName} uploaded an Action Plan file${fileName ? `: ${fileName}` : '.'}`
      };
    default:
      return { title: 'New Notification', message: 'You have a new notification.' };
  }
}

/**
 * Mark a notification as read.
 * @param {string} recipientId - The user's UID
 * @param {string} notificationId - The notification doc ID
 */
export async function markNotificationRead(recipientId, notificationId) {
  try {
    await updateDoc(doc(db, 'users', recipientId, 'notifications', notificationId), { read: true });
  } catch (err) {
    console.error('markNotificationRead error:', err);
  }
}

/**
 * Delete a notification.
 * @param {string} recipientId - The user's UID
 * @param {string} notificationId - The notification doc ID
 */
export async function deleteNotification(recipientId, notificationId) {
  try {
    await deleteDoc(doc(db, 'users', recipientId, 'notifications', notificationId));
  } catch (err) {
    console.error('deleteNotification error:', err);
  }
}
