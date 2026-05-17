/**
 * Safely format a Firestore Timestamp, Date, or date string.
 * @param {*} timestamp - Firestore Timestamp, Date, string, or null/undefined
 * @param {Object} options - formatting options
 * @param {boolean} options.includeTime - include time in output (default: false)
 * @returns {string} formatted date string or 'N/A'
 */
export const formatFirestoreDate = (timestamp, { includeTime = false } = {}) => {
  if (!timestamp) return 'N/A';

  let date;

  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return 'N/A';
  }

  if (isNaN(date.getTime())) return 'N/A';

  if (includeTime) {
    return date.toLocaleString();
  }
  return date.toLocaleDateString();
};
