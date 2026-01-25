import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE, resolveImageUrl, useBlogs } from '../context/BlogContext';
import './BlogPost.css';

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner, isAdmin } = useBlogs();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/blogs/${id}`);
        if (!res.ok) {
          setBlog(null);
        } else {
          const data = await res.json();
          setBlog({ ...data, image: resolveImageUrl(data.image) });
        }
      } catch (error) {
        console.error('Failed to load blog', error);
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id]);

  const handleEdit = () => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this blog post? This cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/blogs/${id}`, {
        method: 'DELETE',
        headers: { 'x-owner-id': localStorage.getItem('artikin_owner_id') }
      });
      if (!res.ok) {
        throw new Error('Failed to delete');
      }
      navigate('/');
    } catch (error) {
      console.error('Failed to delete blog', error);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = blog.title;
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  if (loading) {
    return <div className="container" style={{ padding: '50px' }}>Loading...</div>;
  }

  if (!blog) {
    return <div className="container" style={{ padding: '50px' }}>Blog post not found.</div>;
  }

  const canModify = isOwner(blog.ownerId);

  return (
    <div className="blog-post-page">
      <div className="container blog-post-container">
        <div className="post-navigation">
          <Link to="/" className="back-link">
            <span className="back-icon">←</span> All posts
          </Link>
          {isAdmin && canModify && (
            <div className="post-actions">
              <button type="button" className="action-btn" onClick={handleEdit} title="Edit">✎</button>
              <button type="button" className="action-btn delete" onClick={handleDelete} title="Delete">🗑</button>
            </div>
          )}
        </div>

        <header className="post-header">
          <h1 className="post-title">{blog.title} —</h1>
          <div className="post-meta">
            <span className="post-author">{blog.author || 'Artikin Author'}</span>
            <span className="post-date">• Posted on {blog.date}</span>
          </div>
          <p className="post-intro">
            {blog.excerpt}
          </p>
        </header>

        {blog.image && (
          <div className="post-image-wrap">
             <img src={blog.image} alt={blog.title} className="post-main-image" />
          </div>
        )}

        <div className="post-body">
            <div className="post-content" dangerouslySetInnerHTML={{ __html: blog.content }} />
            
            <div className="social-sharing">
                <span className="share-label">Share on Social Media</span>
                <div className="social-links">
                    <button className="social-btn" onClick={() => handleShare('facebook')}>f</button>
                    <button className="social-btn" onClick={() => handleShare('twitter')}>𝕏</button>
                    <button className="social-btn" onClick={() => handleShare('linkedin')}>in</button>
                </div>
            </div>
        </div>

        <div className="post-footer">
          <div className="author-card">
            <div className="author-image"></div>
            <div className="author-info">
              <h4 className="author-name">{blog.author || 'Artikin Author'}</h4>
              <p className="author-bio">
                Expert insights and professional perspectives from the Artikin community. Sharing creative knowledge to help you build and scale your artistic career.
              </p>
              <Link to="/" className="check-all-posts">Check all posts</Link>
            </div>
          </div>
        </div>
      </div>
      <footer className="minimal-footer">
        <div className="footer-links">
            <a href="https://www.instagram.com/artikinofficial?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer">Instagram</a> • <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">Youtube</a> • <a href="https://www.facebook.com/share/1AXJxcCiA4/">Facebook</a>
        </div>
        <p className="copyright">© 2026 Artikin Blog — All rights reserved.</p>
        <button className="scroll-top" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>↑</button>
      </footer>
    </div>
  );
};

export default BlogPost;
