import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ProductCategories from './components/ProductCategories';
import ProductShowcase from './components/ProductShowcase';
import BestSellingLaptops from './components/BestSellingLaptops';
import MiniPCShowcase from './components/MiniPCShowcase';
import PoliciesAndServices from './components/PoliciesAndServices';
import PromotionsAndTips from './components/PromotionsAndTips';
import RecentlyViewed from './components/RecentlyViewed';
import Footer from './components/Footer';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ProductsList from './components/ProductsList';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import QRPaymentPage from './pages/QRPaymentPage';
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
import TestListProducts from './components/TestListProducts';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CategoryProvider } from './context/CategoryContext';
import { ProductsProvider } from './context/ProductsContext';
import './App.css';

function HomePage() {
  return (
    <div className="main-content">
      <HeroBanner />
      <ProductCategories />
      <ProductShowcase />
      <BestSellingLaptops />
      <MiniPCShowcase />
      <PromotionsAndTips />
      <RecentlyViewed />
      <PoliciesAndServices />
    </div>
  );
}

// Component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Scroll immediately first
    window.scrollTo(0, 0);
    // Then smooth scroll after a brief delay to ensure it works
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [pathname]);
  
  return null;
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
      <ScrollToTop />
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
        <CategoryProvider>
          <ProductsProvider>
            <CartProvider>
              <NotificationProvider>
                <div className="App">
                  <Layout>
                    <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<div className="main-content"><ProductsList /></div>} />
                <Route path="/products/:id" element={<div className="main-content"><ProductDetail /></div>} />
                <Route path="/cart" element={<div className="main-content"><CartPage /></div>} />
                <Route path="/checkout" element={<div className="main-content"><CheckoutPage /></div>} />
                <Route path="/qr-payment" element={<div className="main-content"><QRPaymentPage /></div>} />
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
                
                {/* Test Route - Remove in production */}
                <Route path="/test-api" element={<div className="main-content"><TestListProducts /></div>} />
                
                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
                <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
                <Route path="/admin/products" element={<AdminRoute><AdminLayout><AdminProducts /></AdminLayout></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
                <Route path="/admin/orders" element={<AdminRoute><AdminLayout><AdminOrders /></AdminLayout></AdminRoute>} />
                    </Routes>
                  </Layout>
                </div>
              </NotificationProvider>
            </CartProvider>
          </ProductsProvider>
        </CategoryProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
