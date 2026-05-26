const admin = require('firebase-admin');
const cron = require('node-cron');
const stream = require('stream');

let adminDb = null;
let backupCronJob = null;
let driveInstance = null;
let getOrCreateFolderFn = null;

function initBackupService(drive, getOrCreateFolder) {
  driveInstance = drive;
  getOrCreateFolderFn = getOrCreateFolder;

  try {
    const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountB64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountB64, 'base64').toString());
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      adminDb = admin.firestore();
      console.log('Firebase Admin initialized for backups');
      startBackupScheduler();
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not set. Automatic backups disabled.');
    }
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message);
  }
}

function isInitialized() {
  return adminDb !== null;
}

async function getBackupConfig() {
  if (!adminDb) return null;
  const doc = await adminDb.collection('systemConfig').doc('backupSettings').get();
  return doc.exists ? doc.data() : null;
}

async function saveBackupConfig(config) {
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  const data = {
    ...config,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await adminDb.collection('systemConfig').doc('backupSettings').set(data, { merge: true });
}

async function listCollections() {
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  const collections = await adminDb.listCollections();
  return collections.map(col => col.id);
}

async function estimateBackupSize(collections) {
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  let totalDocs = 0;
  let totalSize = 0;

  for (const col of collections) {
    const snapshot = await adminDb.collection(col).get();
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    totalDocs += docs.length;
    totalSize += JSON.stringify(docs).length;
  }

  return { totalDocs, totalSize };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function runBackup(collections) {
  if (!adminDb) throw new Error('Firebase Admin not initialized');
  if (!driveInstance || !getOrCreateFolderFn) throw new Error('Drive service not initialized');

  const data = {};
  let totalDocs = 0;

  for (const col of collections) {
    const snapshot = await adminDb.collection(col).get();
    data[col] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    totalDocs += data[col].length;
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(jsonStr, 'utf-8');
  const sizeBytes = buffer.length;

  const now = new Date();
  const year = now.getFullYear().toString();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `firestore-backup-${timestamp}.json`;

  const rootFolderId = process.env.GOOGLE_FOLDER_ID;
  const yearFolderId = await getOrCreateFolderFn(year, rootFolderId);
  const backupsFolderId = await getOrCreateFolderFn('Firestore Backups', yearFolderId);

  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const response = await driveInstance.files.create({
    requestBody: {
      name: fileName,
      parents: [backupsFolderId],
    },
    media: {
      mimeType: 'application/json',
      body: bufferStream,
    },
    fields: 'id, webViewLink',
  });

  const fileId = response.data.id;

  await driveInstance.permissions.create({
    fileId: fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;

  await adminDb.collection('backupHistory').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    fileName,
    fileId,
    fileUrl,
    sizeBytes,
    sizeDisplay: formatBytes(sizeBytes),
    collections,
    totalDocs,
    status: 'success',
  });

  await saveBackupConfig({
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notify all admins
  await sendBackupNotification(fileName, formatBytes(sizeBytes), totalDocs);

  return {
    fileId,
    fileName,
    fileUrl,
    sizeBytes,
    sizeDisplay: formatBytes(sizeBytes),
    totalDocs,
  };
}

async function sendBackupNotification(fileName, sizeDisplay, totalDocs) {
  if (!adminDb) return;
  try {
    const usersSnap = await adminDb.collection('users').where('role', '==', 'admin').get();
    if (usersSnap.empty) return;

    const title = 'Firestore Backup Completed';
    const message = `A backup has been created: ${fileName} (${sizeDisplay}, ${totalDocs} documents).`;

    const batch = adminDb.batch();
    usersSnap.docs.forEach(userDoc => {
      const notifRef = adminDb.collection('users', userDoc.id, 'notifications').doc();
      batch.set(notifRef, {
        type: 'BACKUP_COMPLETED',
        title,
        message,
        fileName: fileName || null,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  } catch (err) {
    console.error('Failed to send backup notification:', err);
  }
}

async function logBackupError(collections, errorMessage) {
  if (!adminDb) return;
  try {
    await adminDb.collection('backupHistory').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      fileName: null,
      fileId: null,
      fileUrl: null,
      sizeBytes: 0,
      sizeDisplay: '0 B',
      collections,
      totalDocs: 0,
      status: 'failed',
      error: errorMessage,
    });
  } catch (err) {
    console.error('Failed to log backup error:', err);
  }
}

async function getBackupHistory(limit = 50) {
  if (!adminDb) return [];
  const snapshot = await adminDb
    .collection('backupHistory')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

function startBackupScheduler() {
  if (backupCronJob) backupCronJob.stop();

  backupCronJob = cron.schedule('0 * * * *', async () => {
    try {
      const config = await getBackupConfig();
      if (!config || !config.enabled || config.frequency === 'manual') return;

      const now = new Date();
      const lastRun = config.lastRunAt?.toDate ? config.lastRunAt.toDate() : null;

      let shouldRun = false;
      if (!lastRun) {
        shouldRun = true;
      } else {
        const diffMs = now - lastRun;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (config.frequency === 'daily' && diffDays >= 1) shouldRun = true;
        if (config.frequency === 'weekly' && diffDays >= 7) shouldRun = true;
        if (config.frequency === 'monthly' && diffDays >= 30) shouldRun = true;
      }

      if (shouldRun) {
        console.log('Running scheduled Firestore backup...');
        const cols = config.collections || [];
        try {
          await runBackup(cols);
          console.log('Scheduled backup completed successfully');
        } catch (err) {
          console.error('Scheduled backup failed:', err);
          await logBackupError(cols, err.message);
        }
      }
    } catch (err) {
      console.error('Backup scheduler error:', err);
    }
  });

  console.log('Backup scheduler started (checks every hour)');
}

async function downloadBackupFromDrive(fileId) {
  if (!driveInstance) throw new Error('Drive service not initialized');
  const res = await driveInstance.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  const chunks = [];
  for await (const chunk of res.data) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function restoreTimestamps(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (
    !Array.isArray(obj) &&
    Object.keys(obj).length === 2 &&
    '_seconds' in obj &&
    '_nanoseconds' in obj &&
    Number.isInteger(obj._seconds) &&
    Number.isInteger(obj._nanoseconds)
  ) {
    return new admin.firestore.Timestamp(obj._seconds, obj._nanoseconds);
  }

  if (Array.isArray(obj)) {
    return obj.map(restoreTimestamps);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = restoreTimestamps(value);
  }
  return result;
}

async function restoreFromData(backupData, collections) {
  if (!adminDb) throw new Error('Firebase Admin not initialized');

  const result = {
    restored: 0,
    skipped: 0,
    failed: 0,
    collections: {}
  };

  for (const col of collections) {
    const backupDocs = backupData[col];
    if (!Array.isArray(backupDocs)) {
      result.collections[col] = { restored: 0, skipped: 0, failed: 0, error: 'Collection not found in backup' };
      continue;
    }

    // Get all existing doc IDs for this collection
    const existingSnap = await adminDb.collection(col).select().get();
    const existingIds = new Set(existingSnap.docs.map(d => d.id));

    const docsToRestore = [];
    const docsToSkip = [];

    for (const docData of backupDocs) {
      const docId = docData.id;
      if (!docId) {
        result.failed++;
        continue;
      }
      if (existingIds.has(docId)) {
        docsToSkip.push(docId);
      } else {
        const { id, ...dataWithoutId } = docData;
        docsToRestore.push({ id: docId, data: restoreTimestamps(dataWithoutId) });
      }
    }

    let colRestored = 0;
    let colFailed = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < docsToRestore.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const chunk = docsToRestore.slice(i, i + BATCH_SIZE);
      for (const doc of chunk) {
        const ref = adminDb.collection(col).doc(doc.id);
        batch.set(ref, doc.data);
      }
      try {
        await batch.commit();
        colRestored += chunk.length;
      } catch (err) {
        console.error(`Restore batch failed for ${col}:`, err);
        colFailed += chunk.length;
      }
    }

    result.restored += colRestored;
    result.skipped += docsToSkip.length;
    result.failed += colFailed;
    result.collections[col] = {
      restored: colRestored,
      skipped: docsToSkip.length,
      failed: colFailed,
      totalInBackup: backupDocs.length
    };
  }

  return result;
}

async function restoreBackup(fileId, collections) {
  if (!driveInstance) throw new Error('Drive service not initialized');
  const jsonStr = await downloadBackupFromDrive(fileId);
  let backupData;
  try {
    backupData = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error('Backup file is not valid JSON');
  }
  return restoreFromData(backupData, collections);
}

module.exports = {
  initBackupService,
  isInitialized,
  getBackupConfig,
  saveBackupConfig,
  listCollections,
  estimateBackupSize,
  runBackup,
  logBackupError,
  getBackupHistory,
  formatBytes,
  restoreBackup,
  restoreFromData,
};
