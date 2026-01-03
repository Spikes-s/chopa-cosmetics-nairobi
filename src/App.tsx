import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Categories from "./pages/Categories";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Session storage key for first visit
const FIRST_VISIT_KEY = 'chopa-first-visit';

const AppContent = () => {
  const [showLoading, setShowLoading] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check if this is the first visit in this session
    const hasVisited = sessionStorage.getItem(FIRST_VISIT_KEY);
    if (!hasVisited) {
      setShowLoading(true);
      setIsFirstVisit(true);
    } else {
      setIsFirstVisit(false);
    }
  }, []);

  const handleLoadingComplete = useCallback(() => {
    sessionStorage.setItem(FIRST_VISIT_KEY, 'true');
    setShowLoading(false);
    setIsFirstVisit(false);
  }, []);

  if (showLoading && isFirstVisit) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen mirage-bg">
      {!isAdminRoute && <Header />}
      <main className={!isAdminRoute ? "pt-20 md:pt-24" : ""}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
