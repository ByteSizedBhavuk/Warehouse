import { useEffect, useState } from 'react';
import { Package, Search, Plus, Trash2, X, Edit } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { inventoryAPI } from '../services/api';
import './Pages.css';

export default function Inventory({ user }) {
  const [items, setItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('items');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editReorder, setEditReorder] = useState('');
  const [editMaxStock, setEditMaxStock] = useState('');
  const [allZones, setAllZones] = useState([]);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ELECTRONICS');
  const [unitPrice, setUnitPrice] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [initialZone, setInitialZone] = useState('');
  const [initialQty, setInitialQty] = useState('');

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [itemsRes, recordsRes] = await Promise.all([
          inventoryAPI.getItems({ search, page: tab === 'items' ? page : 1 }),
          inventoryAPI.getRecords({ search, page: tab === 'records' ? page : 1 }),
        ]);
        setItems(itemsRes.data.results || itemsRes.data);
        setTotalItems(itemsRes.data.count || 0);
        
        setRecords(recordsRes.data.results || recordsRes.data);
        setTotalRecords(recordsRes.data.count || 0);
      } catch (e) {
        console.error('Inventory load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, tab, page, refreshTrigger]);

  // Load zones for form dropdown
  useEffect(() => {
    async function loadZones() {
      try {
        const res = await inventoryAPI.getZones({ page_size: 100 });
        const zonesList = res.data.results || res.data;
        setAllZones(zonesList);
      } catch (e) {
        console.error('Error fetching zones list:', e);
      }
    }
    loadZones();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        sku: sku.trim(),
        name: name.trim(),
        category,
        unit_price: parseFloat(unitPrice),
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        is_active: isActive
      };

      const itemRes = await inventoryAPI.createItem(itemData);
      const createdItem = itemRes.data;

      // Handle optional initial stock record creation
      if (initialZone) {
        const recordData = {
          item: createdItem.id,
          zone: parseInt(initialZone),
          quantity: parseInt(initialQty || 0),
          reorder_level: 10,
          max_stock: 1000
        };
        await inventoryAPI.createRecord(recordData);
      }

      // Reset Form and Trigger Reload
      setSku('');
      setName('');
      setCategory('ELECTRONICS');
      setUnitPrice('');
      setWeightKg('');
      setIsActive(true);
      setInitialZone('');
      setInitialQty('');
      setShowAddModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to create item:', err);
      alert(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to register item. Check console.');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item? This will remove it from the catalog and delete all associated warehouse stock records.')) {
      try {
        await inventoryAPI.deleteItem(itemId);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error('Delete item error:', err);
        alert('Failed to delete item.');
      }
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Are you sure you want to remove this stock record mapping from this physical warehouse zone?')) {
      try {
        await inventoryAPI.deleteRecord(recordId);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error('Delete stock record error:', err);
        alert('Failed to remove stock record.');
      }
    }
  };

  const handleOpenEditModal = (rec) => {
    setSelectedRecord(rec);
    setEditQty(rec.quantity);
    setEditReorder(rec.reorder_level);
    setEditMaxStock(rec.max_stock);
    setShowEditModal(true);
  };

  const handleEditRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        item: selectedRecord.item,
        zone: selectedRecord.zone,
        quantity: parseInt(editQty),
        reorder_level: parseInt(editReorder),
        max_stock: parseInt(editMaxStock)
      };
      await inventoryAPI.updateRecord(selectedRecord.id, data);
      setShowEditModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to update record:', err);
      alert(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update stock record.');
    }
  };

  const renderPagination = (total) => {
    const totalPages = Math.ceil(total / 20);
    if (totalPages <= 1) return null;
    return (
      <div className="pagination">
        <button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span className="text-muted text-sm">Page {page} of {totalPages}</span>
        <button className="filter-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    );
  };

  const statusBadge = (status) => {
    const map = {
      NORMAL:       'badge-success',
      LOW:          'badge-warning',
      OUT_OF_STOCK: 'badge-danger',
      OVERSTOCKED:  'badge-info',
    };
    return map[status] || 'badge-neutral';
  };

  if (loading && refreshTrigger === 0) return <LoadingSpinner />;

  return (
    <div className="page-container">
      {/* Toolbar */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="toolbar-group" style={{ alignItems: 'center' }}>
          {['items', 'records'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`filter-btn ${tab === t ? 'active' : ''}`}
            >
              {t === 'items' ? 'Items' : 'Stock Records'}
            </button>
          ))}
          {user?.role !== 'STAFF' && (
            <>
              <div className="toolbar-divider"></div>
              <button 
                className="filter-btn active" 
                onClick={() => setShowAddModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add Item
              </button>
            </>
          )}
        </div>
        <div className="toolbar-group">
          <div className="search-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      {tab === 'items' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {['SKU', 'Name', 'Category', 'Price', 'Weight', 'Status', ...(user?.role !== 'STAFF' ? ['Actions'] : [])].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ animationDelay: `${i * 10}ms` }}>
                    <td>
                      <span className="text-mono text-primary-color">{item.sku}</span>
                    </td>
                    <td>
                      <p className="text-bold">{item.name}</p>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {item.category}
                      </span>
                    </td>
                    <td>₹{parseFloat(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-muted">
                      {item.weight_kg ? `${item.weight_kg} kg` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {user?.role !== 'STAFF' && (
                      <td>
                        <button 
                          className="action-btn text-danger" 
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete Item Catalog"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <p className="empty-state">No items found</p>
          )}
          {renderPagination(totalItems)}
        </div>
      )}

      {/* Records Table */}
      {tab === 'records' && (
        <div className="table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  {['Item', 'SKU', 'Zone', 'Quantity', 'Reorder Level', 'Status', ...(user?.role !== 'STAFF' ? ['Actions'] : [])].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr key={rec.id} style={{ animationDelay: `${i * 10}ms` }}>
                    <td className="text-bold">{rec.item_name}</td>
                    <td>
                      <span className="text-mono text-primary-color">{rec.item_sku}</span>
                    </td>
                    <td className="text-muted">{rec.zone_name}</td>
                    <td className="text-bold">{rec.quantity}</td>
                    <td className="text-muted">{rec.reorder_level}</td>
                    <td>
                      <span className={`badge ${statusBadge(rec.stock_status)}`}>
                        {rec.stock_status?.replace('_', ' ')}
                      </span>
                    </td>
                    {user?.role !== 'STAFF' && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="action-btn" 
                            onClick={() => handleOpenEditModal(rec)}
                            title="Edit Stock Record"
                            style={{ color: '#6366f1' }}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="action-btn text-danger" 
                            onClick={() => handleDeleteRecord(rec.id)}
                            title="Remove Stock Mapping"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <p className="empty-state">No records found</p>
          )}
          {renderPagination(totalRecords)}
        </div>
      )}

      {/* Add Item Modal Overlay */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3 className="modal-title">Register New Inventory Item</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">SKU (Unique)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ELEC-005"
                    value={sku}
                    onChange={e => setSku(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mechanical Keyboard"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      required
                    >
                      <option value="ELECTRONICS">Electronics</option>
                      <option value="CLOTHING">Clothing</option>
                      <option value="FOOD">Food & Beverages</option>
                      <option value="FURNITURE">Furniture</option>
                      <option value="TOOLS">Tools & Hardware</option>
                      <option value="CHEMICALS">Chemicals</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Is Active Catalog</label>
                    <div className="form-group form-checkbox" style={{ marginTop: '6px' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={e => setIsActive(e.target.checked)}
                        id="isActiveCheck"
                      />
                      <label htmlFor="isActiveCheck" style={{ cursor: 'pointer', fontSize: '13px' }}>Active</label>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={unitPrice}
                      onChange={e => setUnitPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                <div className="toolbar-divider" style={{ width: '100%', height: '1px', margin: '8px 0' }}></div>

                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: '600' }}>
                  Initial Stock Allocation (Optional)
                </h4>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Warehouse Zone</label>
                    <select
                      className="form-select"
                      value={initialZone}
                      onChange={e => setInitialZone(e.target.value)}
                    >
                      <option value="">-- Select Zone --</option>
                      {allZones.map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({zone.location_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={initialQty}
                      onChange={e => setInitialQty(e.target.value)}
                      disabled={!initialZone}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Item
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* Edit Record Modal Overlay */}
      {showEditModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3 className="modal-title">Edit Stock Record</h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditRecordSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Item / Product</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${selectedRecord.item_name} (${selectedRecord.item_sku})`}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Zone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedRecord.zone_name}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={editQty}
                    onChange={e => setEditQty(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reorder Level</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={editReorder}
                      onChange={e => setEditReorder(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Stock Capacity</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={editMaxStock}
                      onChange={e => setEditMaxStock(e.target.value)}
                      required
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
