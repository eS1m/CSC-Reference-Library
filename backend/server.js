require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xlsx = require('xlsx');
const path = require('path');
const { generateNarrativeReport } = require('./narrativeReport');
const backupService = require('./backupService');

const app = express();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many file uploads from this IP, please try again later.' }
});

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 deletions per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many deletion requests from this IP, please try again later.' }
});

app.use(generalLimiter);

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://ccs-reference-library-staging-vtmh4.ondigitalocean.app',
      'https://csc-kl.duckdns.org'
    ];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json());

// Trust proxy headers from Nginx / App Platform
app.set('trust proxy', 1);

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      return next();
    }
    res.status(400).json({ error: 'HTTPS required. Access the API via the secure endpoint.' });
  });
}

const upload = multer();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

backupService.initBackupService(drive, getOrCreateFolder);

function escapeDriveQuery(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function collectFileIds(folderId) {
  const fileIds = [];
  let pageToken = null;
  
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, mimeType)',
      pageSize: 1000,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });
    
    const items = response.data.files || [];
    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const subFileIds = await collectFileIds(item.id);
        fileIds.push(...subFileIds);
      } else {
        fileIds.push(item.id);
      }
    }
    
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  
  return fileIds;
}

async function buildDrivePath(fileId) {
  const parts = [];
  let currentId = fileId;
  
  try {
    while (currentId) {
      const res = await drive.files.get({
        fileId: currentId,
        fields: 'name, parents'
      });
      parts.unshift(res.data.name || 'Unknown');
      const parents = res.data.parents || [];
      if (parents.length === 0) break;
      currentId = parents[0];
    }
  } catch (err) {
    console.error('Drive path build error:', err);
    if (parts.length === 0) parts.push('Unknown location');
  }
  
  return parts.join(' > ');
}

async function isDescendantOf(fileId, ancestorId, depth = 0) {
  if (depth > 5) return false;
  const file = await drive.files.get({ fileId, fields: 'parents' });
  const parents = file.data.parents || [];
  for (const parentId of parents) {
    if (parentId === ancestorId) return true;
    if (await isDescendantOf(parentId, ancestorId, depth + 1)) return true;
  }
  return false;
}

async function findFolder(folderName, parentId = null) {
  const searchParent = parentId || process.env.GOOGLE_FOLDER_ID;
  const query = `name = '${escapeDriveQuery(folderName)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${searchParent}' in parents`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  return null;
}

async function getOrCreateFolder(folderName, parentId = null) {
  const existing = await findFolder(folderName, parentId);
  if (existing) return existing;

  const searchParent = parentId || process.env.GOOGLE_FOLDER_ID;
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [searchParent]
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id'
  });

  return folder.data.id;
}

