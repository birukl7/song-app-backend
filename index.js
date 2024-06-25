require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql');

const app = express();

const corsOptions = {
  origin: 'https://song-app-backend.vercel.app', // Replace with your frontend app URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));




// Middleware to parse JSON bodies
app.use(express.json());

// Ensure that the albumArt directory exists
const albumArtDirectory = path.join(__dirname, 'albumArt');
if (!fs.existsSync(albumArtDirectory)) {
  fs.mkdirSync(albumArtDirectory);
}

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
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

// Helper function to extract album art and metadata
const extractMetadata = async (filePath) => {
  try {
    const mm = await import('music-metadata');
    const metadata = await mm.parseFile(filePath);
    const common = metadata.common || {};
    const picture = common.picture && common.picture[0];
    const lyrics = common.lyrics ? common.lyrics.join('\n') : '';

    console.log(common);

    let albumArtUrl = null;
    if (picture) {
      const fileExtension = picture.format.split('/')[1];
      const imagePath = path.join(albumArtDirectory, `${Date.now()}-albumart.${fileExtension}`);
      fs.writeFileSync(imagePath, picture.data);
      albumArtUrl = `/albumArt/${path.basename(imagePath)}`;
    }

    return {
      title: common.title || 'Unknown Title',
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      year: common.year || null,
      genre: (common.genre && common.genre.join(', ')) || 'Unknown Genre',
      albumArtUrl,
      duration: metadata.format.duration || 0,
      lyrics,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return null;
  }
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
  const fileUrl = `/uploads/${req.file.filename}`;

  // Extract metadata from the uploaded file
  const metadata = await extractMetadata(req.file.path);
  if (!metadata) {
    return res.status(500).json({ error: 'Error extracting metadata' });
  }

  const newSong = {
    ...metadata,
    fileUrl
  };

  console.log(newSong);

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
  const { title, artist, album, year, genre, duration, lyrics } = req.body;

  db.query('SELECT * FROM songs WHERE id = ?', [id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = results[0];

    // Update file if provided
    if (req.file) {
      // Delete old file
      const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
      fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

      // Set new file URL
      const newFileUrl = `/uploads/${req.file.filename}`;
      song.fileUrl = newFileUrl;

      // Extract new metadata from the uploaded file
      const newMetadata = await extractMetadata(req.file.path);
      if (newMetadata) {
        song.title = newMetadata.title;
        song.artist = newMetadata.artist;
        song.album = newMetadata.album;
        song.year = newMetadata.year;
        song.genre = newMetadata.genre;
        song.albumArtUrl = newMetadata.albumArtUrl;
        song.duration = newMetadata.duration;
        song.lyrics = newMetadata.lyrics;
      }
    }

    const updateSong = {
      title: title || song.title,
      artist: artist || song.artist,
      album: album || song.album,
      year: year || song.year,
      genre: genre || song.genre,
      albumArtUrl: song.albumArtUrl,
      fileUrl: song.fileUrl,
      duration: duration || song.duration,
      lyrics: lyrics || song.lyrics,
    };

    db.query('UPDATE songs SET ? WHERE id = ?', [updateSong, id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error updating song' });
      }
      res.json(updateSong);
    });
  });
});

// Endpoint to delete a song
app.delete('/api/songs/:id', (req, res) => {
  const { id } = req.params;
  console.log(id);

  db.query('SELECT * FROM songs WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = results[0];

    const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (song.albumArtUrl) {
      const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
    }

    db.query('DELETE FROM songs WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting song' });
      }
      res.status(204).end();
    });
  });
});

// Endpoint to clear all songs
app.delete('/api/songs', (req, res) => {
  db.query('SELECT * FROM songs', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching songs' });
    }

    results.forEach(song => {
      const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
      fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

      if (song.albumArtUrl) {
        const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
        fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
      }
    });

    db.query('DELETE FROM songs', (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error clearing songs' });
      }
      res.status(204).end();
    });
  });
});

// Export the app for Vercel
module.exports = app;
