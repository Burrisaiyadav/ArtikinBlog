import React from 'react';
import { Link } from 'react-router-dom';
import { useBlogs } from '../context/BlogContext';
import './BlogCard.css';

const BlogCard = ({
  id,
  image,
  title,
  excerpt,
  date,
  category,
  onEdit,
  onDelete,
  ownerId,
  showActions = false, // Default to false for audience view
}) => {
  const { isOwner } = useBlogs();

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) onEdit(id);
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  const canModify = showActions && isOwner(ownerId);

  return (
    <div className="blog-card-wrap">
        <Link to={`/post/${id}`} className={`blog-card ${!image ? 'no-image' : ''}`}>
        {image && (
          <div className="blog-card-image-wrap">
              <img src={image} alt={title} className="blog-card-image" />
          </div>
        )}
        <div className="blog-card-content">
            <div className="blog-card-meta">
                <span className="blog-card-date">{date}</span>
            </div>
            <h3 className="blog-card-title">{title}</h3>
            <p className="blog-card-excerpt">{excerpt}</p>
            <div className="blog-card-footer">
                <span className="learn-more">Learn More <span>→</span></span>
                {canModify && (
                  <div className="blog-card-actions">
                      <button
                          type="button"
                          className="action-btn edit"
                          onClick={handleEditClick}
                          title="Edit"
                      >
                          ✎
                      </button>
                      <button
                          type="button"
                          className="action-btn delete"
                          onClick={handleDeleteClick}
                          title="Delete"
                      >
                          🗑
                      </button>
                  </div>
                )}
            </div>
        </div>
        </Link>
    </div>
  );
};

export default BlogCard;
