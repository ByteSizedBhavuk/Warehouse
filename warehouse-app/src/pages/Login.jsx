import { useState } from 'react';
import { Lock, User, LogIn, Terminal, ShieldAlert } from 'lucide-react';
import { authAPI } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(username, password);
      onLoginSuccess(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid credentials or connection issue');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType) => {
    setUsername(userType);
    setPassword(`${userType}123`);
  };

  return (
    <div className="login-wrapper">
      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #0d1e3d 0%, #030a16 100%);
          padding: 24px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .login-container {
          width: 100%;
          max-width: 440px;
          background: rgba(13, 27, 49, 0.4);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: loginFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #e65100 0%, #ff9800 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
          box-shadow: 0 8px 24px rgba(230, 81, 0, 0.3);
          color: white;
        }

        .login-title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }

        .login-subtitle {
          font-size: 13px;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #64748b;
          transition: color 0.2s;
        }

        .input-field {
          width: 100%;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 16px 14px 48px;
          font-size: 14px;
          color: #ffffff;
          transition: all 0.2s;
        }

        .input-field::placeholder {
          color: #475569;
        }

        .input-field:focus {
          outline: none;
          border-color: #e65100;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 4px rgba(230, 81, 0, 0.15);
        }

        .input-field-wrapper:focus-within .input-icon {
          color: #e65100;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f87171;
          font-size: 13px;
        }

        .login-btn {
          background: linear-gradient(135deg, #e65100 0%, #ef6c00 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(230, 81, 0, 0.2);
        }

        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(230, 81, 0, 0.35);
        }

        .login-btn:active {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .quick-login-section {
          margin-top: 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
        }

        .quick-login-title {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
          margin-bottom: 12px;
        }

        .quick-login-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .quick-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          border-radius: 8px;
          padding: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .quick-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .quick-btn.active {
          background: rgba(230, 81, 0, 0.1);
          border-color: rgba(230, 81, 0, 0.3);
          color: #ff9800;
        }
      `}</style>

      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={24} />
          </div>
          <h1 className="login-title">OPTIMA</h1>
          <p className="login-subtitle">WAREHOUSE MANAGEMENT SYSTEM</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Operator Username</label>
            <div className="input-field-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Security Access Password</label>
            <div className="input-field-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                className="input-field"
                placeholder="Enter security key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <Terminal size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Access System</span>
                <LogIn size={16} />
              </>
            )}
          </button>
        </form>

        <div className="quick-login-section">
          <p className="quick-login-title">Quick Access Clearances</p>
          <div className="quick-login-buttons">
            <button
              type="button"
              className={`quick-btn ${username === 'admin' ? 'active' : ''}`}
              onClick={() => handleQuickLogin('admin')}
            >
              ADMIN
            </button>
            <button
              type="button"
              className={`quick-btn ${username === 'manager' ? 'active' : ''}`}
              onClick={() => handleQuickLogin('manager')}
            >
              MANAGER
            </button>
            <button
              type="button"
              className={`quick-btn ${username === 'staff' ? 'active' : ''}`}
              onClick={() => handleQuickLogin('staff')}
            >
              STAFF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
