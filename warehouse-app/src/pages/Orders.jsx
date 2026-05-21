import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Filter, Plus, Trash2, X, Eye, ClipboardList } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { ordersAPI, inventoryAPI } from '../services/api';
import './Pages.css';

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Create Order Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderType, setOrderType] = useState('INBOUND');
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState([{ item: '', quantity: 1, zone: '' }]);

  // Detail Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  // Dropdown options
  const [catalogItems, setCatalogItems] = useState([]);
  const [zonesList, setZonesList] = useState([]);

  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [itemsRes, zonesRes] = await Promise.all([
          inventoryAPI.getItems({ page_size: 100 }),
          inventoryAPI.getZones({ page_size: 100 })
        ]);
        setCatalogItems(itemsRes.data.results || itemsRes.data);
        setZonesList(zonesRes.data.results || zonesRes.data);
      } catch (err) {
        console.error('Error loading options:', err);
      }
    }
    loadFormOptions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, typeFilter]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = { page };
        if (filter) params.status = filter;
        if (typeFilter) params.order_type = typeFilter;
        const res = await ordersAPI.getOrders(params);
        setOrders(res.data.results || res.data);
        setTotalOrders(res.data.count || 0);
      } catch (e) {
        console.error('Orders load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter, typeFilter, page, refreshTrigger]);

  const renderPagination = () => {
    const totalPages = Math.ceil(totalOrders / 20);
    if (totalPages <= 1) return null;
    return (
      <div className="pagination">
        <button className="filter-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span className="text-muted text-sm">Page {page} of {totalPages}</span>
        <button className="filter-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    );
  };

  const generateOrderNum = () => {
    setOrderNumber(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderNumber) {
      alert('Please provide or generate an order number.');
      return;
    }
    if (orderItems.some(i => !i.item || !i.zone || i.quantity <= 0)) {
      alert('Please fill out all item selections, zones, and quantities.');
      return;
    }

    try {
      const data = {
        order_number: orderNumber.trim(),
        order_type: orderType,
        status: 'PENDING',
        notes: notes.trim(),
        items: orderItems.map(i => ({
          item: parseInt(i.item),
          quantity: parseInt(i.quantity),
          zone: parseInt(i.zone)
        }))
      };
      await ordersAPI.createOrder(data);
      setShowCreateModal(false);
      setOrderNumber('');
      setNotes('');
      setOrderItems([{ item: '', quantity: 1, zone: '' }]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Create order error:', err);
      alert(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create order.');
    }
  };

  const handleRowClick = async (orderId) => {
    try {
      const res = await ordersAPI.getOrder(orderId);
      setSelectedOrder(res.data);
      setEditStatus(res.data.status);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching order detail:', err);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await ordersAPI.updateOrder(selectedOrder.id, {
        status: editStatus
      });
      setShowDetailModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Update status error:', err);
      const errMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.error || JSON.stringify(err.response?.data) || 'Failed to update order status.';
      alert(errMsg);
    }
  };

  const addOrderItemRow = () => {
    setOrderItems([...orderItems, { item: '', quantity: 1, zone: '' }]);
  };

  const removeOrderItemRow = (index) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const updateOrderItemRow = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const statusColor = {
    PENDING:    'badge-warning',
    PROCESSING: 'badge-info',
    COMPLETED:  'badge-success',
    CANCELLED:  'badge-danger',
  };

  const typeColor = {
    INBOUND:  'badge-cyan',
    OUTBOUND: 'badge-purple',
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-container">
      {/* Filters & Actions */}
      <div className="toolbar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="toolbar-group">
            {['', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(s => (
              <button
                key={s}
                onClick={() => { setFilter(s); setLoading(true); }}
                className={`filter-btn ${filter === s ? 'active' : ''}`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            {['', 'INBOUND', 'OUTBOUND'].map(t => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setLoading(true); }}
                className={`filter-btn ${typeFilter === t ? 'active' : ''}`}
              >
                {t || 'All Types'}
              </button>
            ))}
          </div>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button
            className="filter-btn active"
            onClick={() => {
              generateOrderNum();
              setShowCreateModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Create Order
          </button>
        )}
      </div>

      {/* Orders table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {['Order #', 'Type', 'Status', 'Items', 'Value', 'Date'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <tr
                  key={order.id}
                  style={{ animationDelay: `${i * 30}ms`, cursor: 'pointer' }}
                  onClick={() => handleRowClick(order.id)}
                >
                  <td>
                    <span className="text-mono text-primary-color">
                      {order.order_number}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${typeColor[order.order_type] || ''}`}>
                      {order.order_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusColor[order.status] || ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.total_items}</td>
                  <td className="text-bold">
                    ₹{order.total_value?.toLocaleString('en-IN') || '0.00'}
                  </td>
                  <td className="text-muted">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {orders.length === 0 && (
          <p className="empty-state">No orders found</p>
        )}
        {renderPagination()}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Order</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit}>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Order Number</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={orderNumber}
                        onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. ORD-12345"
                        required
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={generateOrderNum}
                        style={{ padding: '8px 12px' }}
                      >
                        Gen
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order Type</label>
                    <select
                      className="form-select"
                      value={orderType}
                      onChange={e => setOrderType(e.target.value)}
                      required
                    >
                      <option value="INBOUND">Inbound (Stock In)</option>
                      <option value="OUTBOUND">Outbound (Stock Out)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter notes about this order..."
                    style={{ minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-main)', fontWeight: '600' }}>
                      Order Items
                    </h4>
                    <button
                      type="button"
                      className="filter-btn active"
                      onClick={addOrderItemRow}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px' }}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  {orderItems.map((orderItem, idx) => (
                    <div key={idx} className="form-row animate-fade-in" style={{ gridTemplateColumns: '2fr 1fr 2fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <div className="form-group">
                        <select
                          className="form-select"
                          value={orderItem.item}
                          onChange={e => updateOrderItemRow(idx, 'item', e.target.value)}
                          required
                          style={{ fontSize: '13px', padding: '8px' }}
                        >
                          <option value="">-- Item --</option>
                          {catalogItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <input
                          type="number"
                          className="form-input"
                          min="1"
                          placeholder="Qty"
                          value={orderItem.quantity}
                          onChange={e => updateOrderItemRow(idx, 'quantity', e.target.value)}
                          required
                          style={{ fontSize: '13px', padding: '8px' }}
                        />
                      </div>

                      <div className="form-group">
                        <select
                          className="form-select"
                          value={orderItem.zone}
                          onChange={e => updateOrderItemRow(idx, 'zone', e.target.value)}
                          required
                          style={{ fontSize: '13px', padding: '8px' }}
                        >
                          <option value="">-- Zone --</option>
                          {zonesList.map(zone => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name} ({zone.location_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="action-btn text-danger"
                        onClick={() => removeOrderItemRow(idx)}
                        disabled={orderItems.length === 1}
                        style={{ padding: '8px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details / Status Update Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Order Details: {selectedOrder.order_number}</h3>
              <button className="modal-close-btn" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <div>
                  <p style={{ margin: '4px 0' }}><span className="text-muted">Type:</span> <span className={`badge ${typeColor[selectedOrder.order_type]}`}>{selectedOrder.order_type}</span></p>
                  <p style={{ margin: '4px 0' }}><span className="text-muted">Status:</span> <span className={`badge ${statusColor[selectedOrder.status]}`}>{selectedOrder.status}</span></p>
                  <p style={{ margin: '4px 0' }}><span className="text-muted">Created:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  {selectedOrder.completed_at && (
                    <p style={{ margin: '4px 0' }}><span className="text-muted">Completed:</span> {new Date(selectedOrder.completed_at).toLocaleString()}</p>
                  )}
                </div>
                <div>
                  <p style={{ margin: '4px 0' }}><span className="text-muted">Total Items:</span> <span className="text-bold">{selectedOrder.total_items}</span></p>
                  <p style={{ margin: '4px 0' }}><span className="text-muted">Total Value:</span> <span className="text-bold">₹{selectedOrder.total_value?.toLocaleString('en-IN') || '0.00'}</span></p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', marginTop: '8px' }}>
                  <p className="text-muted" style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Notes</p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedOrder.notes}</p>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-text-main)', fontWeight: '600' }}>Items In This Order</h4>
                <div className="table-card">
                  <div className="table-responsive">
                    <table className="data-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>SKU</th>
                          <th>Zone</th>
                          <th>Qty</th>
                          <th>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="text-bold">{item.item_name}</td>
                            <td><span className="text-mono text-primary-color">{item.item_sku}</span></td>
                            <td className="text-muted">
                              {zonesList.find(z => z.id === item.zone)?.name || `Zone ID ${item.zone}`}
                            </td>
                            <td className="text-bold">{item.quantity}</td>
                            <td>₹{item.line_total?.toLocaleString('en-IN') || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Status Update Form (ADMIN & MANAGER only, and only if status is not COMPLETED or CANCELLED) */}
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED') && (
                <form onSubmit={handleUpdateStatus} style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div className="form-row" style={{ alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Update Order Status</label>
                      <select
                        className="form-select"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                        required
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="COMPLETED">Completed (Triggers Inventory Adjustments)</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: '42px' }}>
                      Update Status
                    </button>
                  </div>
                </form>
              )}

              {/* Display static warning if completed/cancelled */}
              {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED') && (
                <div style={{ marginTop: '16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} className="text-muted">
                  <span>This order is {selectedOrder.status} and cannot be further modified.</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
