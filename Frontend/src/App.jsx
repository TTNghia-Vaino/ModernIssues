import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ProductCategories from './components/ProductCategories';
import PoliciesAndServices from './components/PoliciesAndServices';
import Footer from './components/Footer';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ProductsList from './components/ProductsList';
import ProductDetail from './components/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SideBanners from './components/SideBanners';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function HomePage() {
  return (
    <div className="main-content">
      <HeroBanner />
      <ProductCategories />
      <PoliciesAndServices />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="App">
            <Navbar />
            <SideBanners />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<div className="main-content"><ProductsList /></div>} />
              <Route path="/products/:id" element={<div className="main-content"><ProductDetail /></div>} />
              <Route path="/cart" element={<div className="main-content"><CartPage /></div>} />
              <Route path="/checkout" element={<div className="main-content"><CheckoutPage /></div>} />
              <Route path="/order-confirmation" element={<div className="main-content"><OrderConfirmationPage /></div>} />
              <Route path="/login" element={<div className="main-content"><LoginForm /></div>} />
              <Route path="/register" element={<div className="main-content"><RegisterForm /></div>} />
              <Route path="/forgot-password" element={<div className="main-content"><ForgotPasswordForm /></div>} />
            </Routes>
            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
