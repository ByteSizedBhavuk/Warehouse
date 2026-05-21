import { useEffect, useState } from 'react';
import { Map } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { inventoryAPI } from '../services/api';
import './Pages.css';

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [z, s] = await Promise.all([
          inventoryAPI.getZones(),
          inventoryAPI.getZoneSummary(),
        ]);
        setZones(z.data.results || z.data);
        setSummary(s.data);
      } catch (e) {
        console.error('Zones load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const zoneTypeColor = {
    DISPATCH: 'zone-grad-success',
    STANDARD: 'zone-grad-info',
    BULK:     'zone-grad-purple',
    COLD:     'zone-grad-cyan',
    HAZMAT:   'zone-grad-danger',
  };

  const zoneTypeBadge = {
    DISPATCH: 'badge-success',
    STANDARD: 'badge-info',
    BULK:     'badge-purple',
    COLD:     'badge-cyan',
    HAZMAT:   'badge-danger',
  };

  const utilizationColor = (pct) => {
    if (pct >= 90) return '#f87171'; // red
    if (pct >= 70) return '#fbbf24'; // amber
    return '#34d399'; // emerald
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      {/* Summary bar */}
      {summary && (
        <div className="summary-grid">
          {[
            { label: 'Total Zones', value: summary.total_zones },
            { label: 'Total Capacity', value: summary.total_capacity?.toLocaleString() },
            { label: 'Occupied', value: summary.total_occupancy?.toLocaleString() },
            { label: 'Utilization', value: `${summary.overall_utilization}%` },
          ].map(({ label, value }, i) => (
            <div key={label} className="table-card animate-fade-in" style={{ padding: '16px', textAlign: 'center', animationDelay: `${i * 80}ms` }}>
              <p className="text-bold" style={{ fontSize: '20px' }}>{value}</p>
              <p className="text-xs text-muted" style={{ marginTop: '4px' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Zone cards grid */}
      <div className="zones-grid">
        {zones.map((zone, i) => (
          <div
            key={zone.id}
            className={`zone-card ${zoneTypeColor[zone.zone_type] || 'zone-grad-neutral'} animate-fade-in`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="zone-card-header">
              <div>
                <h3 className="zone-card-title">{zone.name}</h3>
                <span className="zone-card-subtitle">{zone.location_code}</span>
              </div>
              <span className={`badge ${zoneTypeBadge[zone.zone_type] || 'badge-neutral'}`}>
                {zone.zone_type}
              </span>
            </div>

            {/* Utilization bar */}
            <div className="zone-utilization">
              <div className="zone-utilization-text">
                <span>{zone.current_occupancy} / {zone.capacity}</span>
                <span>{zone.utilization_percentage}%</span>
              </div>
              <div className="zone-utilization-bar">
                <div
                  className="zone-utilization-fill"
                  style={{
                    width: `${Math.min(zone.utilization_percentage, 100)}%`,
                    backgroundColor: utilizationColor(zone.utilization_percentage)
                  }}
                />
              </div>
            </div>

            <div className="zone-footer">
              <span>{zone.available_space} spaces available</span>
              <span className={zone.is_active ? 'text-success' : 'text-danger'}>
                {zone.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