app.post('/upload', uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    const { agencyName, fileType } = req.body; 
    const currentYear = new Date().getFullYear().toString();
    const path = require('path');
    const fileExtension = path.extname(req.file.originalname);
    let finalFileName = req.file.originalname;
    
    if (!agencyName || !fileType) {
      return res.status(400).send('Agency Name and File Type are required.');
    }

    if (fileType === 'Self-Assessment') {
      const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).send('Invalid file type. Self-Assessments must be Excel files.');
      }
      finalFileName = `PRIME-HRM Assessment-(${agencyName})${fileExtension}`;
    } 
    else if (fileType === 'Assist-Plan') {
      finalFileName = `PRIME-HRM Assist Plan-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Progress-Log') {
      finalFileName = `Progress Log-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Action-Plan') {
      const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/pdf'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).send('Invalid file type. Action Plans must be Word or PDF files.');
      }
      finalFileName = `Action Plan-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Evaluation-Capability-Card') {
      const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).send('Invalid file type. Agency Evaluation Capability Card must be an Excel file.');
      }
      finalFileName = `Agency Evaluation Capability Card-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Field-Director-Guidepost') {
      const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).send('Invalid file type. Guidepost of the Field Director must be an Excel file.');
      }
      finalFileName = `Guidepost Field Director-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Regional-Director-Guidepost') {
      const allowedMimeTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).send('Invalid file type. Guidepost of the Regional Director must be a Word file.');
      }
      finalFileName = `Guidepost Regional Director-(${agencyName})${fileExtension}`;
    }
    else if (fileType === 'Narrative-Report') {
      finalFileName = `Narrative Report-(${agencyName})${fileExtension}`;
    }

    const agencyFolderId = await getOrCreateFolder(agencyName);
    const yearFolderId = await getOrCreateFolder(currentYear, agencyFolderId);

    // Field Office Monitoring uploads go into their own folder
    const FOM_FILE_TYPES = ['Assist-Plan', 'Progress-Log'];
    const RECOMMENDATION_FILE_TYPES = [
      'Evaluation-Capability-Card',
      'Field-Director-Guidepost',
      'Regional-Director-Guidepost',
      'Narrative-Report'
    ];

    let uploadFolderId = yearFolderId;
    if (FOM_FILE_TYPES.includes(fileType)) {
      uploadFolderId = await getOrCreateFolder('Field Office Monitoring', yearFolderId);
    } else if (RECOMMENDATION_FILE_TYPES.includes(fileType)) {
      uploadFolderId = await getOrCreateFolder('Recommendations', yearFolderId);
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [uploadFolderId],
      },
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;

    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    res.status(200).json({ 
      fileId: fileId, 
      webViewLink: response.data.webViewLink,
      fileName: finalFileName
    });

  } catch (error) {
    console.error('Secure Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/upload-evidence', uploadLimiter, upload.array('files'), async (req, res) => {
  try {
    const { agencyName, assessmentYear } = req.body;
    const files = req.files;

    if (!agencyName || !assessmentYear) {
      return res.status(400).json({ error: 'Agency Name and Assessment Year are required.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: `Invalid file type: ${file.originalname}. Only PDF and image files are allowed.` });
      }
    }

    const agencyFolderId = await getOrCreateFolder(agencyName);
    const yearFolderId = await getOrCreateFolder(assessmentYear, agencyFolderId);
    const evidenceFolderId = await getOrCreateFolder('Evidence Requirements', yearFolderId);

    const uploadedFiles = [];

    for (const file of files) {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);

      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [evidenceFolderId],
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        fields: 'id, name, webViewLink, mimeType',
      });

      const fileId = response.data.id;

      await drive.permissions.create({
        fileId: fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      uploadedFiles.push({
        fileId: fileId,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        mimeType: response.data.mimeType,
      });
    }

    res.status(200).json({
      success: true,
      uploadedFiles,
      count: uploadedFiles.length,
    });

  } catch (error) {
    console.error('Upload Evidence Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/drive/list-evidence', async (req, res) => {
  try {
    const { agencyName, assessmentYear } = req.query;

    if (!agencyName || !assessmentYear) {
      return res.status(400).json({ error: 'agencyName and assessmentYear are required.' });
    }

    const agencyFolderId = await getOrCreateFolder(agencyName);
    const yearFolderId = await getOrCreateFolder(assessmentYear, agencyFolderId);
    const evidenceFolderId = await getOrCreateFolder('Evidence Requirements', yearFolderId);

    const response = await drive.files.list({
      q: `'${evidenceFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size, webContentLink)',
      pageSize: 1000,
      orderBy: 'name',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    const files = (response.data.files || []).filter(
      item => item.mimeType !== 'application/vnd.google-apps.folder'
    );

    res.status(200).json({
      folderId: evidenceFolderId,
      files,
    });
  } catch (error) {
    console.error('List Evidence Error:', error);
    res.status(500).json({ error: 'Failed to list evidence files' });
  }
});

app.post('/approve-deletion', deleteLimiter, async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    let fileMeta;
    try {
      fileMeta = await drive.files.get({
        fileId,
        fields: 'mimeType, name, webViewLink'
      });
    } catch (metaErr) {
      console.error('Approve deletion metadata fetch error:', metaErr);
    }

    try {
      await drive.files.delete({ fileId });
    } catch (deleteErr) {
      if (deleteErr.code === 403 || deleteErr.message?.includes('Insufficient permissions')) {
        const location = fileMeta ? await buildDrivePath(fileId) : 'Unknown location';
        return res.status(403).json({
          error: 'Cannot delete this file because it is owned by a different Google account. Only the file owner can delete it.',
          code: 'NOT_OWNER',
          mimeType: fileMeta?.data?.mimeType,
          name: fileMeta?.data?.name,
          webViewLink: fileMeta?.data?.webViewLink,
          location
        });
      }
      throw deleteErr;
    }

    res.status(200).json({ success: true, message: 'File deleted from Google Drive' });
  } catch (error) {
    console.error('Approve deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file from Google Drive' });
  }
});

