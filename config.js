// API Configuration
// This file determines the backend API URL based on the environment

(function(window) {
  'use strict';
  
  // Determine API base URL
  var getApiBaseUrl = function() {
    // 1. Check if explicitly set via window variable (for production)
    if (window.APP_API_BASE_URL) {
      return window.APP_API_BASE_URL.replace(/\/+$/, '');
    }
    
    // 2. Check if running on localhost (development)
    var hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return 'http://localhost:3000';
    }
    
    // 3. Check for meta tag (for Vercel/static hosting)
    var metaTag = document.querySelector('meta[name="api-base-url"]');
    if (metaTag && metaTag.content && metaTag.content.trim()) {
      var url = metaTag.content.trim().replace(/\/+$/, '');
      // Ensure URL has protocol
      if (url && !url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      return url;
    }
    
    // 4. For production (Vercel), you need to set the backend URL
    // Add this to your HTML: <meta name="api-base-url" content="https://your-backend.railway.app">
    // Or set: window.APP_API_BASE_URL = 'https://your-backend.railway.app' before loading this script
    return ''; // Empty means backend is not configured
  };
  
  var baseUrl = getApiBaseUrl();
  
  // Debug logging (remove in production if needed)
  if (typeof console !== 'undefined') {
    console.log('[API Config] Base URL:', baseUrl);
    console.log('[API Config] Hostname:', window.location.hostname);
  }
  
  var API_CONFIG = {
    baseUrl: baseUrl,
    isConfigured: function() {
      return !!this.baseUrl;
    },
    getUrl: function(path) {
      if (!path) return this.baseUrl;
      var cleanPath = path.startsWith('/') ? path : '/' + path;
      return this.baseUrl + cleanPath;
    }
  };
  
  // Make it globally available
  window.APP_CONFIG = API_CONFIG;
})(window);

