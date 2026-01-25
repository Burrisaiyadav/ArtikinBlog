import React, { createContext, useState, useContext, useEffect } from 'react';

const BlogContext = createContext();

export const useBlogs = () => useContext(BlogContext);

// Base URL for the backend API. For production (e.g. Vercel) you can
// override this with VITE_API_BASE_URL, for example:
//   https://your-backend-domain.com/api
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://artikinblog.onrender.com/api';

// Strip trailing /api to get the root used for serving images
const API_ROOT = API_BASE.replace(/\/api\/?$/, '');

export const resolveImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  if (image.startsWith('/')) return `${API_ROOT}${image}`;
  return `${API_ROOT}/${image}`;
};

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [ownerId] = useState(() => {
    let id = localStorage.getItem('artikin_owner_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('artikin_owner_id', id);
    }
    return id;
  });

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/blogs`);
      if (!res.ok) {
        throw new Error('Failed to fetch blogs');
      }
      const data = await res.json();
      setBlogs(data.map((blog) => ({ ...blog, image: resolveImageUrl(blog.image) })));
    } catch (error) {
      console.error('Failed to load blogs', error);
      setError('Cannot reach the Artikin blog server. Please make sure the backend is running.');
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const addBlog = async (formData) => {
    formData.append('ownerId', ownerId);
    const res = await fetch(`${API_BASE}/blogs`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error('Failed to create blog');
    }
    const created = await res.json();
    const withImage = { ...created, image: resolveImageUrl(created.image) };
    setBlogs((prevBlogs) => [withImage, ...prevBlogs]);
  };

  const updateBlog = async (blogId, formData) => {
    const res = await fetch(`${API_BASE}/blogs/${blogId}`, {
      method: 'PUT',
      headers: { 'x-owner-id': ownerId },
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update blog');
    }
    const updated = await res.json();
    const withImage = { ...updated, image: resolveImageUrl(updated.image) };
    setBlogs((prevBlogs) =>
      prevBlogs.map((blog) => (blog.id === withImage.id ? withImage : blog))
    );
  };

  const deleteBlog = async (blogId) => {
    const res = await fetch(`${API_BASE}/blogs/${blogId}`, { 
      method: 'DELETE',
      headers: { 'x-owner-id': ownerId }
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete blog');
    }
    setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog.id !== blogId));
  };

  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('artikin_is_admin') === 'true';
  });

  const authenticate = (key) => {
    // Hardcoded key for simple demonstration/requirement
    const isValid = key === 'ARTIKIN_ADMIN'; 
    if (isValid) {
      setIsAdmin(true);
      localStorage.setItem('artikin_is_admin', 'true');
    }
    return isValid;
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem('artikin_is_admin');
  };

  const isOwner = (blogOwnerId) => {
      // If the blog has no ownerId (legacy blog), allow anyone with admin access to edit/delete 
      if (!blogOwnerId) return true;
      return blogOwnerId === ownerId;
  };

  const value = {
    blogs,
    loading,
    error,
    addBlog,
    updateBlog,
    deleteBlog,
    ownerId,
    isOwner,
    isAdmin,
    authenticate,
    logout
  };

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};
