// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const cors = require('cors');
// const fs = require('fs');
// const mysql = require('mysql');
// require('dotenv').config();


// const app = express();
// const port = process.env.PORT || 3001;

// // Enable CORS for all routes
// const corsOptions = {
//   origin: 'http://localhost:3000',
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true,
//   optionsSuccessStatus: 204
// };
// app.use(cors(corsOptions));

// // Middleware to parse JSON bodies
// app.use(express.json());

// // Ensure that the albumArt directory exists
// const albumArtDirectory = path.join(__dirname, 'albumArt');
// if (!fs.existsSync(albumArtDirectory)) {
//   fs.mkdirSync(albumArtDirectory);
// }

// // MySQL connection
// const db = mysql.createConnection({
//     host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE


//   // host: 'localhost',
//   // user: 'root', // Replace with your MySQL username
//   // password: '', // Replace with your MySQL password
//   // database: 'musicapp'
// });

// db.connect(err => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//   } else {
//     console.log('Connected to the MySQL database.');
//   }
// });

// // Storage configuration for multer
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// // Serve static files from the uploads and albumArt directories
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/albumArt', express.static(albumArtDirectory));

// // Helper function to extract album art and metadata
// const extractMetadata = async (filePath) => {
//   try {
//     const mm = await import('music-metadata');
//     const metadata = await mm.parseFile(filePath);
//     const common = metadata.common || {};
//     const picture = common.picture && common.picture[0];
//     const lyrics = common.lyrics ? common.lyrics.join('\n') : '';


//     let albumArtUrl = null;
//     if (picture) {
//       const fileExtension = picture.format.split('/')[1];
//       const imagePath = path.join(albumArtDirectory, `${Date.now()}-albumart.${fileExtension}`);
//       fs.writeFileSync(imagePath, picture.data);
//       albumArtUrl = `/albumArt/${path.basename(imagePath)}`;
//     }

//     return {
//       title: common.title || 'Unknown Title',
//       artist: common.artist || 'Unknown Artist',
//       album: common.album || 'Unknown Album',
//       year: common.year || null,
//       genre: (common.genre && common.genre.join(', ')) || 'Unknown Genre',
//       albumArtUrl,
//       duration: metadata.format.duration || 0,
//       lyrics,
//     };
//   } catch (error) {
//     console.error('Error extracting metadata:', error);
//     return null;
//   }
// };

// // Endpoint to fetch all songs
// app.get('/api/songs', (req, res) => {
//   db.query('SELECT * FROM songs', (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error fetching songs' });
//     }
//     res.json(results);
//   });
// });

// // Endpoint to upload a new song
// app.post('/api/songs', upload.single('file'), async (req, res) => {
//   const fileUrl = `/uploads/${req.file.filename}`;

//   // Extract metadata from the uploaded file
//   const metadata = await extractMetadata(req.file.path);
//   if (!metadata) {
//     return res.status(500).json({ error: 'Error extracting metadata' });
//   }

//   const newSong = {
//     ...metadata,
//     fileUrl
//   };


//   db.query('INSERT INTO songs SET ?', newSong, (err, result) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error saving song to the database' });
//     }
//     res.status(201).json({ id: result.insertId, ...newSong });
//   });
// });

// // Endpoint to update a song
// app.put('/api/songs/:id', upload.single('file'), async (req, res) => {
//   const { id } = req.params;
//   const { title, artist, album, year, genre, duration, lyrics } = req.body;

//   db.query('SELECT * FROM songs WHERE id = ?', [id], async (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: 'Song not found' });
//     }

//     const song = results[0];

//     // Update file if provided
//     if (req.file) {
//       // Delete old file
//       const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//       fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

//       // Set new file URL
//       const newFileUrl = `/uploads/${req.file.filename}`;
//       song.fileUrl = newFileUrl;

//       // Extract new metadata from the uploaded file
//       const newMetadata = await extractMetadata(req.file.path);
//       if (newMetadata) {
//         song.title = newMetadata.title;
//         song.artist = newMetadata.artist;
//         song.album = newMetadata.album;
//         song.year = newMetadata.year;
//         song.genre = newMetadata.genre;
//         song.albumArtUrl = newMetadata.albumArtUrl;
//         song.duration = newMetadata.duration;
//         song.lyrics = newMetadata.lyrics;
//       }
//     }

//     const updateSong = {
//       title: title || song.title,
//       artist: artist || song.artist,
//       album: album || song.album,
//       year: year || song.year,
//       genre: genre || song.genre,
//       albumArtUrl: song.albumArtUrl,
//       fileUrl: song.fileUrl,
//       duration: duration || song.duration,
//       lyrics: lyrics || song.lyrics,
//     };

//     db.query('UPDATE songs SET ? WHERE id = ?', [updateSong, id], (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error updating song' });
//       }
//       res.json(updateSong);
//     });
//   });
// });

