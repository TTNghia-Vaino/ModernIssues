import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Navbar.css';
import ProductMenu from './ProductMenu';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const userMenuRef = useRef(null);
  const { totalCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { products } = useProducts(); // Use products from context instead of local state
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Listen for storage changes (when products are updated in admin)
  useEffect(() => {
    const handleStorageChange = () => {
      // Products are now managed by context, but we can refresh if needed
      // The context will handle refreshing automatically
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Compute suggestions based on the current query
  const suggestions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed || !products.length) return [];
    return products
      .filter(p =>
        p.name.toLowerCase().includes(trimmed) ||
        (p.brand && p.brand.toLowerCase().includes(trimmed)) ||
        p.category.toLowerCase().includes(trimmed)
      )
      .slice(0, 8);
  }, [query, products]);

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  const onChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowSuggestions(Boolean(v.trim()));
  };

  const goToSearch = (value) => {
    const q = (value ?? query).trim();
    if (!q) return;
    navigate(`/products?q=${encodeURIComponent(q)}`);
    setShowSuggestions(false);
    setHighlightIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  const onKeyDown = (e) => {
    const hasList = showSuggestions && suggestions.length > 0;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hasList && highlightIndex >= 0) {
        const item = suggestions[highlightIndex];
        navigate(`/products/${item.id}`);
      } else {
        goToSearch();
      }
      setShowSuggestions(false);
      setHighlightIndex(-1);
      return;
    }
    if (!hasList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.username) return user.username;
    if (user?.email) return user.email.split('@')[0];
    return 'Người dùng';
  };

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
          <div className="navbar-search" ref={containerRef}>
            <form className="search-container" onSubmit={(e)=>{e.preventDefault(); goToSearch();}} role="search" aria-label="Tìm kiếm sản phẩm">
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Bạn cần tìm gì?" 
                className="search-input"
                value={query}
                onChange={onChange}
                onKeyDown={onKeyDown}
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="search-suggestions-list"
              />
              <button type="submit" className="search-btn" aria-label="Tìm kiếm">
                <i className="fas fa-search" aria-hidden="true"></i>
              </button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <ul id="search-suggestions-list" className="search-suggestions" role="listbox">
                {suggestions.map((p, idx) => (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={idx === highlightIndex}
                    className={`suggestion-item ${idx === highlightIndex ? 'active' : ''}`}
                    onMouseDown={(e)=>{ e.preventDefault(); }}
                    onClick={()=>{ 
                      window.scrollTo(0, 0);
                      document.documentElement.scrollTop = 0;
                      document.body.scrollTop = 0;
                      navigate(`/products/${p.id}`); 
                      setShowSuggestions(false);
                    } }
                  >
                    <span className="suggestion-name">{p.name}</span>
                    <span className="suggestion-meta">{p.brand ? `${p.brand} · ` : ''}{p.category}</span>
                  </li>
                ))}
                <li className="suggestion-footer" onMouseDown={(e)=>e.preventDefault()} onClick={()=>goToSearch()}>
                  Tìm "{query}" trong tất cả sản phẩm
                </li>
              </ul>
            )}
          </div>

          {/* User Actions */}
          <div className="navbar-actions">
            {isAuthenticated ? (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button 
                  className="action-btn account-btn user-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="Tài khoản"
                  aria-expanded={showUserMenu}
                >
                  <i className="far fa-user" aria-hidden="true"></i>
                  <div className="account-text">
                    <span className="account-label">{getUserDisplayName()}</span>
                    <span className="account-action">Tài khoản</span>
                  </div>
                  <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'}`} style={{ fontSize: '10px', marginLeft: '4px' }}></i>
                </button>
                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-avatar">
                        <i className="far fa-user" aria-hidden="true"></i>
                      </div>
                      <div className="user-info">
                        <div className="user-name">{getUserDisplayName()}</div>
                        <div className="user-email">{user?.email || ''}</div>
                      </div>
                    </div>
                    <div className="user-dropdown-divider"></div>
                    <div className="user-dropdown-menu">
                      <a href="/profile" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                        <i className="fas fa-user-circle" aria-hidden="true"></i>
                        <span>Thông tin tài khoản</span>
                      </a>
                      <a href="/orders" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                        <i className="fas fa-shopping-bag" aria-hidden="true"></i>
                        <span>Đơn hàng của tôi</span>
                      </a>
                      <div className="user-dropdown-divider"></div>
                      <button className="user-menu-item logout-btn" onClick={handleLogout}>
                        <span>Đăng xuất</span>
                        <i className="fas fa-arrow-right" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a href="/login" className="action-btn account-btn">
                <i className="far fa-user" aria-hidden="true"></i>
                <div className="account-text">
                  <span className="account-label">Tài khoản</span>
                  <span className="account-action">Đăng nhập</span>
                </div>
              </a>
            )}
            <a href="/cart" className="action-btn cart-btn" aria-label="Giỏ hàng">
              <i className="fas fa-shopping-cart" aria-hidden="true"></i>
              <span className="cart-text">Giỏ hàng</span>
              <span className="cart-count">{totalCount}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="navbar-bottom">
        <div className="navbar-container bottom-bar">
          <div className="bottom-left">
            <ProductMenu />
          </div>
          <nav className="bottom-nav-links" role="navigation" aria-label="Secondary navigation">
            <a href="/payment-methods" className="bottom-link">THANH TOÁN</a>
            <a href="/installment" className="bottom-link">TRẢ GÓP</a>
            <a href="/contact" className="bottom-link">LIÊN HỆ</a>
            <a href="/customer-support" className="bottom-link">CHĂM SÓC KHÁCH HÀNG</a>
            <a href="/news" className="bottom-link">TIN TỨC</a>
            <a href="/careers" className="bottom-link">TUYỂN DỤNG</a>
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
