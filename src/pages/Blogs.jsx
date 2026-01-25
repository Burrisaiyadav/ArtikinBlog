import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BlogCard from '../components/BlogCard';
import { useBlogs } from '../context/BlogContext';
import './Blogs.css';

const Blogs = () => {
  const { blogs, loading, error, isAdmin } = useBlogs();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All Articles');
  const navigate = useNavigate();

  const filteredBlogs = blogs.filter(blog => {
    return blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="blogs-page">
      <div className="hero-section">
        <div className="container">
          <div className="hero-content">
            <span className="hero-tag">📰 Blog</span>
            <h1 className="hero-title">Where Art Meets Opportunity</h1>
            <p className="hero-description">
              Deep stories, powerful insights, and real journeys that transform creativity into meaningful opportunities for artists and creators.
            </p>
          </div>
        </div>
        <div className="hero-bg-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="error-state">
            {error}
          </div>
        )}

        <div className="search-filter-section">
          <div className="search-bar-wrap">
            <i className="search-icon">🔍</i>
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

         <div className="section-header">
            <h2 className="section-title">All Articles</h2>
            <p className="section-subtitle">Explore stories, insights, and updates from Artikin that highlight artist journeys, creative ideas, and real opportunities shaping the future of the creative community.</p>
         </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading blogs...</p>
          </div>
        ) : (
          <div className="blogs-grid">
            {filteredBlogs.map((blog) => (
              <BlogCard
                key={blog.id}
                {...blog}
                commentCount={blog.commentCount ?? blog.comments?.length ?? 0}
                showActions={false}
              />
            ))}
            {filteredBlogs.length === 0 && (
              <div className="empty-state">
                <h2>No blog posts found</h2>
                <p>Try adjusting your search or category filter.</p>
                <Link to="/create" className="create-btn secondary">
                  Create a Blog
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blogs;
