import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

dotenv.config();

// ESM __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
let db = null;
let isUsingSupabase = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isUsingSupabase = true;
    console.log("Using Supabase for database storage.");
  } catch (err) {
    console.error("Failed to initialize Supabase:", err);
  }
}

if (!isUsingSupabase) {
  console.log("------------------------------------------------------------------");
  console.log("NOTICE: Running in local mode with SQLite.");
  console.log("Ensure server/artikin.db exists or will be created.");
  console.log("To use Supabase, set SUPABASE_URL and SUPABASE_KEY in .env");
  console.log("------------------------------------------------------------------");

  const dbPath = path.join(__dirname, 'artikin.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('SQLite connection error:', err.message);
    } else {
      console.log('Connected to local SQLite database.');
      // Ensure the table exists if it doesn't
      db.run(`CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        author TEXT DEFAULT 'Anonymous',
        authorRole TEXT,
        imagePath TEXT,
        date TEXT,
        ownerId TEXT,
        status TEXT DEFAULT 'published',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
    }
  });
}

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
  status: row.status || 'published',
  image: row.imagePath, // In Supabase, this will be the full URL or a path we resolve
  date: row.date,
  commentCount: row.commentCount ?? 0,
});

// Express app setup
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Multer setup for memory storage (we will upload directly to Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ROUTES

// Get all blogs
app.get('/api/blogs', async (req, res) => {
  try {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return res.json(data.map(blogRowToJson));
    } else {
      const query = 'SELECT * FROM blogs ORDER BY id DESC';
      console.log('Running SQLite query:', query);
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('FATAL SQLite error:', err.message);
          return res.status(500).json({ error: 'Failed to fetch blogs', details: err.message });
        }
        console.log(`Success: Fetched ${rows ? rows.length : 0} blogs.`);
        res.json((rows || []).map(blogRowToJson));
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get a single blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Blog not found' });
      return res.json(blogRowToJson(data));
    } else {
      db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to fetch blog' });
        }
        if (!row) return res.status(404).json({ error: 'Blog not found' });
        res.json(blogRowToJson(row));
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch blog' });
  }
});

// Create a new blog
app.post('/api/blogs', upload.single('image'), async (req, res) => {
  try {
    const { title, excerpt, content, author, authorRole, ownerId, status } = req.body;

    console.log('--- New Blog Create Request ---');
    console.log('Body:', { title, excerpt, author, authorRole, ownerId, status });

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let imagePath = null;
    if (req.file) {
      if (isUsingSupabase) {
        const ext = path.extname(req.file.originalname) || '';
        const base = path.basename(req.file.originalname, ext).replace(/\s+/g, '-');
        const unique = Date.now();
        const filename = `${base}-${unique}${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload Error:', uploadError, 'Filename:', filename, 'MimeType:', req.file.mimetype);
          return res.status(500).json({ error: 'Failed to upload image. Make sure blog-images bucket is public.' });
        }

        const { data: { publicUrl } } = supabase.storage
          .from('blog-images')
          .getPublicUrl(filename);

        imagePath = publicUrl;
      } else {
        // Local upload (though the user might need an actual uploads folder)
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

        const filename = Date.now() + '-' + (req.file.originalname || 'image');
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        imagePath = `/uploads/${filename}`;
      }
    }

    const dateStr = formatDate();
    const nowIso = new Date().toISOString();

    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('blogs')
        .insert([
          {
            title,
            excerpt: excerpt || '',
            content,
            author: author || 'Anonymous',
            authorRole: authorRole || '',
            imagePath,
            date: dateStr,
            ownerId: ownerId || null,
            status: status || 'published',
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      console.log('Successfully inserted blog into Supabase with ID:', data.id);
      res.status(201).json(blogRowToJson(data));
    } else {
      const query = `
        INSERT INTO blogs (title, excerpt, content, author, authorRole, imagePath, date, ownerId, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [title, excerpt || '', content, author || 'Anonymous', authorRole || '', imagePath, dateStr, ownerId || null, status || 'published', nowIso, nowIso];

      db.run(query, values, function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to create blog' });
        }
        const newId = this.lastID;
        db.get('SELECT * FROM blogs WHERE id = ?', [newId], (err, row) => {
          if (err || !row) return res.status(500).json({ error: 'Created but failed to retrieve' });
          res.status(201).json(blogRowToJson(row));
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create blog' });
  }
});

// Update an existing blog
app.put('/api/blogs/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, author, authorRole, status } = req.body;
    const requestOwnerId = req.headers['x-owner-id'] || req.body.ownerId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const getExisting = () => {
      if (isUsingSupabase) {
        return supabase.from('blogs').select('*').eq('id', id).single().then(r => r.data);
      } else {
        return new Promise((resolve, reject) => {
          db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      }
    };

    const existing = await getExisting();
    if (!existing) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (existing.ownerId && existing.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    let imagePath = existing.imagePath;
    if (req.file) {
      if (isUsingSupabase) {
        const ext = path.extname(req.file.originalname) || '';
        const base = path.basename(req.file.originalname, ext).replace(/\s+/g, '-');
        const unique = Date.now();
        const filename = `${base}-${unique}${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('blog-images')
          .getPublicUrl(filename);

        imagePath = publicUrl;
      } else {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
        const filename = Date.now() + '-' + (req.file.originalname || 'image');
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        imagePath = `/uploads/${filename}`;
      }
    }

    const nowIso = new Date().toISOString();

    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('blogs')
        .update({
          title,
          excerpt: excerpt || '',
          content,
          author: author || 'Anonymous',
          authorRole: authorRole || '',
          status: status || existing.status,
          imagePath,
          updatedAt: nowIso,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      res.json(blogRowToJson(data));
    } else {
      const query = `
        UPDATE blogs 
        SET title = ?, excerpt = ?, content = ?, author = ?, authorRole = ?, status = ?, imagePath = ?, updatedAt = ?
        WHERE id = ?
      `;
      const values = [title, excerpt || '', content, author || 'Anonymous', authorRole || '', status || existing.status, imagePath, nowIso, id];

      db.run(query, values, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to update blog' });
        }
        db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
          if (err || !row) return res.status(500).json({ error: 'Updated but failed to retrieve' });
          res.json(blogRowToJson(row));
        });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete a blog
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requestOwnerId = req.headers['x-owner-id'];

    const getRow = () => {
      if (isUsingSupabase) {
        return supabase.from('blogs').select('*').eq('id', id).single().then(r => r.data);
      } else {
        return new Promise((resolve, reject) => {
          db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      }
    };

    const row = await getRow();
    if (!row) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    if (row.ownerId && row.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    // Optional: Delete image from storage/disk
    if (row.imagePath) {
      try {
        if (isUsingSupabase) {
          const urlParts = row.imagePath.split('/');
          const filename = urlParts[urlParts.length - 1];
          await supabase.storage.from('blog-images').remove([filename]);
        } else if (row.imagePath.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, row.imagePath);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Failed to delete image:', e);
      }
    }

    if (isUsingSupabase) {
      const { error: deleteError } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } else {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM blogs WHERE id = ?', [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Artikin API running on http://localhost:${PORT}`);
});
