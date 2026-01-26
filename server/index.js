import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// ESM __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.log("------------------------------------------------------------------");
  console.log("WARNING: SUPABASE_URL and SUPABASE_KEY are not set.");
  console.log("The app will run but database operations will fail.");
  console.log("Please set these in your .env file for full functionality.");
  console.log("------------------------------------------------------------------");

  // Provide a dummy client that warns on every call instead of crashing the server
  supabase = {
    from: () => ({
      select: function () { return this; },
      order: function () { return this; },
      eq: function () { return this; },
      single: function () { return Promise.resolve({ data: null, error: { message: 'Supabase credentials missing' } }); },
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase credentials missing' } }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase credentials missing' } }) }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase credentials missing' } }) }),
      // Helper for the get-all chain
      then: (fn) => fn({ data: [], error: { message: 'Supabase credentials missing' } })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Supabase credentials missing' } }),
        getPublicUrl: () => ({ data: { publicUrl: null } })
      })
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
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
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    res.json(data.map(blogRowToJson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get a single blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Blog not found' });

    res.json(blogRowToJson(data));
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filename);

      imagePath = publicUrl;
    }

    const dateStr = formatDate();
    const nowIso = new Date().toISOString();

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

    console.log('Successfully inserted blog with ID:', data.id);
    res.status(201).json(blogRowToJson(data));
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

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const requestOwnerId = req.headers['x-owner-id'] || req.body.ownerId;
    if (existing.ownerId && existing.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    let imagePath = existing.imagePath;
    if (req.file) {
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
    }

    const nowIso = new Date().toISOString();
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update blog' });
  }
});

// Delete a blog
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: row, error: fetchError } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const requestOwnerId = req.headers['x-owner-id'];
    if (row.ownerId && row.ownerId !== requestOwnerId) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this blog' });
    }

    // Optional: Delete image from storage
    if (row.imagePath) {
      try {
        const urlParts = row.imagePath.split('/');
        const filename = urlParts[urlParts.length - 1];
        await supabase.storage.from('blog-images').remove([filename]);
      } catch (e) {
        console.error('Failed to delete image from storage:', e);
      }
    }

    const { error: deleteError } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete blog' });
  }
});

app.listen(PORT, () => {
  console.log(`Artikin API running on http://localhost:${PORT}`);
});