// // Endpoint to delete a song
// app.delete('/api/songs/:id', (req, res) => {
//   const { id } = req.params;
  

//   db.query('SELECT * FROM songs WHERE id = ?', [id], (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: 'Song not found' });
//     }

//     const song = results[0];

//     const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//     fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

//     if (song.albumArtUrl) {
//       const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
//       fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
//     }

//     db.query('DELETE FROM songs WHERE id = ?', [id], (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error deleting song' });
//       }
//       res.status(204).end();
//     });
//   });
// });

// // Endpoint to clear all songs
// app.delete('/api/songs', (req, res) => {
//   db.query('SELECT * FROM songs', (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error fetching songs' });
//     }

//     results.forEach(song => {
//       const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//       fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

//       if (song.albumArtUrl) {
//         const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
//         fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
//       }
//     });

//     db.query('DELETE FROM songs', (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error clearing songs' });
//       }
//       res.status(204).end();
//     });
//   });
// });

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });

// module.exports = app;

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const cors = require('cors');
// const fs = require('fs');
// const mysql = require('mysql');
// require('dotenv').config();

// const app = express();

// // Ensure that the albumArt and uploads directories exist
// const albumArtDirectory = path.join(__dirname, '..', 'albumArt');
// const uploadsDirectory = path.join(__dirname, '..', 'uploads');
// if (!fs.existsSync(albumArtDirectory)) {
//   fs.mkdirSync(albumArtDirectory);
// }
// if (!fs.existsSync(uploadsDirectory)) {
//   fs.mkdirSync(uploadsDirectory);
// }

// // MySQL connection
// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_DATABASE
// });

// db.connect(err => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//   } else {
//     console.log('Connected to the MySQL database.');
//   }
// });

// // Storage configuration for multer
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDirectory);
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage });

// // Enable CORS for all routes
// const corsOptions = {
//   origin: ['http://localhost:3000', 'https://song-app-frontend.vercel.app'],
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//   credentials: true,
//   optionsSuccessStatus: 204
// };
// app.use(cors(corsOptions));

// // app.use(cors());

// // Middleware to parse JSON bodies
// app.use(express.json());

// // Serve static files from the uploads and albumArt directories
// app.use('/uploads', express.static(uploadsDirectory));
// app.use('/albumArt', express.static(albumArtDirectory));

// // Helper function to extract album art and metadata
// const extractMetadata = async (filePath) => {
//   try {
//     const mm = await import('music-metadata');
//     const metadata = await mm.parseFile(filePath);
//     const common = metadata.common || {};
//     const picture = common.picture && common.picture[0];
//     const lyrics = common.lyrics ? common.lyrics.join('\n') : '';

//     let albumArtUrl = null;
//     if (picture) {
//       const fileExtension = picture.format.split('/')[1];
//       const imagePath = path.join(albumArtDirectory, `${Date.now()}-albumart.${fileExtension}`);
//       fs.writeFileSync(imagePath, picture.data);
//       albumArtUrl = `/albumArt/${path.basename(imagePath)}`;
//     }

//     return {
//       title: common.title || 'Unknown Title',
//       artist: common.artist || 'Unknown Artist',
//       album: common.album || 'Unknown Album',
//       year: common.year || null,
//       genre: (common.genre && common.genre.join(', ')) || 'Unknown Genre',
//       albumArtUrl,
//       duration: metadata.format.duration || 0,
//       lyrics,
//     };
//   } catch (error) {
//     console.error('Error extracting metadata:', error);
//     return null;
//   }
// };

// // Endpoint to fetch all songs
// app.get('/api/songs', (req, res) => {
//   db.query('SELECT * FROM songs', (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error fetching songs' });
//     }
//     res.json(results);
//   });
// });

// // Endpoint to upload a new song
// app.post('/api/songs', upload.single('file'), async (req, res) => {
//   const fileUrl = `/uploads/${req.file.filename}`;

//   // Extract metadata from the uploaded file
//   const metadata = await extractMetadata(req.file.path);
//   if (!metadata) {
//     return res.status(500).json({ error: 'Error extracting metadata' });
//   }

//   const newSong = {
//     ...metadata,
//     fileUrl
//   };

//   db.query('INSERT INTO songs SET ?', newSong, (err, result) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error saving song to the database' });
//     }
//     res.status(201).json({ id: result.insertId, ...newSong });
//   });
// });

// // Endpoint to update a song
// app.put('/api/songs/:id', upload.single('file'), async (req, res) => {
//   const { id } = req.params;
//   const { title, artist, album, year, genre, duration, lyrics } = req.body;

//   db.query('SELECT * FROM songs WHERE id = ?', [id], async (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: 'Song not found' });
//     }

//     const song = results[0];

