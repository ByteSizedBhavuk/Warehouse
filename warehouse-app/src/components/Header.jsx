import { NavLink } from 'react-router-dom';
import { Package, Search, User, LogOut } from 'lucide-react';

const navItems = [
  { to: '/',           label: 'DASHBOARD' },
  { to: '/inventory',  label: 'INVENTORY' },
  { to: '/orders',     label: 'SHIPMENTS' },
  { to: '/analytics',  label: 'ANALYTICS' },
  { to: '/zones',      label: 'ZONES' },
];

export default function Header({ user, onLogout }) {
  return (
    <header className="nav-header">
      
      {/* Brand / Logo */}
      <div className="nav-brand">
        <div className="brand-icon">
          <Package size={20} />
        </div>
        <div className="brand-text">
          <span>INVENTORY</span>
          <span>HUB</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {label}
            <span className="active-line" />
          </NavLink>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="nav-actions">
        <div className="search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="SEARCH SYSTEM..."
            className="search-input"
          />
        </div>

        <div className="user-profile">
          <div className="user-info">
            <p className="name">{user?.username}</p>
            <p className="role">{user?.clearance}</p>
          </div>
          <div className="user-avatar" style={{ marginRight: '4px' }}>
            <User size={18} />
          </div>
          <button
            onClick={onLogout}
            className="action-btn text-danger"
            title="Sign Out"
            style={{ padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

    </header>
  );
}
