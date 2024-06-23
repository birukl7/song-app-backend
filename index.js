const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql');

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

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: 'password', // Replace with your MySQL password
  database: 'musicApp'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to the MySQL database.');
  }
});

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
      return `http://song-app-bakend.vercel.app:${port}/albumArt/${path.basename(imagePath)}`;
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
  db.query('SELECT * FROM songs', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching songs' });
    }
    res.json(results);
  });
});

// Endpoint to upload a new song
app.post('/api/songs', upload.single('file'), async (req, res) => {
  const fileUrl = `http://song-app-bakend.vercel.app:${port}/uploads/${req.file.filename}`;

  // Extract album art and metadata from the uploaded file
  const metadata = await extractAlbumArt(req.file.path);
  const { common } = metadata;
  const { title, artist, album, year, genre, picture, duration } = common;

  const albumArtUrl = await extractAlbumArt(req.file.path);

  const newSong = {
    title,
    artist,
    album,
    year,
    genre: genre.join(', '),
    albumArtUrl,
    fileUrl,
    duration
  };

  db.query('INSERT INTO songs SET ?', newSong, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error saving song to the database' });
    }
    res.status(201).json({ id: result.insertId, ...newSong });
  });
});

// Endpoint to update a song
app.put('/api/songs/:id', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { title, artist, album, year, genre, duration } = req.body;

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
    const oldFilePath = songs[songIndex].fileUrl.replace(`http://song-app-bakend.vercel.app:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    // Set new file URL
    const newFileUrl = `http://song-app-bakend.vercel.app:${port}/uploads/${req.file.filename}`;
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
    const oldFilePath = songs[songIndex].fileUrl.replace(`http://song-app-bakend.vercel.app:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (songs[songIndex].albumArtUrl) {
      const oldAlbumArtPath = songs[songIndex].albumArtUrl.replace(`http://song-app-bakend.vercel.app:${port}/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
    }

    songs = songs.filter((song) => song.id !== parseInt(id));
  }

  res.status(204).end();
});

// Endpoint to clear all songs
app.delete('/api/songs', (req, res) => {
  songs.forEach(song => {
    const oldFilePath = song.fileUrl.replace(`http://song-app-bakend.vercel.app:${port}/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (song.albumArtUrl) {
      const oldAlbumArtPath = song.albumArtUrl.replace(`http://song-app-bakend.vercel.app:${port}/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
    }
  });

  songs = [];
  res.status(204).end();
});

app.listen(port, () => {
  console.log(`Server is running on http://song-app-bakend.vercel.app:${port}`);
});
