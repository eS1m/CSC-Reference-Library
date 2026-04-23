const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const upload = multer();

const KEYFILEPATH = path.join(__dirname, 'service-account-key.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const driveService = google.drive({ version: 'v3', auth });
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await driveService.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: ['1CpsPb_Q0r2TkBmYANh01QrP2wVFsggYG'],
      },
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
    });

    console.log('File uploaded successfully:', response.data.id);
    res.status(200).json({ success: true, id: response.data.id });
  } catch (error) {
    console.error('Drive API Error:', error);
    res.status(500).send(error.message);
  }
});

app.listen(5000, () => {
  console.log('Backend server running at http://localhost:5000');
});