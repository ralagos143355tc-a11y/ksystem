(function(){
  'use strict';

  var auth = window.KSurplusAuth;
  if (!auth) return;

  var session;
  try {
    session = (window.AdminShell && window.AdminShell.getSession && window.AdminShell.getSession()) || auth.requireAdmin();
  } catch(e) {
    return;
  }

  var permissions = session.permissions || {};
  var canManageAccounts = permissions.accounts && permissions.accounts.manage;
  if (!canManageAccounts) {
    return;
  }
  var isSuperAdmin = session.user.role === 'superAdmin';

  var roleOptions = auth.getRoleOptions();
  var adminTableBody = document.getElementById('admin-users-table');
  var rolesMatrixBody = document.getElementById('roles-matrix-body');
  var activityContainer = document.querySelector('.activity-log');
  var signupFormModal = document.getElementById('signup-form-modal');
  var signupButton = document.getElementById('signup-new-btn');
  var cancelSignupBtn = document.getElementById('cancel-signup');
  var closeSignupModal = document.getElementById('close-signup-modal');
  var newAccountForm = document.getElementById('new-account-form');

  var PERMISSION_COLUMNS = [
    { key: 'inventory.view', label: 'View Inventory' },
    { key: 'inventory.edit', label: 'Edit Inventory' },
    { key: 'alerts.manage', label: 'Manage Alerts' },
    { key: 'sales.view', label: 'View Sales' },
    { key: 'customers.view', label: 'View Customers' },
    { key: 'accounts.manage', label: 'Manage Accounts' }
  ];

  function getUsers(){
    return auth.listUsers({ type: 'admin' }) || [];
  }

  function getRoleLabel(role){
    var def = auth.ROLE_DEFINITIONS && auth.ROLE_DEFINITIONS[role];
    return def ? def.label : role;
  }

  function getEffectivePermissions(user){
    if (!user) return {};
    if (typeof auth.getEffectivePermissions === 'function') {
      return auth.getEffectivePermissions(user);
    }
    var def = auth.ROLE_DEFINITIONS && auth.ROLE_DEFINITIONS[user.role];
    return def ? def.permissions || {} : {};
  }

  function permissionValue(perms, path){
    if (!perms) return false;
    var parts = path.split('.');
    var current = perms;
    for (var i = 0; i < parts.length; i++) {
      current = current[parts[i]];
      if (current === undefined) return false;
    }
    return !!current;
  }

  function formatLastActive(userId){
    var activity = auth.loadActivity();
    var entry = activity.find(function(item){ return item.actorId === userId; });
    if (!entry) return '—';
    return new Date(entry.timestamp).toLocaleString();
  }

  function canModifyUser(target){
    if (!target) return false;
    if (target.id === session.user.id) return false;
    if (target.role === 'superAdmin' && session.user.role !== 'superAdmin') return false;
    return true;
  }

  function renderAdminTable(){
    if (!adminTableBody) return;
    var users = getUsers();
    if (!users.length) {
      adminTableBody.innerHTML = '<tr><td colspan="5" class="no-data">No admin accounts found.</td></tr>';
      return;
    }
    
    // Get header labels for data-label attributes
    var headerCells = document.querySelectorAll('#admin-users-table-main thead th');
    var headerLabels = Array.from(headerCells).map(function(th) {
      return th.textContent.trim();
    });
    
    adminTableBody.innerHTML = users.map(function(user){
      var modifiable = canModifyUser(user);
      return `
        <tr>
          <td data-label="${headerLabels[0] || 'Username'}">${user.name}</td>
          <td data-label="${headerLabels[1] || 'Role'}"><span class="badge info">${getRoleLabel(user.role)}</span></td>
          <td data-label="${headerLabels[2] || 'Status'}"><span class="badge ok">Active</span></td>
          <td data-label="${headerLabels[3] || 'Last Active'}">${formatLastActive(user.id)}</td>
          <td data-label="${headerLabels[4] || 'Actions'}">
            <button class="btn-small btn-secondary" data-action="suspend" data-user="${user.id}" ${modifiable ? '' : 'disabled'}>Suspend</button>
            <button class="btn-small btn-danger" data-action="delete" data-user="${user.id}" ${modifiable ? '' : 'disabled'}>Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderRolesMatrix(){
    if (!rolesMatrixBody) return;
    var users = getUsers();
    if (!users.length) {
      rolesMatrixBody.innerHTML = '<tr><td colspan="' + (2 + PERMISSION_COLUMNS.length) + '" class="no-data">No roles to display.</td></tr>';
      return;
    }
    
    // Get header labels for data-label attributes
    var headerCells = document.querySelectorAll('#roles-matrix-table thead th');
    var headerLabels = Array.from(headerCells).map(function(th) {
      return th.textContent.trim();
    });
    
    rolesMatrixBody.innerHTML = users.map(function(user){
      var perms = getEffectivePermissions(user);
      var canChangeRole = canModifyUser(user);
      var selectOptions = roleOptions.map(function(role){
        var disabled = role.value === 'superAdmin' && session.user.role !== 'superAdmin';
        return `<option value="${role.value}" ${role.value === user.role ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${role.label}</option>`;
      }).join('');
      return `
        <tr>
          <td data-label="${headerLabels[0] || 'User'}">${user.name}</td>
          <td data-label="${headerLabels[1] || 'Role'}">
            <select class="role-select" data-user="${user.id}" ${canChangeRole ? '' : 'disabled'}>
              ${selectOptions}
            </select>
          </td>
          ${PERMISSION_COLUMNS.map(function(col, index){
            var hasAccess = permissionValue(perms, col.key);
            var checkboxId = `perm-${user.id}-${col.key.replace(/\./g,'-')}`;
            var disabledAttr = isSuperAdmin ? '' : 'disabled';
            var stateLabel = hasAccess ? 'Enabled' : 'Disabled';
            var labelIndex = index + 2; // +2 because first two are User and Role
            return `
              <td data-label="${headerLabels[labelIndex] || col.label}">
                <label class="permission-toggle" for="${checkboxId}">
                  <input type="checkbox" id="${checkboxId}" class="permission-checkbox" data-user="${user.id}" data-permission="${col.key}" ${hasAccess ? 'checked' : ''} ${disabledAttr} aria-label="${col.label} for ${user.name}">
                  <span class="permission-toggle-label">${stateLabel}</span>
                </label>
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }).join('');
  }

  function bindAdminTableActions(){
    if (!adminTableBody) return;
    adminTableBody.addEventListener('click', function(e){
      var action = e.target.getAttribute('data-action');
      var userId = e.target.getAttribute('data-user');
      if (!action || !userId) return;
      if (action === 'suspend') suspendUser(userId);
      if (action === 'delete') deleteUser(userId);
    });
  }

  function bindRoleSelects(){
    if (!rolesMatrixBody) return;
    rolesMatrixBody.addEventListener('change', function(e){
      if (e.target.classList.contains('permission-checkbox')) return;
      if (!e.target.classList.contains('role-select')) return;
      var userId = e.target.getAttribute('data-user');
      var role = e.target.value;
      try {
        auth.updateUserRole(userId, role);
        auth.recordActivity(session.user.id, 'Updated role for ' + userId + ' to ' + getRoleLabel(role));
        renderAdminTable();
        renderRolesMatrix();
        updateActivityFeed();
      } catch(err) {
        alert(err.message || 'Unable to update role.');
      }
    });
  }

  function buildPermissionPatch(path, value){
    var parts = (path || '').split('.');
    var root = {};
    var current = root;
    parts.forEach(function(part, index){
      if (!part) return;
      if (index === parts.length - 1) {
        current[part] = value;
      } else {
        current[part] = current[part] && typeof current[part] === 'object' ? current[part] : {};
        current = current[part];
      }
    });
    return root;
  }

  function bindPermissionToggles(){
    if (!rolesMatrixBody || !isSuperAdmin) return;
    rolesMatrixBody.addEventListener('change', function(e){
      if (!e.target.classList.contains('permission-checkbox')) return;
      var userId = e.target.getAttribute('data-user');
      var permissionPath = e.target.getAttribute('data-permission');
      var enabled = e.target.checked;
      if (!userId || !permissionPath) return;
      if (typeof auth.updateUserPermissions !== 'function') {
        alert('Permission updates are not supported in this build.');
        renderRolesMatrix();
        return;
      }
      try {
        auth.updateUserPermissions(userId, buildPermissionPatch(permissionPath, enabled));
        auth.recordActivity(session.user.id, 'Updated ' + permissionPath + ' for ' + userId + ' (' + (enabled ? 'enabled' : 'disabled') + ')');
        renderRolesMatrix();
      } catch(err) {
        alert(err.message || 'Unable to update permissions.');
        e.target.checked = !enabled;
      }
    });
  }

  function suspendUser(userId){
    var users = getUsers();
    var user = users.find(function(u){ return u.id === userId; });
    if (!user) return;
    if (confirm('Suspend ' + user.name + '?')) {
      auth.recordActivity(session.user.id, 'Suspended user: ' + user.name);
      alert(user.name + ' has been flagged as suspended (demo).');
      updateActivityFeed();
    }
  }

  function deleteUser(userId){
    var users = getUsers();
    var user = users.find(function(u){ return u.id === userId; });
    if (!user) return;
    if (!canModifyUser(user)) return;
    if (confirm('Delete ' + user.name + '? This cannot be undone.')) {
      auth.deleteUser(userId);
      auth.recordActivity(session.user.id, 'Deleted user: ' + user.name);
      renderAdminTable();
      renderRolesMatrix();
      updateActivityFeed();
    }
  }

  function updateActivityFeed(){
    if (!activityContainer) return;
    var activity = auth.loadActivity();
    activityContainer.innerHTML = activity.slice(0, 10).map(function(item){
      return `
        <div class="activity-item">
          <span class="activity-time">${new Date(item.timestamp).toLocaleString()}</span>
          <span class="activity-user">${item.actorId}</span>
          <span class="activity-action">${item.action}</span>
        </div>
      `;
    }).join('');
  }

  function openSignupModal() {
    if (signupFormModal) {
      signupFormModal.style.display = 'flex';
    }
  }

  function closeSignupModalFunc() {
    if (signupFormModal) {
      signupFormModal.style.display = 'none';
    }
    if (newAccountForm) {
      newAccountForm.reset();
    }
  }

  if (signupButton) {
    signupButton.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      openSignupModal();
    });
  }

  if (cancelSignupBtn) {
    cancelSignupBtn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      closeSignupModalFunc();
    });
  }

  if (closeSignupModal) {
    closeSignupModal.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      closeSignupModalFunc();
    });
  }

  // Close modal when clicking outside
  if (signupFormModal) {
    signupFormModal.addEventListener('click', function(event) {
      if (event.target === signupFormModal) {
        closeSignupModalFunc();
      }
    });
    
    // Prevent modal from closing when clicking inside modal-content
    var modalContent = signupFormModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    }
  }

  // Password toggle functionality for signup modal
  var toggleNewPassword = document.getElementById('toggle-new-password');
  var toggleConfirmPassword = document.getElementById('toggle-confirm-password');
  var newPasswordInput = document.getElementById('new-password');
  var confirmPasswordInput = document.getElementById('confirm-password');

  if (toggleNewPassword && newPasswordInput) {
    toggleNewPassword.addEventListener('click', function() {
      var type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      newPasswordInput.setAttribute('type', type);
      var eyeIcon = toggleNewPassword.querySelector('.eye-icon:not(.eye-icon-hidden)');
      var eyeIconHidden = toggleNewPassword.querySelector('.eye-icon-hidden');
      if (type === 'password') {
        if (eyeIcon) eyeIcon.style.display = 'block';
        if (eyeIconHidden) eyeIconHidden.style.display = 'none';
      } else {
        if (eyeIcon) eyeIcon.style.display = 'none';
        if (eyeIconHidden) eyeIconHidden.style.display = 'block';
      }
    });
  }

  if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener('click', function() {
      var type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordInput.setAttribute('type', type);
      var eyeIcon = toggleConfirmPassword.querySelector('.eye-icon:not(.eye-icon-hidden)');
      var eyeIconHidden = toggleConfirmPassword.querySelector('.eye-icon-hidden');
      if (type === 'password') {
        if (eyeIcon) eyeIcon.style.display = 'block';
        if (eyeIconHidden) eyeIconHidden.style.display = 'none';
      } else {
        if (eyeIcon) eyeIcon.style.display = 'none';
        if (eyeIconHidden) eyeIconHidden.style.display = 'block';
      }
    });
  }

  if (newAccountForm) {
    newAccountForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = document.getElementById('new-username').value.trim();
      var email = document.getElementById('new-email') ? document.getElementById('new-email').value.trim() : '';
      var role = document.getElementById('new-role').value;
      var password = document.getElementById('new-password').value;
      var confirmPassword = document.getElementById('confirm-password').value;

      if (!name || !email) {
        alert('Name and email are required.');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
      }
      
      // Get API base URL - check multiple sources
      var API_BASE_URL = null;
      
      // 1. Check if API_BASE_URL is defined in admin.js scope (from admin.html)
      if (typeof window !== 'undefined' && window.API_BASE_URL) {
        API_BASE_URL = window.API_BASE_URL;
      }
      // 2. Check config.js
      else if (window.APP_CONFIG && window.APP_CONFIG.baseUrl) {
        API_BASE_URL = window.APP_CONFIG.baseUrl;
      }
      // 3. Check window variable
      else if (window.APP_API_BASE_URL) {
        API_BASE_URL = window.APP_API_BASE_URL;
      }
      // 4. Fallback
      else {
        API_BASE_URL = 'http://localhost:3000';
      }
      
      API_BASE_URL = API_BASE_URL.replace(/\/+$/, '');
      
      // Disable submit button
      var submitBtn = newAccountForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        var originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
      }
      
      // Create account in database via API
      fetch(API_BASE_URL + '/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
          role: role
        })
      })
      .then(function(response) {
        return response.json().then(function(data) {
          if (!response.ok) {
            throw new Error(data.error || 'Failed to create account');
          }
          return data;
        });
      })
      .then(function(result) {
        // Also create in localStorage for frontend compatibility
        try {
          auth.createUser({
            id: String(result.user.id),
            name: name,
            email: email,
            password: password,
            role: role,
            type: 'admin'
          });
        } catch(e) {
          console.warn('Could not create user in localStorage:', e);
        }
        
        auth.recordActivity(session.user.id, 'Created new ' + getRoleLabel(role) + ' account: ' + name);
        alert('Account created successfully!');
        newAccountForm.reset();
        closeSignupModalFunc();
        renderAdminTable();
        renderRolesMatrix();
        updateActivityFeed();
      })
      .catch(function(err) {
        alert(err.message || 'Unable to create account. Please try again.');
        console.error('Create account error:', err);
      })
      .finally(function() {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText || 'Create Account';
        }
      });
    });
  }

  var switchAdminBtn = document.getElementById('switch-admin-btn');
  var switchAdminModal = document.getElementById('switch-admin-modal');
  var closeSwitchAdminModal = document.getElementById('close-switch-admin-modal');
  var cancelSwitchAdmin = document.getElementById('cancel-switch-admin');
  var confirmSwitchAdmin = document.getElementById('confirm-switch-admin');

  function openSwitchAdminModal() {
    if (switchAdminModal) {
      switchAdminModal.style.display = 'flex';
    }
  }

  function closeSwitchAdminModalFunc() {
    if (switchAdminModal) {
      switchAdminModal.style.display = 'none';
    }
  }

  if (switchAdminBtn) {
    switchAdminBtn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      openSwitchAdminModal();
    });
  }

  if (closeSwitchAdminModal) {
    closeSwitchAdminModal.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      closeSwitchAdminModalFunc();
    });
  }

  if (cancelSwitchAdmin) {
    cancelSwitchAdmin.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      closeSwitchAdminModalFunc();
    });
  }

  if (confirmSwitchAdmin) {
    confirmSwitchAdmin.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      auth.logout('Switch admin');
      window.location.replace('login.html');
    });
  }

  // Close modal when clicking outside
  if (switchAdminModal) {
    switchAdminModal.addEventListener('click', function(event) {
      if (event.target === switchAdminModal) {
        closeSwitchAdminModalFunc();
      }
    });
    
    // Prevent modal from closing when clicking inside modal-content
    var modalContent = switchAdminModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    }
  }

  renderAdminTable();
  renderRolesMatrix();
  bindAdminTableActions();
  bindRoleSelects();
  bindPermissionToggles();
  updateActivityFeed();
})();
