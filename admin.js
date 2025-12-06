(function(window){
  'use strict';

  const auth = window.KSurplusAuth;
  if (!auth) return;

  function redirectToLogin(){
    window.location.replace('login.html');
  }

  function ensureSession(){
    try {
      return auth.requireAdmin(['superAdmin','admin','manager','regularUser']);
    } catch(e) {
      redirectToLogin();
      return null;
    }
  }

  const session = ensureSession();
  if (!session) return;
  window.AdminContext = session;

  function updateUserBadge(){
    if (!session || !session.user) return;
    var nameEl = document.getElementById('current-user-name');
    var roleEl = document.getElementById('current-user-role');
    if (nameEl) nameEl.textContent = session.user.name;
    if (roleEl) {
      var roleDef = auth.ROLE_DEFINITIONS[session.user.role];
      roleEl.textContent = roleDef ? roleDef.label : session.user.role;
    }
  }

  function showSection(hash){
    var target = (hash || '#inventory').replace('#','');
    var sections = document.querySelectorAll('.section');
    var navLinks = document.querySelectorAll('.sidebar nav a');
    sections.forEach(function(section){
      section.classList.toggle('active', section.id === target);
    });
    navLinks.forEach(function(link){
      var href = link.getAttribute('href') || '';
      link.classList.toggle('active', href.replace('#','') === target);
    });
  }

  function bindNavigation(){
    var navLinks = document.querySelectorAll('.sidebar nav a');
    navLinks.forEach(function(link){
      var href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      link.addEventListener('click', function(e){
        e.preventDefault();
        if (location.hash !== href) {
          history.pushState(null, '', href);
        }
        showSection(href);
      });
    });
    window.addEventListener('hashchange', function(){
      showSection(location.hash);
    });
    showSection(location.hash);
  }

  function bindLogout(){
    var buttons = document.querySelectorAll('[data-action="logout"], #sidebar-logout-btn');
    var logoutModal = document.getElementById('logout-modal');
    var confirmLogoutBtn = document.getElementById('confirm-logout');
    var cancelLogoutBtn = document.getElementById('cancel-logout');
    var closeLogoutModal = document.getElementById('close-logout-modal');
    
    function showLogoutModal(){
      if (logoutModal) {
        logoutModal.style.display = 'flex';
      }
    }
    
    function hideLogoutModal(){
      if (logoutModal) {
        logoutModal.style.display = 'none';
      }
    }
    
    function performLogout(){
      auth.logout('Manual logout');
      hideLogoutModal();
      redirectToLogin();
    }
    
    // Open logout modal when logout button is clicked
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        showLogoutModal();
      });
    });
    
    // Confirm logout
    if (confirmLogoutBtn) {
      confirmLogoutBtn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        performLogout();
      });
    }
    
    // Cancel logout
    if (cancelLogoutBtn) {
      cancelLogoutBtn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        hideLogoutModal();
      });
    }
    
    // Close modal with X button
    if (closeLogoutModal) {
      closeLogoutModal.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        hideLogoutModal();
      });
    }
    
    // Close modal when clicking outside
    if (logoutModal) {
      logoutModal.addEventListener('click', function(event) {
        if (event.target === logoutModal) {
          hideLogoutModal();
        }
      });
      
      // Prevent modal from closing when clicking inside modal-content
      var modalContent = logoutModal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.addEventListener('click', function(event) {
          event.stopPropagation();
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateUserBadge();
    bindNavigation();
    bindLogout();
  });

  window.AdminShell = {
    getSession: function(){ return session; },
    getPermissions: function(){ return session.permissions || {}; }
  };
})(window);
