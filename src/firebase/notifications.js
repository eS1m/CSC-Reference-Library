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
  writeBatch,
  Timestamp
} from 'firebase/firestore';

/** Notifications older than this are permanently deleted. */
export const NOTIFICATION_RETENTION_DAYS = 30;

const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Create a notification for admin and/or CSC RO X users.
 * Notifications are stored under each user's subcollection:
 *   users/{recipientId}/notifications/{notifId}
 * @param {Object} params
 * @param {string} params.type - "PROFILE_COMPLETE" | "PROFILE_UPDATE" | "EMPLOYEE_COMPLETE" | "EMPLOYEE_UPDATE" | "SELF_ASSESSMENT_UPLOAD" | "ACTION_PLAN_UPLOAD" | "NEW_USER_REGISTERED"
 * @param {string} params.agencyId - Firebase Auth UID of the agency
 * @param {string} params.agencyName - Display name of the agency
 * @param {string} [params.fileName] - Optional file name for upload notifications
 * @param {string[]} [params.roles] - Target roles (default: ['p', 'admin'])
 */
export async function createAdminNotifications({ type, agencyId, agencyName, fileName, roles = ['p', 'admin'] }) {
  try {
    /* Find all target users */
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', 'in', roles));
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
    case 'EVIDENCE_UPLOAD':
      return {
        title: 'Evidence Requirements Uploaded',
        message: `${agencyName} uploaded ${fileName || 'evidence files'}.`
      };
    case 'NEW_USER_REGISTERED':
      return {
        title: 'New User Registered',
        message: `${agencyName} has registered a new account and is pending approval.`
      };
    case 'BACKUP_COMPLETED':
      return {
        title: 'Firestore Backup Completed',
        message: fileName || 'A Firestore backup has been completed.'
      };
    default:
      return { title: 'New Notification', message: 'You have a new notification.' };
  }
}

/**
 * Create a notification for a single user (e.g. agency user).
 * @param {string} recipientId - Firebase Auth UID of the recipient
 * @param {Object} params
 * @param {string} params.type - Notification type identifier
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {string} [params.agencyId] - Optional agency UID
 * @param {string} [params.agencyName] - Optional agency display name
 * @param {string} [params.fileName] - Optional related file name
 */
export async function createUserNotification(recipientId, { type, title, message, agencyId, agencyName, fileName }) {
  if (!recipientId) return;

  try {
    await addDoc(collection(db, 'users', recipientId, 'notifications'), {
      type,
      title,
      message,
      agencyId: agencyId || null,
      agencyName: agencyName || null,
      fileName: fileName || null,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('createUserNotification error:', err);
  }
}

/**
 * Notify an agency that they have been recommended for onsite assessment.
 * @param {string} agencyId - Firebase Auth UID of the agency user
 * @param {string} [agencyName] - Display name of the agency
 */
export async function notifyAgencyEvidenceRequired(agencyId, agencyName) {
  await createUserNotification(agencyId, {
    type: 'EVIDENCE_REQUIRED',
    title: 'Evidence Requirements Available',
    message: 'You have been selected for Field Office Monitoring. Please submit your Evidence Requirements.',
    agencyId,
    agencyName: agencyName || null
  });
}

export async function notifyAgencyOARecommended(agencyId, agencyName) {
  await createUserNotification(agencyId, {
    type: 'OA_RECOMMENDED',
    title: 'Onsite Assessment Recommendation',
    message: 'You have been recommended for Onsite Assessment',
    agencyId,
    agencyName: agencyName || null
  });
}

/**
 * Delete notifications older than NOTIFICATION_RETENTION_DAYS for one user.
 * @param {string} recipientId - Firebase Auth UID of the recipient
 * @returns {number} Number of notifications deleted
 */
export async function deleteExpiredNotifications(recipientId) {
  if (!recipientId) return 0;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NOTIFICATION_RETENTION_DAYS);

    const q = query(
      collection(db, 'users', recipientId, 'notifications'),
      where('createdAt', '<', Timestamp.fromDate(cutoff))
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let batch = writeBatch(db);
    let opsInBatch = 0;
    let deletedCount = 0;

    for (const notifDoc of snap.docs) {
      batch.delete(notifDoc.ref);
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
    console.error('deleteExpiredNotifications error:', err);
    return 0;
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
