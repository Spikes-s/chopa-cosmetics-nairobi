import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import LoadingScreen from "@/components/LoadingScreen";
import ScrollToTop from "@/components/ScrollToTop";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import FloatingCartButton from "@/components/FloatingCartButton";
import CartNotification from "@/components/CartNotification";
import TermsAcceptanceModal from "@/components/TermsAcceptanceModal";
import AuthModal from "@/components/AuthModal";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import CookieConsent from "@/components/CookieConsent";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import { usePageVisit } from "@/hooks/usePageVisit";
import { useSiteStatus } from "@/hooks/useSiteStatus";
import { useCart } from "@/context/CartContext";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Categories from "./pages/Categories";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import MyOrders from "./pages/MyOrders";
import OrderSuccess from "./pages/OrderSuccess";
import Wallet from "./pages/Wallet";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const queryClient = new QueryClient();

// Session storage key for first visit
const FIRST_VISIT_KEY = 'chopa-first-visit';

const AppContent = () => {
  const [showLoading, setShowLoading] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const { needsAcceptance, isLoading: termsLoading, markAsAccepted } = useTermsAcceptance();
  const { isBlocked, isLoading: siteStatusLoading } = useSiteStatus();
  const { showCartNotification, hideCartNotification } = useCart();
  const { user } = useAuth();
  // Track page visits
  usePageVisit();

  useEffect(() => {
    // Check if this is the first visit in this session
    const hasVisited = sessionStorage.getItem(FIRST_VISIT_KEY);
    if (!hasVisited) {
      setShowLoading(true);
      setIsFirstVisit(true);
    } else {
      setIsFirstVisit(false);
      // If already visited but not logged in, show auth modal
      if (!user) {
        setShowAuthModal(true);
      }
    }
  }, []);

  const handleLoadingComplete = useCallback(() => {
    sessionStorage.setItem(FIRST_VISIT_KEY, 'true');
    setShowLoading(false);
    setIsFirstVisit(false);
    // Show auth modal after intro animation if not logged in
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  // Close auth modal when user logs in
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
    }
  }, [user]);

  if (showLoading && isFirstVisit) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isTermsPage = location.pathname === '/terms';
  const isAuthPage = location.pathname === '/auth';

  // Show maintenance screen for non-admin users when site is shutdown
  if (isBlocked && !isAdminRoute && !siteStatusLoading) {
    return <MaintenanceScreen />;
  }

  return (
    <div className="min-h-screen mirage-bg">
      <ScrollToTop />
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
          <Route path="/terms" element={<Terms />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <ChatWidget />}
      {!isAdminRoute && <FloatingCartButton />}
      
      {/* Cart notification banner */}
      <CartNotification show={showCartNotification} onClose={hideCartNotification} />
      
      {/* Auth modal - shown after intro animation */}
      {!isAuthPage && !isAdminRoute && (
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      
      {/* Terms acceptance modal */}
      {!termsLoading && !isTermsPage && !isAdminRoute && (
        <TermsAcceptanceModal 
          open={needsAcceptance} 
          onAccepted={markAsAccepted} 
        />
      )}
      
      {/* Cookie consent banner */}
      {!isAdminRoute && <CookieConsent />}
      <PWAInstallPrompt />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
