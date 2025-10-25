import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ProductShowcase from './components/ProductShowcase';
import BestSellingLaptops from './components/BestSellingLaptops';
import SSDShowcase from './components/SSDShowcase';
import MiniPCShowcase from './components/MiniPCShowcase';
import PoliciesAndServices from './components/PoliciesAndServices';
import PromotionsAndTips from './components/PromotionsAndTips';
import Footer from './components/Footer';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ProductsList from './components/ProductsList';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import SideBanners from './components/SideBanners';
import AdminLayout from './components/AdminLayout';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminCategories from './pages/AdminCategories';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import CareersPage from './pages/CareersPage';
import InstallmentPage from './pages/InstallmentPage';
import ContactPage from './pages/ContactPage';
import CustomerSupportPage from './pages/CustomerSupportPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import NewsPage from './pages/NewsPage';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function HomePage() {
  return (
    <div className="main-content">
      <HeroBanner />
      <ProductShowcase />
      <BestSellingLaptops />
      <PromotionsAndTips />
      <SSDShowcase />
      <MiniPCShowcase />
      <PoliciesAndServices />
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCareersPage = location.pathname === '/careers';

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {!isCareersPage && <SideBanners />}
      {children}
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="App">
            <Layout>
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
                <Route path="/careers" element={<div className="main-content"><CareersPage /></div>} />
                <Route path="/installment" element={<div className="main-content"><InstallmentPage /></div>} />
                <Route path="/contact" element={<div className="main-content"><ContactPage /></div>} />
                <Route path="/customer-support" element={<div className="main-content"><CustomerSupportPage /></div>} />
                <Route path="/payment-methods" element={<div className="main-content"><PaymentMethodsPage /></div>} />
                <Route path="/news" element={<div className="main-content"><NewsPage /></div>} />
                <Route path="/news/:id" element={<div className="main-content"><NewsPage /></div>} />
                
                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
                <Route path="/admin/products" element={<AdminRoute><AdminLayout><AdminProducts /></AdminLayout></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
                <Route path="/admin/orders" element={<AdminRoute><AdminLayout><AdminOrders /></AdminLayout></AdminRoute>} />
              </Routes>
            </Layout>
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
