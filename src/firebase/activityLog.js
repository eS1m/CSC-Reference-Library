import { db } from './config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Write an activity log entry to Firestore.
 * @param {Object} params
 * @param {string} params.userId       - UID of the actor
 * @param {string} params.userEmail    - Email of the actor
 * @param {string} params.userRole     - Role of the actor (u, p, admin)
 * @param {string} params.action       - Action type constant
 * @param {string} [params.targetUserId]    - UID of the affected user (if any)
 * @param {string} [params.targetAgencyName] - Name of the affected agency (if any)
 * @param {Object} [params.details]    - Arbitrary key-value details
 * @param {string} [params.message]    - Human-readable summary
 */
export const logActivity = async ({
  userId,
  userEmail,
  userRole,
  action,
  targetUserId = null,
  targetAgencyName = null,
  details = {},
  message = '',
}) => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      timestamp: serverTimestamp(),
      userId: userId || null,
      userEmail: userEmail || null,
      userRole: userRole || null,
      action,
      targetUserId,
      targetAgencyName,
      details,
      message,
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
};
