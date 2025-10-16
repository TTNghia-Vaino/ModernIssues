import React, { useState } from 'react';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="navbar">
      {/* Top Bar */}
      <div className="navbar-top">
        <div className="navbar-container">
          {/* Logo */}
          <div className="navbar-logo">
            <a href="/">
              <img src="/Logo-Dai-Hoc-Quoc-Te-Sai-Gon-SIU.webp" alt="SIU" className="logo-img" />
              <div className="logo-text">
                <span className="logo-main">TechZone</span>   
              </div>
            </a>
          </div>

          {/* Search Bar */}
          <div className="navbar-search">
            <div className="search-container">
              <input 
                type="text" 
                placeholder="Bạn cần tìm gì?" 
                className="search-input"
              />
              <button type="button" className="search-btn" aria-label="Tìm kiếm">
                <i className="fas fa-search" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          {/* User Actions */}
          <div className="navbar-actions">
            <div className="action-btn account-btn">
              <i className="far fa-user" aria-hidden="true"></i>
              <div className="account-text">
                <a href="/login" className="account-label">Tài khoản</a>
                <a href="/login" className="account-action">Đăng nhập</a>
              </div>
            </div>
            <a href="/cart" className="action-btn cart-btn" aria-label="Giỏ hàng">
              <i className="fas fa-shopping-cart" aria-hidden="true"></i>
              <span className="cart-text">Giỏ hàng</span>
              <span className="cart-count">0</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="navbar-bottom">
        <div className="navbar-container">
          <nav className="bottom-nav-links" role="navigation" aria-label="Secondary navigation">
            <a href="/payment" className="bottom-link">THANH TOÁN</a>
            <a href="/installment" className="bottom-link">TRẢ GÓP</a>
            <a href="/contact" className="bottom-link">LIÊN HỆ</a>
            <a href="/customer-care" className="bottom-link">CHĂM SÓC KHÁCH HÀNG</a>
            <a href="/library" className="bottom-link">THƯ VIỆN</a>
            <a href="/recruitment" className="bottom-link">TUYỂN DỤNG</a>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMenu}
        aria-label="Toggle mobile menu"
        aria-expanded={isMenuOpen}
      >
        <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}></span>
        <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}></span>
        <span className={`hamburger ${isMenuOpen ? 'active' : ''}`}></span>
      </button>
    </nav>
  );
};

export default Navbar;
