import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ArrowRight, 
  CheckCircle, 
  Search, 
  Flame, 
  Activity, 
  Layers, 
  TrendingDown, 
  Minus, 
  Info,
  AlertTriangle
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';
import { analyticsAPI } from '../services/api';
import './Pages.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Tooltip, Legend, Filler);

const formatCategory = (cat) => {
  const mapping = {
    'ELECTRONICS': 'Electronics',
    'CLOTHING': 'Clothing',
    'FOOD': 'Food & Beverages',
    'FURNITURE': 'Furniture',
    'TOOLS': 'Tools & Hardware',
    'CHEMICALS': 'Chemicals',
    'OTHER': 'Other'
  };
  return mapping[cat] || cat;
};

export default function Analytics({ user }) {
  const [activeTab, setActiveTab] = useState('optimization'); // 'optimization', 'adie', 'heatmap'
  
  // Data States
  const [predictions, setPredictions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [adieStats, setAdieStats] = useState([]);
  const [heatStats, setHeatStats] = useState([]);
  const [volatilityStats, setVolatilityStats] = useState([]);
  
  // Control States
  const [selectedZone, setSelectedZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, r, adie, heat, vol] = await Promise.all([
          analyticsAPI.getTopDemand(15),
          analyticsAPI.getPendingRecs(),
          analyticsAPI.getAdieStats(),
          analyticsAPI.getHeatStats(),
          analyticsAPI.getVolatilityStats(),
        ]);
        setPredictions(p.data);
        setRecommendations(r.data);
        setAdieStats(adie.data);
        setHeatStats(heat.data);
        setVolatilityStats(vol.data);
        if (heat.data && heat.data.length > 0) {
          // Sort by location code first
          const sortedHeat = [...heat.data].sort((a, b) => a.location_code.localeCompare(b.location_code));
          setHeatStats(sortedHeat);
          setSelectedZone(sortedHeat[0]);
        }
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleApply = async (id) => {
    if (window.confirm('Are you sure you want to apply this storage relocation recommendation?')) {
      try {
        await analyticsAPI.applyRecommendation(id);
        setRecommendations(prev => prev.filter(r => r.id !== id));
      } catch (e) {
        console.error('Failed to apply recommendation:', e);
        alert('Failed to apply recommendation. Check if zone capacity has been exceeded.');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  // ─── Chart Data (Storage Optimization Tab) ─────────────────────────
  const chartData = {
    labels: predictions.map(p => p.item_name?.substring(0, 18) || 'Item'),
    datasets: [{
      label: 'Predicted Demand (30d)',
      data: predictions.map(p => p.predicted_demand),
      backgroundColor: predictions.map(p =>
        p.confidence_score > 0.8 ? 'rgba(99, 102, 241, 0.7)' :
        p.confidence_score > 0.6 ? 'rgba(99, 102, 241, 0.45)' :
        'rgba(99, 102, 241, 0.25)'
      ),
      borderColor: '#6366f1',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const priorityColor = {
    HIGH:   'border-danger',
    MEDIUM: 'border-warning',
    LOW:    'border-info',
  };

  // ─── Demand Intelligence Tab Processing ──────────────────────────
  const combinedStats = adieStats.map(item => {
    const vol = volatilityStats.find(v => v.id === item.id) || {};
    return {
      ...item,
      mean_demand: vol.mean_demand || 0,
      std_dev: vol.std_dev || 0,
      coefficient_of_variation: vol.coefficient_of_variation || 0,
      volatility_class: vol.volatility_class || 'Stable',
    };
  });

  const filteredStats = combinedStats.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ─── Heatmap Style Helpers ────────────────────────────────────────
  const getCellStyles = (score) => {
    // Dynamic HSL scaling from cool blue/cyan to hot orange/red
    const hue = 210 - (score * 2.1); // score = 0 => 210 (blue), score = 100 => 0 (red)
    return {
      backgroundColor: `hsla(${hue}, 90%, 25%, 0.25)`,
      borderColor: `hsla(${hue}, 90%, 50%, 0.6)`,
      boxShadow: `0 4px 16px hsla(${hue}, 90%, 40%, 0.15), inset 0 0 12px hsla(${hue}, 90%, 55%, 0.1)`
    };
  };

  const getHeatBadgeColor = (status) => {
    switch (status) {
      case 'Overcrowded': return 'badge-danger';
      case 'Underutilized': return 'badge-info';
      default: return 'badge-success';
    }
  };

  return (
    <div className="page-container">
      {/* Tab Selector Header */}
      <div className="analytics-tabs">
        <button 
          className={`analytics-tab-btn ${activeTab === 'optimization' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimization')}
        >
          <Layers size={16} />
          Storage Optimization
        </button>
        <button 
          className={`analytics-tab-btn ${activeTab === 'adie' ? 'active' : ''}`}
          onClick={() => setActiveTab('adie')}
        >
          <Activity size={16} />
          Demand Intelligence (ADIE)
        </button>
        <button 
          className={`analytics-tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          <Flame size={16} />
          Spatial Heatmap
        </button>
      </div>

      {/* ─── TAB 1: Storage Optimization ─────────────────────────────── */}
      {activeTab === 'optimization' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Prediction chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-icon-box">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="chart-title">Demand Predictions</h2>
                <p className="chart-subtitle">ML-forecasted demand for the next 30 days</p>
              </div>
            </div>
            <div className="chart-wrapper">
              <Bar data={chartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      afterLabel: (ctx) => {
                        const p = predictions[ctx.dataIndex];
                        return `Confidence: ${(p.confidence_score * 100).toFixed(0)}%`;
                      },
                    },
                  },
                },
                scales: {
                  x: { ticks: { color: '#64748b' }, grid: { color: '#1e2130' } },
                  y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                },
              }} />
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: 'rgba(99, 102, 241, 0.7)' }} /> High confidence (&gt;80%)
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: 'rgba(99, 102, 241, 0.45)' }} /> Medium (60-80%)
              </span>
              <span className="legend-item">
                <span className="legend-color" style={{ backgroundColor: 'rgba(99, 102, 241, 0.25)' }} /> Low (&lt;60%)
              </span>
            </div>
          </div>

          {/* Placement Recommendations */}
          <div className="chart-card">
            <div className="chart-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="chart-icon-box amber">
                  <ArrowRight size={20} />
                </div>
                <div>
                  <h2 className="chart-title">Placement Recommendations</h2>
                  <p className="chart-subtitle">Optimization engine suggestions for item relocation</p>
                </div>
              </div>
              <span className="badge badge-warning" style={{ borderRadius: '16px' }}>
                {recommendations.length} pending
              </span>
            </div>

            <div className="rec-list">
              {recommendations.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={40} className="text-success" style={{ margin: '0 auto 8px auto' }} />
                  <p>All recommendations applied!</p>
                </div>
              ) : (
                recommendations.map((rec, i) => (
                  <div
                    key={rec.id}
                    className={`rec-card ${priorityColor[rec.priority]} animate-fade-in`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="rec-content">
                      <div className="rec-header">
                        <span className="rec-title">{rec.item_name}</span>
                        <span className={`badge ${
                          rec.priority === 'HIGH' ? 'badge-danger' :
                          rec.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'
                        }`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                          {rec.priority}
                        </span>
                      </div>
                      <div className="rec-route">
                        {rec.current_zone_name || 'Unassigned'}
                        <ArrowRight size={12} style={{ margin: '0 6px' }} />
                        <span className="text-success text-bold">{rec.recommended_zone_name}</span>
                      </div>
                      <p className="rec-reason">{rec.reason}</p>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px', height: 'fit-content' }}
                        onClick={() => handleApply(rec.id)}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Demand Intelligence (ADIE) ───────────────────────── */}
      {activeTab === 'adie' && (
        <div className="table-card" style={{ padding: '24px' }}>
          <div className="chart-header" style={{ marginBottom: '16px' }}>
            <div className="chart-icon-box">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="chart-title">Adaptive Demand Intelligence Engine (ADIE)</h2>
              <p className="chart-subtitle">Real-time demand trends, adaptive scoring, and stability analysis</p>
            </div>
          </div>

          <div className="table-controls">
            <div className="search-wrapper">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search by SKU or name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '280px' }}
              />
            </div>
            <select 
              className="form-select" 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '180px', padding: '8px 12px' }}
            >
              <option value="">All Categories</option>
              <option value="ELECTRONICS">Electronics</option>
              <option value="CLOTHING">Clothing</option>
              <option value="FOOD">Food & Beverages</option>
              <option value="FURNITURE">Furniture</option>
              <option value="TOOLS">Tools & Hardware</option>
              <option value="CHEMICALS">Chemicals</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU / Name</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Weekly Growth</th>
                  <th style={{ textAlign: 'center' }}>Trend</th>
                  <th style={{ textAlign: 'center' }}>Daily Mean</th>
                  <th style={{ textAlign: 'center' }}>Volatility (CV)</th>
                  <th style={{ textAlign: 'center' }}>Demand Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }} className="text-muted">
                      No matching items found.
                    </td>
                  </tr>
                ) : (
                  filteredStats.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="text-bold">{item.sku}</div>
                        <div className="text-muted text-xs">{item.name}</div>
                      </td>
                      <td>{formatCategory(item.category)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`growth-indicator ${
                          item.growth_rate > 10 ? 'growth-up' :
                          item.growth_rate < -10 ? 'growth-down' : 'growth-neutral'
                        }`} style={{ justifyContent: 'center' }}>
                          {item.growth_rate > 10 ? <TrendingUp size={14} /> :
                           item.growth_rate < -10 ? <TrendingDown size={14} /> : <Minus size={14} />}
                          {item.growth_rate > 0 ? '+' : ''}{item.growth_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          item.trend === 'Rising' ? 'badge-danger' :
                          item.trend === 'Falling' ? 'badge-info' : 'badge-neutral'
                        }`}>
                          {item.trend}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                        {item.mean_demand}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${
                          item.volatility_class === 'Volatile' ? 'badge-danger' :
                          item.volatility_class === 'Moderate' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {item.volatility_class} ({item.coefficient_of_variation})
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          className="demand-score-badge"
                          style={{
                            backgroundColor: 
                              item.demand_score >= 70 ? 'rgba(239, 68, 68, 0.15)' :
                              item.demand_score >= 40 ? 'rgba(245, 158, 11, 0.15)' :
                              'rgba(16, 185, 129, 0.15)',
                            color: 
                              item.demand_score >= 70 ? '#f87171' :
                              item.demand_score >= 40 ? '#fbbf24' :
                              '#34d399',
                          }}
                        >
                          {item.demand_score}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Spatial Heatmap ──────────────────────────────────── */}
      {activeTab === 'heatmap' && (
        <div className="heatmap-container">
          <div className="heatmap-panel">
            <div className="chart-header" style={{ marginBottom: '8px' }}>
              <div className="chart-icon-box">
                <Flame size={20} />
              </div>
              <div>
                <h2 className="chart-title">Warehouse Floor Traffic & Congestion Heatmap</h2>
                <p className="chart-subtitle">Spatial tracking of item access frequencies and density overload (Last 30 Days)</p>
              </div>
            </div>

            <div className="heatmap-layout-grid">
              {heatStats.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className={`heatmap-cell ${isSelected ? 'selected' : ''}`}
                    style={getCellStyles(zone.heat_score)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span className="heatmap-cell-title">{zone.location_code}</span>
                      <span className={`badge ${getHeatBadgeColor(zone.congestion_status)}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                        {zone.congestion_status}
                      </span>
                    </div>
                    <div className="heatmap-cell-subtitle">{zone.name.split(' ').slice(0,2).join(' ')}</div>
                    <div className="heatmap-cell-value">
                      {zone.heat_score}% <span style={{ fontSize: '10px', fontWeight: '500', opacity: 0.8 }}>heat</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="heatmap-detail-card">
            {selectedZone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={20} className="text-primary-color" />
                    Zone Details: {selectedZone.location_code}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{selectedZone.name}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span className="text-muted text-xs uppercase text-bold">Zone Type</span>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', marginTop: '2px' }}>
                      {formatCategory(selectedZone.zone_type)}
                    </p>
                  </div>

                  <div>
                    <span className="text-muted text-xs uppercase text-bold">Capacity Load</span>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', marginTop: '2px' }}>
                      {selectedZone.current_occupancy} / {selectedZone.capacity} units ({selectedZone.utilization_percentage}% utilized)
                    </p>
                    <div className="volume-track" style={{ marginTop: '6px' }}>
                      <div 
                        className="volume-fill" 
                        style={{ 
                          width: `${Math.min(selectedZone.utilization_percentage, 100)}%`,
                          backgroundColor: selectedZone.utilization_percentage >= 80 ? '#f87171' : '#6366f1'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-muted text-xs uppercase text-bold">Access Frequency (30 Days)</span>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: 'white', marginTop: '2px' }}>
                      {selectedZone.access_count} operations
                    </p>
                  </div>

                  <div>
                    <span className="text-muted text-xs uppercase text-bold">Heat Intelligence Score</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                      <p style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                        {selectedZone.heat_score}%
                      </p>
                      <span className={`badge ${
                        selectedZone.heat_score >= 70 ? 'badge-danger' :
                        selectedZone.heat_score >= 30 ? 'badge-warning' : 'badge-info'
                      }`}>
                        {selectedZone.heat_score >= 70 ? 'High Traffic' :
                         selectedZone.heat_score >= 30 ? 'Moderate Traffic' : 'Low Traffic'}
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: '8px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start'
                  }}>
                    <Info size={16} className="text-primary-color" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                      {selectedZone.congestion_status === 'Overcrowded' && (
                        <span className="text-danger text-bold">Warning: Overcrowded sector. High traffic combined with high stock occupancy may cause handling bottlenecks. Relocation is highly recommended.</span>
                      )}
                      {selectedZone.congestion_status === 'Underutilized' && (
                        <span className="text-success text-bold">Insight: Underutilized sector. Low traffic and low stock capacity. Ideal buffer zone for incoming inventory.</span>
                      )}
                      {selectedZone.congestion_status === 'Normal' && (
                        <span>Sector performing within expected density parameters. Traffic is balanced relative to storage utilization.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a zone from the heatmap to view metrics.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

