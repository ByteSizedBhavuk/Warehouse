import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Authentication ──────────────────────────────────
export const authAPI = {
  login:  (username, password) => api.post('/inventory/auth/login/', { username, password }),
  logout: () => api.post('/inventory/auth/logout/'),
  me:     () => api.get('/inventory/auth/me/'),
};

// ─── Inventory ────────────────────────────────────────
export const inventoryAPI = {
  // Items
  getItems:       (params) => api.get('/inventory/items/', { params }),
  getItem:        (id)     => api.get(`/inventory/items/${id}/`),
  createItem:     (data)   => api.post('/inventory/items/', data),
  updateItem:     (id, d)  => api.put(`/inventory/items/${id}/`, d),
  deleteItem:     (id)     => api.delete(`/inventory/items/${id}/`),

  // Zones
  getZones:       (params) => api.get('/inventory/zones/', { params }),
  getZone:        (id)     => api.get(`/inventory/zones/${id}/`),
  getZoneSummary: ()       => api.get('/inventory/zones/summary/'),

  // Inventory Records
  getRecords:     (params) => api.get('/inventory/records/', { params }),
  getLowStock:    ()       => api.get('/inventory/records/low_stock/'),
  getDashboardStats: ()    => api.get('/inventory/records/dashboard_stats/'),
  createRecord:   (data)   => api.post('/inventory/records/', data),
  updateRecord:   (id, d)  => api.put(`/inventory/records/${id}/`, d),
  deleteRecord:   (id)     => api.delete(`/inventory/records/${id}/`),
};

// ─── Orders ───────────────────────────────────────────
export const ordersAPI = {
  getOrders:  (params) => api.get('/orders/orders/', { params }),
  getOrder:   (id)     => api.get(`/orders/orders/${id}/`),
  createOrder:(data)   => api.post('/orders/orders/', data),
  updateOrder:(id, d)  => api.put(`/orders/orders/${id}/`, d),
  deleteOrder:(id)     => api.delete(`/orders/orders/${id}/`),
  getStats:   ()       => api.get('/orders/orders/stats/'),
  getTrend:   (days)   => api.get('/orders/orders/trend/', { params: { days } }),
};

// ─── Analytics ────────────────────────────────────────
export const analyticsAPI = {
  getPredictions:      (params) => api.get('/analytics/predictions/', { params }),
  getTopDemand:        (limit)  => api.get('/analytics/predictions/top_demand/', { params: { limit } }),
  getRecommendations:  (params) => api.get('/analytics/recommendations/', { params }),
  getPendingRecs:      ()       => api.get('/analytics/recommendations/pending/'),
  applyRecommendation: (id)     => api.post(`/analytics/recommendations/${id}/apply/`),
  getAdieStats:        ()       => api.get('/analytics/adie/'),
  getHeatStats:        ()       => api.get('/analytics/heat/'),
  getVolatilityStats:  ()       => api.get('/analytics/volatility/'),
};

export default api;
