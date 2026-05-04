require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');
const cors = require('cors');

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

app.post('/upload', upload.single('file'), async (req, res) => {
  const userAccessToken = req.body.googleToken; 
  const SHARED_FOLDER_ID = process.env.GOOGLE_FOLDER_ID;

  if (!userAccessToken) {
    return res.status(400).send('No Google Access Token provided.');
  }
  try {
    const userAuth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    userAuth.setCredentials({ access_token: userAccessToken });

    const userDrive = google.drive({ version: 'v3', auth: userAuth });

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    const response = await userDrive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [SHARED_FOLDER_ID],
      },
      media: {
        mimeType: req.file.mimetype,
        body: bufferStream,
      },
      fields: 'id',
    });

    res.status(200).json({ fileId: response.data.id });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).send(error.message);
  }
});

const PORT = process.env.PORT || 5000; 

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});