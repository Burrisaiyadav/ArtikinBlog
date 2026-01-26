import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBlogs } from '../context/BlogContext';
import './EditBlog.css';

const htmlToPlainText = (html) => {
  if (!html) return '';
  // Very simple HTML to text converter for our stored blog content
  return html
    .replace(/<\/?p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, '\n')
    .trim();
};

const EditBlog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { blogs, updateBlog } = useBlogs();

  const blog = useMemo(
    () => blogs.find((b) => b.id.toString() === id),
    [blogs, id]
  );

  const [formData, setFormData] = useState(() => {
    if (!blog) {
      return {
        title: '',
        image: '',
        author: '',
        authorRole: '',
        excerpt: '',
        content: '',
      };
    }

    return {
      title: blog.title || '',
      image: blog.image || '',
      author: blog.author || '',
      authorRole: blog.authorRole || '',
      excerpt: blog.excerpt || '',
      content: htmlToPlainText(blog.content),
    };
  });

  const [imageFile, setImageFile] = useState(null);

  if (!blog) {
    return (
      <div className="edit-blog-page">
        <div className="container edit-blog-container">
          <h1>Blog not found</h1>
          <p>The blog you are trying to edit does not exist.</p>
          <button className="submit-btn" onClick={() => navigate('/')}>Back to Blogs</button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setImageFile(file || null);
  };

  const handleSubmit = async (e, status) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.content) return;

    // Use specific status if provided, otherwise preserve original (unless publishing)
    const newStatus = status || blog.status || 'published';

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('author', formData.author);
    formDataToSend.append('authorRole', formData.authorRole);
    formDataToSend.append('excerpt', formData.excerpt);
    formDataToSend.append('status', newStatus);
    formDataToSend.append(
      'content',
      formData.content
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join('')
    );

    if (imageFile) {
      formDataToSend.append('image', imageFile);
    }

    await updateBlog(blog.id, formDataToSend);
    navigate(newStatus === 'published' ? '/' : '/admin');
  };

  return (
    <div className="edit-blog-page">
      <header className="editor-header">
        <div className="container header-inner">
            <div className="header-left">
                <button className="back-btn" onClick={() => navigate(-1)} title="Go back">
                    <span className="back-arrow">‹</span>
                </button>
                <div className="header-label">
                    <span className="icon-wrap">✏️</span>
                    <div className="label-text">
                        <h3>Edit Blog</h3>
                        <p>Last edited {blog.date}</p>
                    </div>
                </div>
            </div>
            <div className="header-right">
                <span className="breadcrumbs">Artikin / Blog / <strong>{blog.title}</strong></span>
            </div>
        </div>
      </header>

      <div className="container editor-container">
        <form onSubmit={handleSubmit} className="editor-form">
          <textarea 
            name="title" 
            className="editor-title-input"
            value={formData.title} 
            onChange={handleChange} 
            placeholder="Enter blog title..."
            required 
            rows="2"
          />

          <textarea 
            name="excerpt" 
            className="editor-excerpt-input"
            value={formData.excerpt} 
            onChange={handleChange} 
            placeholder="Add a short description or subtitle..."
            maxLength="200"
            required
            rows="2"
          />

          <div className="form-section">
            <div className={`upload-zone ${imageFile || formData.image ? 'has-file' : ''}`}>
              <input
                type="file"
                id="blog-image"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              <label htmlFor="blog-image" className="upload-label">
                <div className="upload-icon-wrap">
                    <div className="upload-icon">
                        <span className="cloud">☁️</span>
                        <span className="arrow">↑</span>
                    </div>
                </div>
                <div className="upload-text">
                    {imageFile ? imageFile.name : (formData.image ? 'Change cover image' : 'Upload an image')}
                </div>
                {!imageFile && !formData.image && <p className="upload-hint">Drag and drop or click to browse</p>}
              </label>
              {(imageFile || formData.image) && (
                <button type="button" className="clear-image" onClick={() => {setImageFile(null); setFormData({...formData, image: ''})}}>×</button>
              )}
          </div>
          </div>

          <div className="editor-body">
            <textarea 
                name="content" 
                value={formData.content} 
                onChange={handleChange} 
                className="editor-content-area"
                placeholder="Update your blog content..."
                required
            ></textarea>
          </div>

          <div className="form-meta-grid">
            <div className="form-group">
                <label>Author Name</label>
                <input 
                    type="text" 
                    name="author" 
                    value={formData.author} 
                    onChange={handleChange} 
                    placeholder="Your Name"
                    required
                />
            </div>
            <div className="form-group">
                <label>Author Role</label>
                <input 
                    type="text" 
                    name="authorRole" 
                    value={formData.authorRole} 
                    onChange={handleChange} 
                    placeholder="e.g. Market Analyst" 
                />
            </div>
          </div>

          <div className="editor-actions">
              <button type="button" className="secondary-btn" onClick={(e) => handleSubmit(e, 'draft')}>Save as Draft</button>
              <button type="submit" className="submit-btn highlight" onClick={(e) => handleSubmit(e, 'published')}>Publish</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBlog;
