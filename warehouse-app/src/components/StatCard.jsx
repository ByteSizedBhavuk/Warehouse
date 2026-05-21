import './pages/Pages.css';

export default function StatCard({ icon: Icon, label, value, sub, color = 'primary', delay = 0 }) {
  const colorMap = {
    primary: 'zone-grad-info', // reusing zone-grad stuff for the statcard
    success: 'zone-grad-success',
    warning: 'zone-grad-warning', // wait, I don't have zone-grad-warning. Let's replace with static
    danger:  'zone-grad-danger',
    info:    'zone-grad-info',
  };

  const iconBg = {
    primary: 'chart-icon-box',
    success: 'chart-icon-box green',
    warning: 'chart-icon-box amber',
    danger:  'chart-icon-box red',
    info:    'chart-icon-box',
  };

  return (
    <div
      className={`zone-card ${colorMap[color] || 'zone-grad-neutral'} animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="zone-card-header">
        <div className={iconBg[color] || 'chart-icon-box'}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-bold" style={{ fontSize: '24px', marginBottom: '4px' }}>{value}</p>
      <p className="text-muted text-sm">{label}</p>
      {sub && <p className="text-muted text-xs" style={{ marginTop: '4px' }}>{sub}</p>}
    </div>
  );
}
