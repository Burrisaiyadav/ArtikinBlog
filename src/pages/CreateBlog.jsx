import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlogs } from '../context/BlogContext';
import './CreateBlog.css';

const CreateBlog = () => {
  const { addBlog } = useBlogs();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    authorRole: '',
    excerpt: '',
    content: ''
  });
  const [imageFile, setImageFile] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setImageFile(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('author', formData.author);
    formDataToSend.append('authorRole', formData.authorRole);
    formDataToSend.append('excerpt', formData.excerpt);
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

    await addBlog(formDataToSend);
    navigate('/');
  };

  return (
    <div className="create-blog-page">
      <header className="editor-header">
        <div className="container header-inner">
            <div className="header-left">
                <button className="back-btn" onClick={() => navigate(-1)} title="Go back">
                    <span className="back-arrow">‹</span>
                </button>
                <div className="header-label">
                    <span className="icon-wrap">📝</span>
                    <div className="label-text">
                        <h3>Create Blog</h3>
                        <p>Drafting new post</p>
                    </div>
                </div>
            </div>
            <div className="header-right">
                <span className="breadcrumbs">Artikin / <strong>New Post</strong></span>
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
            <div className={`upload-zone ${imageFile ? 'has-file' : ''}`}>
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
                    {imageFile ? imageFile.name : 'Upload an image'}
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
                placeholder="Start writing your blog content..."
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
              <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>Save as Draft</button>
              <button type="submit" className="submit-btn highlight">Publish Blog</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBlog;
