require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');

const app = express();
app.use(cors());
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

async function getOrCreateFolder(folderName, parentId = null) {
  const searchParent = parentId || process.env.GOOGLE_FOLDER_ID;
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${searchParent}' in parents`;
  const res = await drive.files.list({ q: query, fields: 'files(id)' });
  
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

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

app.post('/upload', upload.single('file'), async (req, res) => {
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

app.get('/read-excel', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'excel_test_data', 'PRIME-HRM EXAMPLE DATA.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets['Assessment Results'];

    if (!worksheet) {
      return res.status(404).json({ error: 'Sheet "Assessment Results" not found.' });
    }

    const cells = {
      H8: worksheet['H8']?.v ?? null,
      N8: worksheet['N8']?.v ?? null,
      T8: worksheet['T8']?.v ?? null,
      Z8: worksheet['Z8']?.v ?? null
    };

    res.status(200).json({ cells });
  } catch (error) {
    console.error('Read Excel Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000; 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});