//     // Update file if provided
//     if (req.file) {
//       // Delete old file
//       const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//       fs.unlinkSync(path.join(uploadsDirectory, oldFilePath));

//       // Set new file URL
//       const newFileUrl = `/uploads/${req.file.filename}`;
//       song.fileUrl = newFileUrl;

//       // Extract new metadata from the uploaded file
//       const newMetadata = await extractMetadata(req.file.path);
//       if (newMetadata) {
//         song.title = newMetadata.title;
//         song.artist = newMetadata.artist;
//         song.album = newMetadata.album;
//         song.year = newMetadata.year;
//         song.genre = newMetadata.genre;
//         song.albumArtUrl = newMetadata.albumArtUrl;
//         song.duration = newMetadata.duration;
//         song.lyrics = newMetadata.lyrics;
//       }
//     }

//     const updateSong = {
//       title: title || song.title,
//       artist: artist || song.artist,
//       album: album || song.album,
//       year: year || song.year,
//       genre: genre || song.genre,
//       albumArtUrl: song.albumArtUrl,
//       fileUrl: song.fileUrl,
//       duration: duration || song.duration,
//       lyrics: lyrics || song.lyrics,
//     };

//     db.query('UPDATE songs SET ? WHERE id = ?', [updateSong, id], (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error updating song' });
//       }
//       res.json(updateSong);
//     });
//   });
// });

// // Endpoint to delete a song
// app.delete('/api/songs/:id', (req, res) => {
//   const { id } = req.params;

//   db.query('SELECT * FROM songs WHERE id = ?', [id], (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: 'Song not found' });
//     }

//     const song = results[0];

//     const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//     fs.unlinkSync(path.join(uploadsDirectory, oldFilePath));

//     if (song.albumArtUrl) {
//       const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
//       fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
//     }

//     db.query('DELETE FROM songs WHERE id = ?', [id], (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error deleting song' });
//       }
//       res.status(204).end();
//     });
//   });
// });

// // Endpoint to clear all songs
// app.delete('/api/songs', (req, res) => {
//   db.query('SELECT * FROM songs', (err, results) => {
//     if (err) {
//       return res.status(500).json({ error: 'Error fetching songs' });
//     }

//     results.forEach(song => {
//       const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
//       fs.unlinkSync(path.join(uploadsDirectory, oldFilePath));

//       if (song.albumArtUrl) {
//         const oldAlbumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
//         fs.unlinkSync(path.join(albumArtDirectory, oldAlbumArtPath));
//       }
//     });

//     db.query('DELETE FROM songs', (err) => {
//       if (err) {
//         return res.status(500).json({ error: 'Error clearing songs' });
//       }
//       res.status(204).end();
//     });
//   });
// });

// app.listen(process.env.PORT || 3001, () => {
//   console.log(`Server is running on http://localhost:${process.env.PORT || 3001}`);
// });

// module.exports = app;


const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mysql = require('mysql');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

// Ensure that the albumArt directory exists
const albumArtDirectory = '/tmp/albumArt';
if (!fs.existsSync(albumArtDirectory)) {
  fs.mkdirSync(albumArtDirectory, { recursive: true });
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

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve album art files from the /tmp/albumArt directory
app.get('/albumArt/:filename', (req, res) => {
  const filePath = path.join(albumArtDirectory, req.params.filename);
  res.sendFile(filePath);
});

// Helper function to extract album art and metadata
const extractMetadata = async (filePath) => {
  try {
    const mm = await import('music-metadata');
    const metadata = await mm.parseFile(filePath);
    const common = metadata.common || {};
    const picture = common.picture && common.picture[0];
    const lyrics = common.lyrics ? common.lyrics.join('\n') : '';

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

  db.query('SELECT * FROM songs WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = results[0];

    const oldFilePath = song.fileUrl.replace(`/uploads/`, '');
    fs.unlinkSync(path.join(__dirname, 'uploads', oldFilePath));

    if (song.albumArtUrl) {
      const albumArtPath = song.albumArtUrl.replace(`/albumArt/`, '');
      fs.unlinkSync(path.join(albumArtDirectory, albumArtPath));
    }

    db.query('DELETE FROM songs WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting song' });
      }
      res.json({ message: 'Song deleted' });
    });
  });
});

// Endpoint to clear all songs
app.delete('/api/songs', (req, res) => {
  db.query('DELETE FROM songs', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error clearing songs' });
    }

    // Remove all files in uploads directory
    fs.readdirSync('uploads').forEach((file) => {
      fs.unlinkSync(path.join(__dirname, 'uploads', file));
    });

    // Remove all files in albumArt directory
    fs.readdirSync(albumArtDirectory).forEach((file) => {
      fs.unlinkSync(path.join(albumArtDirectory, file));
    });

    res.json({ message: 'All songs cleared' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

