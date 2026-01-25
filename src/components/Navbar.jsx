import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBlogs } from '../context/BlogContext';
import './Navbar.css';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { isAdmin, authenticate, logout } = useBlogs();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    const handleAdminClick = (e) => {
        e.preventDefault();
        if (isAdmin) {
            navigate('/admin');
            return;
        }

        const key = window.prompt('Enter Admin Key:');
        if (key && authenticate(key)) {
            navigate('/admin');
        } else if (key) {
            alert('Invalid Key!');
        }
    };

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="container navbar-inner">
                <Link to="/" className="navbar-logo">
                
                    <span>Artikin</span>
                </Link>

                <div className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
                    
                    {isAdmin ? (
                        <>
                            <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>Admin</Link>
                            <Link to="/create" className="newsletter-btn">Write Blog</Link>
                            <button onClick={logout} className="logout-btn" style={{ background: '#0173cc', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
                        </>
                    ) : (
                        <>
                            <a href="#" onClick={handleAdminClick}>Admin</a>
                        </>
                    )}
                </div>

                <button 
                    className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
