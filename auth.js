(function(window){
  'use strict';

  const SESSION_KEY = 'ksurplus_session_v2';
  const USERS_KEY = 'ksurplus_users_v2';
  const ACTIVITY_KEY = 'ksurplus_activity_v2';

  const ROLE_DEFINITIONS = Object.freeze({
    superAdmin: {
      label: 'Super Admin',
      permissions: {
        inventory: { view: true, edit: true },
        alerts: { view: true, manage: true },
        reservations: { view: true, manage: true },
        sales: { view: true },
        customers: { view: true },
        accounts: { manage: true },
        profile: { edit: true },
        exports: true
      }
    },
    admin: {
      label: 'Admin',
      permissions: {
        inventory: { view: true, edit: true },
        alerts: { view: true, manage: true },
        reservations: { view: true, manage: true },
        sales: { view: true },
        customers: { view: true },
        accounts: { manage: false },
        profile: { edit: true },
        exports: true
      }
    },
    manager: {
      label: 'Manager',
      permissions: {
        inventory: { view: true, edit: false },
        alerts: { view: true, manage: true },
        reservations: { view: true, manage: true },
        sales: { view: true },
        customers: { view: true },
        accounts: { manage: false },
        profile: { edit: true },
        exports: true
      }
    },
    regularUser: {
      label: 'Regular User',
      permissions: {
        inventory: { view: true, edit: false },
        alerts: { view: true, manage: false },
        reservations: { view: true, manage: false },
        sales: { view: false },
        customers: { view: false },
        accounts: { manage: false },
        profile: { edit: true },
        exports: false
      }
    }
  });

  const DEFAULT_USERS = [];

  function hashPassword(value){
    try {
      return btoa(unescape(encodeURIComponent(value)));
    } catch(e) {
      return btoa(value);
    }
  }

  function comparePassword(raw, hashed){
    return hashPassword(raw) === hashed;
  }

  function clonePermissions(perms){
    try {
      return JSON.parse(JSON.stringify(perms || {}));
    } catch(e) {
      return {};
    }
  }

  function applyPermissionPatch(target, patch){
    if (!patch || typeof patch !== 'object') return;
    Object.keys(patch).forEach(function(key){
      var value = patch[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = target[key] && typeof target[key] === 'object' ? target[key] : {};
        applyPermissionPatch(target[key], value);
      } else {
        target[key] = !!value;
      }
    });
  }

  function getEffectivePermissionsForUser(user){
    if (!user) return {};
    var base = ROLE_DEFINITIONS[user.role] ? ROLE_DEFINITIONS[user.role].permissions : ROLE_DEFINITIONS.regularUser.permissions;
    var merged = clonePermissions(base);
    if (user.customPermissions) {
      applyPermissionPatch(merged, user.customPermissions);
    }
    return merged;
  }

  function loadUsers(){
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) {
        localStorage.setItem(USERS_KEY, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
      return [];
    } catch(e) {
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
      return [];
    }
  }

  function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function upsertUser(user){
    const users = loadUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], ...user };
    } else {
      users.push(user);
    }
    saveUsers(users);
    return users[index >= 0 ? index : users.length - 1];
  }

  function findUserByEmail(email){
    return loadUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
  }

  function mapServerRole(roleName){
    const normalized = String(roleName || '').toLowerCase();
    if (normalized === 'admin' || normalized === 'super_admin') {
      return { role: 'admin', type: 'admin' };
    }
    if (normalized === 'manager') {
      return { role: 'manager', type: 'admin' };
    }
    if (normalized === 'superadmin') {
      return { role: 'superAdmin', type: 'admin' };
    }
    return { role: 'regularUser', type: 'customer' };
  }

  function ensureLocalUserFromServer(serverUser, options){
    const roleMeta = mapServerRole(serverUser.role);
    const mergedOptions = options || {};
    const userPayload = {
      id: String(serverUser.id),
      name: serverUser.full_name || serverUser.name || serverUser.username || serverUser.email,
      email: String(serverUser.email || '').toLowerCase(),
      password: '',
      role: roleMeta.role,
      type: mergedOptions.type || roleMeta.type,
      phone: serverUser.phone || '',
      timezone: serverUser.timezone || 'Asia/Seoul',
      avatar: '',
      settings: {
        notifyLowStock: true,
        notifyReservation: true
      }
    };
    return upsertUser(userPayload);
  }

  function syncServerSession(serverUser, options){
    if (!serverUser || !serverUser.id) {
      throw new Error('Invalid server user payload');
    }
    const localUser = ensureLocalUserFromServer(serverUser, options);
    return setSession(localUser);
  }

  function getSession(){
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.userId) return null;
      const users = loadUsers();
      const user = users.find(u => u.id === session.userId);
      if (!user) return null;
      var permissions = getEffectivePermissionsForUser(user);
      return {
        ...session,
        user,
        permissions
      };
    } catch(e) {
      return null;
    }
  }

  function setSession(user){
    const payload = {
      userId: user.id,
      issuedAt: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return getSession();
  }

  function clearSession(){
    localStorage.removeItem(SESSION_KEY);
  }

  function recordActivity(actorId, action){
    const entry = {
      id: 'act_' + Date.now(),
      actorId,
      action,
      timestamp: new Date().toISOString()
    };
    const activity = loadActivity();
    activity.unshift(entry);
    if (activity.length > 100) activity.pop();
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    return entry;
  }

  function loadActivity(){
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch(e) {
      return [];
    }
  }

  function login(email, password, options){
    const opts = options || {};
    const user = findUserByEmail(email);
    if (!user) {
      throw new Error('Account not found. Please check your email.');
    }
    if (opts.requireAdmin && user.type !== 'admin') {
      throw new Error('This portal is restricted to admin accounts.');
    }
    if (opts.requireCustomer && user.type !== 'customer') {
      throw new Error('Please sign in through the admin portal.');
    }
    if (!comparePassword(password, user.password)) {
      throw new Error('Invalid credentials. Please try again.');
    }
    const session = setSession(user);
    recordActivity(user.id, 'Logged in');
    return session;
  }

  function logout(reason){
    const session = getSession();
    if (session && session.user) {
      recordActivity(session.user.id, 'Logged out' + (reason ? ` (${reason})` : ''));
    }
    clearSession();
  }

  function requireSession({ allowedRoles, type }){
    const session = getSession();
    const invalid = !session ||
      (allowedRoles && allowedRoles.length && !allowedRoles.includes(session.user.role)) ||
      (type && session.user.type !== type);

    if (invalid) {
      logout('Session expired');
      throw new Error('UNAUTHORIZED');
    }
    return session;
  }

  function requireAdmin(roles){
    return requireSession({ allowedRoles: roles || ['superAdmin','admin','manager','regularUser'], type: 'admin' });
  }

  function requireCustomer(){
    return requireSession({ type: 'customer' });
  }

  function listUsers(filter){
    const users = loadUsers();
    if (!filter) return users;
    return users.filter(function(user){
      return Object.keys(filter).every(function(key){
        return filter[key] === user[key];
      });
    });
  }

  function updateUserRole(userId, role){
    if (!ROLE_DEFINITIONS[role]) {
      throw new Error('Unknown role');
    }
    const users = loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index < 0) throw new Error('User not found');
    users[index].role = role;
    saveUsers(users);
    recordActivity(userId, `Role updated to ${ROLE_DEFINITIONS[role].label}`);
    return users[index];
  }

  function updateUserProfile(userId, payload){
    const users = loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index < 0) throw new Error('User not found');
    users[index] = {
      ...users[index],
      ...payload,
      settings: {
        ...users[index].settings,
        ...(payload.settings || {})
      }
    };
    saveUsers(users);
    recordActivity(userId, 'Updated profile settings');
    return users[index];
  }

  function createUser(data){
    const id = data.id || ('user_' + Date.now());
    const user = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashPassword(data.password || 'changeme'),
      role: data.role || 'regularUser',
      type: data.type || 'admin',
      phone: data.phone || '',
      timezone: data.timezone || 'Asia/Seoul',
      avatar: data.avatar || '',
      settings: {
        notifyLowStock: true,
        notifyReservation: true,
        ...(data.settings || {})
      }
    };
    upsertUser(user);
    recordActivity(user.id, `Account created (${ROLE_DEFINITIONS[user.role].label})`);
    return user;
  }

  function deleteUser(userId){
    const users = loadUsers().filter(u => u.id !== userId);
    saveUsers(users);
    recordActivity(userId, 'Account deleted');
  }

  function updateUserPermissions(userId, patch){
    if (!patch || typeof patch !== 'object') {
      throw new Error('Invalid permission payload.');
    }
    const users = loadUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index < 0) throw new Error('User not found');
    const user = users[index];
    user.customPermissions = user.customPermissions && typeof user.customPermissions === 'object' ? user.customPermissions : {};
    applyPermissionPatch(user.customPermissions, patch);
    users[index] = user;
    saveUsers(users);
    recordActivity(userId, 'Permissions updated');
    return user;
  }

  function getRoleOptions(){
    return Object.keys(ROLE_DEFINITIONS).map(function(key){
      return { value: key, label: ROLE_DEFINITIONS[key].label };
    });
  }

  const api = {
    bootstrap: loadUsers,
    login,
    logout,
    getSession,
    requireAdmin,
    requireCustomer,
    listUsers,
    findUserByEmail,
    updateUserRole,
    updateUserProfile,
    createUser,
    deleteUser,
    recordActivity,
    loadActivity,
    ROLE_DEFINITIONS,
    getRoleOptions,
    updateUserPermissions,
    getEffectivePermissions: getEffectivePermissionsForUser,
    syncServerSession
  };

  window.KSurplusAuth = api;
})(window);

