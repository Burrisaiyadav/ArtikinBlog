import React from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import BlogCard from '../components/BlogCard';
import { useBlogs } from '../context/BlogContext';
import './Admin.css';

const Admin = () => {
  const { blogs, loading, error, deleteBlog, isAdmin, ownerId, isOwner } = useBlogs();
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleEdit = (id) => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this blog post? This cannot be undone.')) {
      deleteBlog(id);
    }
  };

  const myBlogs = blogs.filter(blog => isOwner(blog.ownerId));
  
  const filteredBlogs = myBlogs.filter(blog => {
    return blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="admin-page">
      <div className="admin-hero">
        <div className="container">
          <div className="admin-hero-content">
            <span className="admin-tag">⚡ Admin Console</span>
            <h1 className="admin-title">Manage Your Posts</h1>
            <p className="admin-description">
              Welcome back! Here you can create, edit, and manage your articles. Only you can see and modify these posts.
            </p>
            <Link to="/create" className="create-now-btn">Create New Post +</Link>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error-state">
            {error}
          </div>
        )}

        <div className="admin-filter-section">
          <div className="search-bar-wrap">
            <i className="search-icon">🔍</i>
            <input 
              type="text" 
              placeholder="Search your articles..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="section-header">
           <h2 className="section-title">Your Content ({myBlogs.length})</h2>
           <p className="section-subtitle">Below are the blogs you've authored. Use the actions on each card to edit or remove content.</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading your blogs...</p>
          </div>
        ) : (
          <div className="blogs-grid">
            {filteredBlogs.map((blog) => (
              <BlogCard
                key={blog.id}
                {...blog}
                showActions={true} // Explicitly show actions in admin console
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            {filteredBlogs.length === 0 && (
              <div className="empty-state">
                <h2>No blogs found</h2>
                <p>{myBlogs.length === 0 ? "You haven't written any blogs yet." : "No results match your search."}</p>
                <Link to="/create" className="create-btn secondary">
                  Create Your First Blog
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
