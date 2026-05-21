import { useEffect, useState } from 'react';
import { PackageOpen, AlertCircle, BarChart as BarChartIcon } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';
import { inventoryAPI, ordersAPI } from '../services/api';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [zoneSummary, setZoneSummary] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [trends, setTrends] = useState([]);
  const [selectedZone, setSelectedZone] = useState('C-3');
  const [selectedZoneData, setSelectedZoneData] = useState(null);
  const [loading, setLoading] = useState(true);

  const gridCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 1; c <= 6; c++) {
      gridCells.push(`${String.fromCharCode(65 + r)}-${c}`);
    }
  }

  const getDensityClass = (id) => {
    const dbCode = id.replace('-', '');
    const zone = zones.find(z => z.location_code === dbCode);
    if (!zone) return 'empty';
    const pct = zone.utilization_percentage;
    if (pct >= 80) return 'high';
    if (pct >= 30) return 'mid';
    return 'empty';
  };

  const handleZoneClick = (id) => {
    setSelectedZone(id);
    const dbCode = id.replace('-', '');
    const zone = zones.find(z => z.location_code === dbCode);
    setSelectedZoneData(zone || null);
  };

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, summaryRes, orderStatsRes, zonesRes, trendRes] = await Promise.all([
          inventoryAPI.getDashboardStats(),
          inventoryAPI.getZoneSummary(),
          ordersAPI.getStats(),
          inventoryAPI.getZones({ page_size: 100 }),
          ordersAPI.getTrend(30),
        ]);
        
        setStats(statsRes.data);
        setZoneSummary(summaryRes.data);
        setOrderStats(orderStatsRes.data);
        
        const zonesList = zonesRes.data.results || zonesRes.data;
        setZones(zonesList);
        setTrends(trendRes.data);

        // Find initial selected zone
        const initialCode = 'C3';
        const initialZone = zonesList.find(z => z.location_code === initialCode) || zonesList[0];
        if (initialZone) {
          setSelectedZone(initialZone.location_code.split('').join('-'));
          setSelectedZoneData(initialZone);
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  // Process trend data for the Line Chart
  const trendDataMap = {};
  trends.forEach(item => {
    const d = item.date;
    trendDataMap[d] = (trendDataMap[d] || 0) + item.count;
  });

  const sortedDates = Object.keys(trendDataMap).sort();
  const chartLabels = sortedDates.map(d => {
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  });
  const chartValues = sortedDates.map(d => trendDataMap[d]);

  const lineData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [
      {
        label: 'Orders Count',
        data: chartValues.length > 0 ? chartValues : [0],
        borderColor: '#e65100',
        backgroundColor: 'transparent',
        borderWidth: 4,
        tension: 0.3,
        fill: false,
        pointRadius: chartValues.length > 15 ? 0 : 2,
        pointHoverRadius: 6,
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { 
        grid: { display: true, color: '#f1f5f9', drawBorder: false, borderDash: [5, 5] },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' }, padding: 10 }
      },
      y: { 
        display: true, 
        grid: { display: true, color: '#f1f5f9', borderDash: [5, 5] },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="dashboard-container">
      
      {/* Top Stats Row */}
      <div className="stats-row">
        
        <Card className="stat-card">
          <div className="stat-icon slate"><PackageOpen size={32} /></div>
          <h3 className="stat-title">Total Stock</h3>
          <p className="stat-value">{stats ? (stats.total_stock_units || 0).toLocaleString() : '0'}</p>
          <p className="stat-delta">{stats ? stats.total_items : 0} <span>registered items</span></p>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon orange"><AlertCircle size={32} /></div>
          <h3 className="stat-title">Pending Shipments</h3>
          <p className="stat-value">{orderStats ? (orderStats.pending_orders + orderStats.processing_orders) : '0'}</p>
          <p className="stat-delta action">
            {orderStats && orderStats.pending_orders > 0 ? `${orderStats.pending_orders} awaiting dispatch` : 'Fully Synchronized'}
          </p>
        </Card>

        <Card className="stat-card">
          <div className="stat-icon slate"><BarChartIcon size={32} /></div>
          <h3 className="stat-title">Storage Utilization</h3>
          <p className="stat-value">{zoneSummary ? `${zoneSummary.overall_utilization}%` : '0%'}</p>
          <div>
            <div className="progress-header">
              <span>Current Load</span>
              <span>90% Threshold</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: zoneSummary ? `${Math.min(zoneSummary.overall_utilization, 100)}%` : '0%' }}></div>
              <div className="progress-marker" style={{ left: '90%' }}></div>
            </div>
          </div>
        </Card>

      </div>

      {/* Main Grid */}
      <div className="main-row">
        
        {/* Left Column */}
        <div className="left-col">
          <Card className="demand-card">
            <div className="card-header">
              <h2 className="card-title">Daily Order Trend</h2>
              <span className="badge">Live Data</span>
            </div>
            <div className="chart-container">
              <Line data={lineData} options={lineOptions} />
            </div>
            <div className="chart-footer">Total Inbound & Outbound Orders (30 Days)</div>
          </Card>

          <Card className="volume-card">
            <div className="card-header">
              <h2 className="card-title">Volume Breakdown</h2>
              <span className="view-all-link">Live Ratios</span>
            </div>
            
            <div className="volume-list">
              {(stats?.category_breakdown || []).slice(0, 3).map((item, idx) => {
                const totalStock = stats?.total_stock_units || 1;
                const pct = Math.round((item.total_qty / totalStock) * 100);
                const displayValue = item.total_qty >= 1000 
                  ? `${(item.total_qty / 1000).toFixed(1)}K` 
                  : item.total_qty.toString();

                return (
                  <div key={idx}>
                    <div className="volume-item-header">
                      <span className="volume-label">{formatCategory(item.item__category)}</span>
                      <span className="volume-val">{displayValue}</span>
                    </div>
                    <div className="volume-track">
                      <div className="volume-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {(!stats?.category_breakdown || stats.category_breakdown.length === 0) && (
                <p className="text-xs text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No stock data available</p>
              )}
            </div>
          </Card>
        </div>

        {/* Middle Column */}
        <Card className="middle-col">
          <div className="card-header" style={{ marginBottom: '40px', alignItems: 'flex-start' }}>
            <div>
              <h2 className="card-title" style={{ marginBottom: '8px' }}>Warehouse Density</h2>
              <p className="density-subtitle">Real-time floor occupancy mapping</p>
            </div>
            <div className="legend">
              <span className="legend-item"><span className="legend-box bg-high"></span> High (&gt;=80%)</span>
              <span className="legend-item"><span className="legend-box bg-mid"></span> Mid (30-80%)</span>
            </div>
          </div>

          <div className="grid-wrapper">
            <div className="zone-grid">
              {gridCells.map((id) => {
                const isSelected = selectedZone === id;
                return (
                  <div 
                    key={id}
                    onClick={() => handleZoneClick(id)}
                    className={`zone-cell ${getDensityClass(id)} ${isSelected ? 'selected' : ''}`}
                  >
                    <span className="zone-label">{id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Right Column */}
        <div className="right-col">
          <Card className="insight-card">
            
            <div className="insight-banner">
              <div className="insight-target">{selectedZone}</div>
              <h2 className="insight-title">
                {selectedZoneData ? selectedZoneData.name.split(' ').slice(0, 2).join(' ') : 'Zone'}
                <br/>
                {selectedZoneData ? selectedZoneData.name.split(' ').slice(2).join(' ') : 'Insight'}
              </h2>
            </div>

            <div className="insight-content">
              <div>
                <p className="insight-label">Zone Location Code</p>
                <p className="insight-val">{selectedZoneData ? selectedZoneData.location_code : 'Unassigned'}</p>
                <div className="insight-divider"></div>
              </div>
              
              <div>
                <p className="insight-label">Occupancy Load</p>
                <p className="insight-val">
                  {selectedZoneData ? `${selectedZoneData.current_occupancy} / ${selectedZoneData.capacity} units` : '0 / 0 units'}
                </p>
                <div className="insight-divider"></div>
              </div>
              
              <div>
                <p className="insight-label">Utilization Rate</p>
                <p className={`insight-val ${selectedZoneData && selectedZoneData.utilization_percentage >= 90 ? 'danger' : ''}`}>
                  {selectedZoneData ? `${selectedZoneData.utilization_percentage}%` : '0%'}
                  {selectedZoneData && selectedZoneData.utilization_percentage >= 90 && ' (Capacity Alert)'}
                </p>
              </div>
            </div>

          </Card>
        </div>

      </div>

    </div>
  );
}
