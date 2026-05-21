import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import './App.css'; 

import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Zones from './pages/Zones';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import LoadingSpinner from './components/LoadingSpinner';
import { authAPI } from './services/api';

function Footer() {
  return (
    <footer className="app-footer">
      <p className="footer-brand">
        LUCID ATELIER V2.4.1 // INDUSTRIAL INTELLIGENCE SYSTEMS
      </p>
      <div className="footer-actions">
        <p className="sync-status">
          <span className="sync-dot"></span>
          SYNC: 12MS // CLUSTER ALPHA-9
        </p>
        <button className="add-stock-btn">
          Add Stock
        </button>
      </div>
    </footer>
  );
}

function Layout({ children, user, onLogout }) {
  return (
    <div className="app-container">
      <Header user={user} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await authAPI.me();
        setUser(response.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#030a16' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={handleLogout}><Dashboard user={user} /></Layout>} />
        <Route path="/inventory" element={<Layout user={user} onLogout={handleLogout}><Inventory user={user} /></Layout>} />
        <Route path="/orders" element={<Layout user={user} onLogout={handleLogout}><Orders user={user} /></Layout>} />
        <Route path="/zones" element={<Layout user={user} onLogout={handleLogout}><Zones user={user} /></Layout>} />
        <Route path="/analytics" element={<Layout user={user} onLogout={handleLogout}><Analytics user={user} /></Layout>} />
      </Routes>
    </Router>
  );
}
