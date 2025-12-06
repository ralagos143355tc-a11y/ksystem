(function(window){
  'use strict';

  const THRESHOLD_KEY = 'ksurplus_low_stock_threshold';
  const ALERT_STATE_KEY = 'ksurplus_low_stock_state_v1';
  const DEFAULT_THRESHOLD = 5;

  function getThreshold(){
    const stored = parseInt(localStorage.getItem(THRESHOLD_KEY), 10);
    if (Number.isNaN(stored) || stored <= 0) return DEFAULT_THRESHOLD;
    return stored;
  }

  function setThreshold(value){
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error('Threshold must be a positive integer.');
    }
    localStorage.setItem(THRESHOLD_KEY, String(parsed));
    return parsed;
  }

  function getAlertState(){
    try {
      const raw = localStorage.getItem(ALERT_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e) {
      return {};
    }
  }

  function saveAlertState(state){
    localStorage.setItem(ALERT_STATE_KEY, JSON.stringify(state));
  }

  function getStockMeta(stock, threshold){
    const value = Number(stock) || 0;
    const limit = typeof threshold === 'number' ? threshold : getThreshold();
    if (value <= 0) {
      return {
        status: 'out',
        label: 'Out of Stock',
        className: 'danger',
        percentage: 0,
        severity: 'critical'
      };
    }
    if (value <= limit) {
      const severity = value <= Math.max(1, Math.floor(limit / 2)) ? 'critical' : 'warning';
      return {
        status: 'low',
        label: 'Low Stock',
        className: severity === 'critical' ? 'danger' : 'warning',
        percentage: Math.max(5, Math.min(100, (value / limit) * 100)),
        severity
      };
    }
    if (value <= limit * 2) {
      return {
        status: 'medium',
        label: 'Medium Stock',
        className: 'ok',
        percentage: Math.min(100, (value / (limit * 2)) * 100),
        severity: 'info'
      };
    }
    return {
      status: 'high',
      label: 'In Stock',
      className: 'ok',
      percentage: 100,
      severity: 'info'
    };
  }

  function findLowStock(products, threshold){
    const limit = typeof threshold === 'number' ? threshold : getThreshold();
    return (products || []).filter(function(product){
      return product && Number(product.stock) > 0 && Number(product.stock) <= limit;
    });
  }

  function evaluateAlerts(products, notifyFn){
    const limit = getThreshold();
    const state = getAlertState();
    const triggered = [];

    (products || []).forEach(function(product){
      if (!product || !product.id) return;
      const stock = Number(product.stock) || 0;
      const wasLow = state[product.id] ? state[product.id].flaggedLow : false;
      const isLow = stock > 0 && stock <= limit;

      if (isLow && !wasLow) {
        triggered.push({
          id: product.id,
          name: product.name,
          stock,
          severity: stock <= Math.max(1, Math.floor(limit / 2)) ? 'critical' : 'warning'
        });
      }

      state[product.id] = {
        flaggedLow: isLow,
        lastStock: stock
      };
    });

    saveAlertState(state);

    if (triggered.length && typeof notifyFn === 'function') {
      notifyFn(triggered);
    }

    return triggered;
  }

  function resetAlertsForProduct(productId){
    const state = getAlertState();
    if (state[productId]) {
      delete state[productId];
      saveAlertState(state);
    }
  }

  function formatCurrency(amount){
    return Number(amount || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  }

  window.InventoryUtils = {
    getThreshold,
    setThreshold,
    getStockMeta,
    findLowStock,
    evaluateAlerts,
    resetAlertsForProduct,
    formatCurrency
  };
})(window);

