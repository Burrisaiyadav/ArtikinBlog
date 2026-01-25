import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BlogProvider, useBlogs } from './context/BlogContext';
import Blogs from './pages/Blogs';
import BlogPost from './pages/BlogPost';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';

import artikinMark from './assets/artikin-mark.svg';
import Navbar from './components/Navbar';
import './App.css';

import Admin from './pages/Admin';

const AppLayout = () => {
  const { loading } = useBlogs();

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-logo-wrap">
          <div className="app-loading-logo-glow" />
          <img src={artikinMark} alt="Artikin" className="app-loading-logo" />
        </div>
        <div className="app-loading-text">
          <span className="app-loading-word">Artikin</span>
          <span className="app-loading-subtitle">Where artists, filmmakers, and creators shape the future.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Blogs />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/post/:id" element={<BlogPost />} />
        <Route path="/create" element={<CreateBlog />} />
        <Route path="/edit/:id" element={<EditBlog />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <BlogProvider>
      <Router>
        <AppLayout />
      </Router>
    </BlogProvider>
  );
}

export default App;
