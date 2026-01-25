import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// ESM __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up SQLite database
sqlite3.verbose();
const dbPath = path.join(__dirname, 'artikin.db');
const db = new sqlite3.Database(dbPath);

const createTables = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        author TEXT,
        authorRole TEXT,
        imagePath TEXT,
        date TEXT,
        ownerId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // Migration: Add ownerId if it doesn't exist
    db.all("PRAGMA table_info(blogs)", (err, columns) => {
      if (err) return;
      const hasOwnerId = columns.some(col => col.name === 'ownerId');
      if (!hasOwnerId) {
        db.run("ALTER TABLE blogs ADD COLUMN ownerId TEXT");
      }
    });


    // Seed with one welcome blog if empty
    db.get('SELECT COUNT(*) as count FROM blogs', (err, row) => {
      if (err) return;
      if (row && row.count === 0) {
        const nowIso = new Date().toISOString();
        const dateStr = formatDate();
        const sql = `
          INSERT INTO blogs (title, excerpt, content, author, authorRole, imagePath, date, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
          sql,
          [
            'Welcome to Artikin Blog',
            'This is your first Artikin blog post. Use the Create button to add more.',
            '<p>This is your first Artikin blog post. Use the Create button to add more posts for your community.</p>',
            'Artikin Team',
            'Editors',
            null,
            dateStr,
            nowIso,
            nowIso,
          ],
        );
      }
    });
  });
};

const formatDate = () =>
  new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const blogRowToJson = (row) => ({
  id: row.id,
  title: row.title,
  excerpt: row.excerpt,
  content: row.content,
  author: row.author,
  authorRole: row.authorRole,
  ownerId: row.ownerId,
  image: row.imagePath ? `/uploads/${path.basename(row.imagePath)}` : null,
  date: row.date,
  commentCount: row.commentCount ?? 0,
});

createTables();

// Express app setup
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    const unique = Date.now();
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({ storage });

// ROUTES

// Get all blogs (with comment count)
app.get('/api/blogs', (req, res) => {
  const sql = `
    SELECT * FROM blogs
    ORDER BY datetime(createdAt) DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch blogs' });
    }
    const blogs = rows.map(blogRowToJson);
    res.json(blogs);
  });
});

// Get a single blog with comments
app.get('/api/blogs/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch blog' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const blog = blogRowToJson(row);
    res.json(blog);
  });
});

// Create a new blog (supports optional image upload)
app.post('/api/blogs', upload.single('image'), (req, res) => {
  const { title, excerpt, content, author, authorRole, ownerId } = req.body;

  console.log('--- New Blog Create Request ---');
  console.log('Body:', { title, excerpt, author, authorRole, ownerId });
  console.log('File:', req.file ? req.file.filename : 'No image');

  if (!title || !content) {
    console.error('Validation Error: Title or content missing');
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const imagePath = req.file ? path.join('uploads', req.file.filename) : null;
  const dateStr = formatDate();
  const nowIso = new Date().toISOString();

  const sql = `
    INSERT INTO blogs (title, excerpt, content, author, authorRole, imagePath, date, ownerId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      title,
      excerpt || '',
      content,
      author || 'Anonymous',
      authorRole || '',
      imagePath,
      dateStr,
      ownerId || null,
      nowIso,
      nowIso,
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to create blog' });
      }

      const insertedId = this.lastID;
      console.log('Successfully inserted blog with ID:', insertedId);

      db.get('SELECT * FROM blogs WHERE id = ?', [insertedId], (gErr, row) => {
        if (gErr || !row) {
          console.error('Failed to read back created blog:', gErr);
          return res.status(500).json({ error: 'Failed to read created blog' });
        }
        console.log('Sending back created blog JSON');
        res.status(201).json(blogRowToJson(row));
      });
    },
  );
});

// Update an existing blog (supports optional new image upload)
app.put('/api/blogs/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, excerpt, content, author, authorRole } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, existing) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch blog' });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const requestOwnerId = req.headers['x-owner-id'] || req.body.ownerId;
    if (existing.ownerId && existing.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    let imagePath = existing.imagePath;
    if (req.file) {
      // Delete old image if existed
      if (imagePath) {
        const fullOldPath = path.join(__dirname, imagePath);
        fs.unlink(fullOldPath, () => { });
      }
      imagePath = path.join('uploads', req.file.filename);
    }

    const nowIso = new Date().toISOString();
    const sql = `
      UPDATE blogs
      SET title = ?, excerpt = ?, content = ?, author = ?, authorRole = ?, imagePath = ?, updatedAt = ?
      WHERE id = ?
    `;

    db.run(
      sql,
      [
        title,
        excerpt || '',
        content,
        author || 'Anonymous',
        authorRole || '',
        imagePath,
        nowIso,
        id,
      ],
      function (uErr) {
        if (uErr) {
          console.error(uErr);
          return res.status(500).json({ error: 'Failed to update blog' });
        }

        db.get('SELECT * FROM blogs WHERE id = ?', [id], (gErr, row) => {
          if (gErr || !row) {
            console.error(gErr);
            return res.status(500).json({ error: 'Failed to read updated blog' });
          }
          res.json(blogRowToJson(row));
        });
      },
    );
  });
});

// Delete a blog (and its comments)
app.delete('/api/blogs/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch blog' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const requestOwnerId = req.headers['x-owner-id'];
    if (row.ownerId && row.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    const imagePath = row.imagePath;

    db.run('DELETE FROM blogs WHERE id = ?', [id], (dErr) => {
      if (dErr) {
        console.error(dErr);
        return res.status(500).json({ error: 'Failed to delete blog' });
      }

      if (imagePath) {
        const fullPath = path.join(__dirname, imagePath);
        fs.unlink(fullPath, () => { });
      }

      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Artikin API running on http://localhost:${PORT}`);
});
