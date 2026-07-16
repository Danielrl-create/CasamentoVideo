import express from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Create uploads dir if not exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer setup - disk storage
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'video/mp4', 'video/quicktime'];
    const originalNameLower = file.originalname.toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || originalNameLower.match(/\.(jpg|jpeg|png|heic|mp4|mov)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo inválido. Apenas JPG, PNG, HEIC, MP4 e MOV são permitidos.'));
    }
  }
});

// Google Drive Auth
function getDriveService() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    throw new Error('Credenciais da Service Account não configuradas.');
  }
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

app.post('/api/upload', (req, res, next) => {
  upload.array('files', 15)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      files.forEach(f => fs.unlinkSync(f.path));
      return res.status(401).json({ error: 'Token de autenticação não fornecido. Faça login com o Google.' });
    }
    
    const accessToken = authHeader.split(' ')[1];
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID; 
    
    if (!targetFolderId) {
       const folderQuery = await drive.files.list({
         q: "mimeType='application/vnd.google-apps.folder' and name='Casamento Uploads' and trashed=false",
         fields: 'files(id, name)',
       });
       if (folderQuery.data.files && folderQuery.data.files.length > 0) {
         targetFolderId = folderQuery.data.files[0].id!;
       } else {
         const newFolder = await drive.files.create({
           requestBody: {
             name: 'Casamento Uploads',
             mimeType: 'application/vnd.google-apps.folder',
           },
           fields: 'id',
         });
         targetFolderId = newFolder.data.id!;
       }
    }

    const uploadedFiles = [];

    for (const file of files) {
      let fileMetadata = {
        name: file.originalname,
        parents: [targetFolderId],
      };
      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };

      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id',
        });
        uploadedFiles.push(response.data.id);
      } catch (err: any) {
        // If it's a 404 (File not found) on the parent folder, it means the user logging in doesn't have access to the configured GOOGLE_DRIVE_FOLDER_ID.
        // Fallback to uploading without a parent folder (root directory).
        if (err.status === 404 || err.code === 404 || err.message?.includes('File not found')) {
          console.log('Parent folder not found or accessible. Uploading to root...');
          fileMetadata = {
            name: file.originalname,
            parents: []
          };
          const fallbackResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
          });
          uploadedFiles.push(fallbackResponse.data.id);
        } else {
          throw err;
        }
      }
      
      // Remove temp file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    res.json({ success: true, uploadedFiles });
  } catch (error: any) {
    console.error('Error uploading to Drive:', error);
    res.status(500).json({ error: error.message || 'Erro no upload' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
