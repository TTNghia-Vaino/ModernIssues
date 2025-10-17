import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MainBanner from './components/MainBanner';
import ProductCategories from './components/ProductCategories';
import FeaturedProducts from './components/FeaturedProducts';
import PoliciesAndServices from './components/PoliciesAndServices';
import Footer from './components/Footer';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ProductsList from './components/ProductsList';
import ProductDetail from './components/ProductDetail';
import './App.css';

function HomePage() {
  return (
    <>
      <MainBanner />
      <ProductCategories />
      <FeaturedProducts />
      <PoliciesAndServices />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
