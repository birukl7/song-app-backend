const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Ensure that the albumArt directory exists
const albumArtDirectory = path.join(__dirname, 'albumArt');
if (!fs.existsSync(albumArtDirectory)) {
  fs.mkdirSync(albumArtDirectory);
}

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// In-memory store for songs
let songs = [];

// Serve static files from the uploads and albumArt directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/albumArt', express.static(albumArtDirectory));

// Helper function to extract album art
const extractAlbumArt = async (filePath) => {
  try {
    const mm = await import('music-metadata'); // Use dynamic import
    const metadata = await mm.parseFile(filePath);
    console.log(metadata); // Log the metadata for debugging

    const picture = metadata.common.picture;
    if (picture && picture.length > 0) {
      const albumArt = picture[0];
      const fileExtension = albumArt.format.split('/')[1]; // Extract file extension
      const imagePath = path.join(albumArtDirectory, `${Date.now()}-albumart.${fileExtension}`);
      fs.writeFileSync(imagePath, albumArt.data);
      return `http://localhost:${port}/albumArt/${path.basename(imagePath)}`;
    } else {
      console.log('No album art found');
    }
  } catch (error) {
    console.error('Error extracting album art:', error);
  }
  return null;
};

// Endpoint to fetch all songs
app.get('/api/songs', (req, res) => {
  res.json(songs);
});

// Endpoint to upload a new song
app.post('/api/songs', upload.single('file'), async (req, res) => {
  const { title } = req.body;
  const fileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;

  // Extract album art from the uploaded file
  const albumArtUrl = await extractAlbumArt(req.file.path);

  const newSong = {
    id: Date.now(),
    title,
    fileUrl,
    albumArtUrl,
  };

  songs.push(newSong);

  res.status(201).json(newSong);
});

// Endpoint to update a song
app.put('/api/songs/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const songIndex = songs.findIndex((song) => song.id === parseInt(id));
  if (songIndex === -1) {
    return res.status(404).json({ error: 'Song not found' });
  }

  // Update title if provided
  if (title) {
    songs[songIndex].title = title;
  }

  // Update file if provided
  if (req.file) {
    // Delete old file
    const oldFilePath = songs[songIndex].fileUrl.replace(`http://localhost:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    // Set new file URL
    const newFileUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    songs[songIndex].fileUrl = newFileUrl;

    // Extract new album art from the uploaded file
    const newAlbumArtUrl = await extractAlbumArt(req.file.path);
    songs[songIndex].albumArtUrl = newAlbumArtUrl;
  }

  res.json(songs[songIndex]);
});

// Endpoint to delete a song
app.delete('/api/songs/:id', (req, res) => {
  const { id } = req.params;

  const songIndex = songs.findIndex((song) => song.id === parseInt(id));
  if (songIndex !== -1) {
    const oldFilePath = songs[songIndex].fileUrl.replace(`http://localhost:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (songs[songIndex].albumArtUrl) {
      const oldAlbumArtPath = songs[songIndex].albumArtUrl.replace(`http://localhost:${port}/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
    }

    songs = songs.filter((song) => song.id !== parseInt(id));
  }

  res.status(204).end();
});

// Endpoint to clear all songs
app.delete('/api/songs', (req, res) => {
  songs.forEach(song => {
    const oldFilePath = song.fileUrl.replace(`http://localhost:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (song.albumArtUrl) {
      const oldAlbumArtPath = song.albumArtUrl.replace(`http://localhost:${port}/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
    }
  });

  songs = [];
  res.status(204).end();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
