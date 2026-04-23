require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer();

// Replace these with your actual values
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

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [process.env.GOOGLE_FOLDER_ID], // The folder in your drive
      },
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id',
    });

    res.status(200).json({ success: true, id: response.data.id });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).send(error.message);
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));