app.post('/upload-action-plan', uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    const { agencyName } = req.body;
    const currentYear = new Date().getFullYear().toString();

    if (!agencyName) {
      return res.status(400).send('Agency Name is required.');
    }

    if (!req.file) {
      return res.status(400).send('No file provided.');
    }

    const finalFileName = `Action Plan-(${agencyName}).docx`;

    const agencyFolderId = await getOrCreateFolder(agencyName);
    const yearFolderId = await getOrCreateFolder(currentYear, agencyFolderId);

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [yearFolderId],
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: bufferStream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = response.data.id;

    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    res.status(200).json({
      fileId: fileId,
      webViewLink: response.data.webViewLink,
      fileName: finalFileName
    });

  } catch (error) {
    console.error('Upload Action Plan Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/list-files', async (req, res) => {
    const userAccessToken = req.headers.authorization?.split(' ')[1];
    const SHARED_FOLDER_ID = process.env.GOOGLE_FOLDER_ID;

    if (!userAccessToken) {
        return res.status(401).send("Unauthorized: No token provided");
    }

    try {
        const userAuth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        userAuth.setCredentials({ access_token: userAccessToken });

        const userDrive = google.drive({ version: 'v3', auth: userAuth });

        const response = await userDrive.files.list({
            q: `'${SHARED_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink)',
        });

        res.status(200).json(response.data.files);
    } catch (error) {
        console.error('List Files Error:', error);
        res.status(500).send("Failed to fetch files from Drive.");
    }
});

app.get('/drive/browse', async (req, res) => {
  try {
    const folderId = req.query.folderId || process.env.GOOGLE_FOLDER_ID;
    
    let currentFolderName = 'Root';
    if (folderId !== process.env.GOOGLE_FOLDER_ID) {
      try {
        const folderInfo = await drive.files.get({
          fileId: folderId,
          fields: 'name'
        });
        currentFolderName = folderInfo.data.name;
      } catch (err) {
        console.error('Error fetching folder name:', err);
      }
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime, size, webContentLink)',
      pageSize: 1000,
      orderBy: 'folder,name',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    const items = response.data.files || [];
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');

    res.status(200).json({
      currentFolderId: folderId,
      currentFolderName,
      folders,
      files
    });
  } catch (error) {
    console.error('Drive browse error:', error);
    res.status(500).json({ error: 'Failed to browse folder' });
  }
});

app.post('/drive/delete', deleteLimiter, async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const fileMeta = await drive.files.get({
      fileId,
      fields: 'mimeType, name, webViewLink'
    });

    let nestedFileIds = [];
    if (fileMeta.data.mimeType === 'application/vnd.google-apps.folder') {
      nestedFileIds = await collectFileIds(fileId);
    }

    try {
      await drive.files.delete({ fileId });
    } catch (deleteErr) {
      if (deleteErr.code === 403 || deleteErr.message?.includes('Insufficient permissions')) {
        const location = await buildDrivePath(fileId);
        return res.status(403).json({
          error: 'Cannot delete this item because it is owned by a different Google account. Only the file owner can delete it.',
          code: 'NOT_OWNER',
          mimeType: fileMeta.data.mimeType,
          name: fileMeta.data.name,
          webViewLink: fileMeta.data.webViewLink,
          location,
          nestedFileIds
        });
      }
      throw deleteErr;
    }

    res.status(200).json({ 
      success: true, 
      message: 'Item deleted successfully',
      mimeType: fileMeta.data.mimeType,
      name: fileMeta.data.name,
      nestedFileIds
    });
  } catch (error) {
    console.error('Drive delete error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.get('/drive/file-exists', async (req, res) => {
  try {
    const { fileId, agencyName } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    try {
      const file = await drive.files.get({
        fileId,
        fields: 'id, trashed, parents'
      });

      if (file.data.trashed) {
        return res.status(200).json({ exists: false });
      }

      // If no agencyName provided, just check existence + trashed
      if (!agencyName) {
        return res.status(200).json({ exists: true });
      }

      // Verify the file is inside the expected agency folder path
      const currentYear = new Date().getFullYear().toString();
      const agencyFolderId = await findFolder(agencyName);
      if (!agencyFolderId) {
        return res.status(200).json({ exists: false });
      }

      const yearFolderId = await findFolder(currentYear, agencyFolderId);
      if (!yearFolderId) {
        return res.status(200).json({ exists: false });
      }

      const isInCorrectFolder = await isDescendantOf(fileId, yearFolderId);

      res.status(200).json({ exists: isInCorrectFolder });
    } catch (err) {
      if (err.code === 404 || err.message?.includes('notFound')) {
        res.status(200).json({ exists: false });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('File exists check error:', error);
    res.status(500).json({ error: 'Failed to check file existence' });
  }
});

app.post('/generate-narrative-report', async (req, res) => {
  try {
    const { agencyName, selfAssessmentFileId } = req.body;
    if (!agencyName || !selfAssessmentFileId) {
      return res.status(400).json({ error: 'agencyName and selfAssessmentFileId are required' });
    }

    const { buffer, data } = await generateNarrativeReport({
      drive,
      agencyName,
      selfAssessmentFileId
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Narrative Report-(${agencyName}).docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Generate narrative report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ─── Backup Endpoints ─── */
app.get('/backup/config', async (req, res) => {
  try {
    const config = await backupService.getBackupConfig();
    res.status(200).json({ config: config || {} });
  } catch (error) {
    console.error('Backup config get error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup/config', async (req, res) => {
  try {
    const { enabled, frequency, collections } = req.body;
    await backupService.saveBackupConfig({ enabled, frequency, collections });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Backup config save error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/backup/collections', async (req, res) => {
  try {
    const collections = await backupService.listCollections();
    res.status(200).json({ collections });
  } catch (error) {
    console.error('Backup collections error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup/estimate', async (req, res) => {
  try {
    const { collections } = req.body;
    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({ error: 'collections array is required' });
    }
    const { totalDocs, totalSize } = await backupService.estimateBackupSize(collections);
    res.status(200).json({
      totalDocs,
      totalSize,
      sizeDisplay: backupService.formatBytes(totalSize)
    });
  } catch (error) {
    console.error('Backup estimate error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup/run', async (req, res) => {
  try {
    const { collections } = req.body;
    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({ error: 'collections array is required' });
    }
    const result = await backupService.runBackup(collections);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Backup run error:', error);
    await backupService.logBackupError(req.body.collections || [], error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/backup/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await backupService.getBackupHistory(limit);
    res.status(200).json({ history });
  } catch (error) {
    console.error('Backup history error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/backup/download', async (req, res) => {
  try {
    const { fileId, fileName } = req.query;
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const metaRes = await drive.files.get({
      fileId,
      fields: 'name, mimeType'
    });

    const downloadName = fileName || metaRes.data.name || 'backup.json';

    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Content-Type', metaRes.data.mimeType || 'application/json');
    fileRes.data.pipe(res);
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/drive/folder-link', async (req, res) => {
  try {
    const { agencyName, folderName } = req.query;
    if (!agencyName || !folderName) {
      return res.status(400).json({ error: 'agencyName and folderName are required' });
    }

    const currentYear = new Date().getFullYear().toString();
    const agencyFolderId = await findFolder(agencyName);
    if (!agencyFolderId) {
      return res.status(404).json({ error: 'Agency folder not found' });
    }

    const yearFolderId = await findFolder(currentYear, agencyFolderId);
    if (!yearFolderId) {
      return res.status(404).json({ error: 'Year folder not found' });
    }

    const targetFolderId = await getOrCreateFolder(folderName, yearFolderId);
    res.status(200).json({
      folderId: targetFolderId,
      folderUrl: `https://drive.google.com/drive/folders/${targetFolderId}`
    });
  } catch (error) {
    console.error('Folder link error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/read-excel', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'src', 'excel_test_data', 'PRIME-HRM EXAMPLE DATA.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets['Assessment Results'];

    if (!worksheet) {
      return res.status(404).json({ error: 'Sheet "Assessment Results" not found.' });
    }

    const cells = {
      H8: worksheet['H8']?.v ?? null,
      N8: worksheet['N8']?.v ?? null,
      T8: worksheet['T8']?.v ?? null,
      Z8: worksheet['Z8']?.v ?? null,
      H53: worksheet['H53']?.v ?? null,
      Y53: worksheet['Y53']?.v ?? null
    };

    res.status(200).json({ cells });
  } catch (error) {
    console.error('Read Excel Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000; 

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});