/* ═══════════════════════════════════════
   AUTH.JS - Autentisering og rollesjekk
   ═══════════════════════════════════════
   Brukere hentes fra Firebase.
   Admin-bruker er hardkodet som fallback.
   ═══════════════════════════════════════ */

const AUTH_STORAGE_KEY = 'ukeplan-auth';

// Hardkodet admin-bruker (fallback, kan alltid logge inn)
const ADMIN_USER = { username: 'Admin', password: '123', role: 'admin', displayName: 'Administrator' };

// Cache for brukere lastet fra Firebase
let _cachedUsers = null;

// Sjekk innlogging
function checkAuth(requiredRole) {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole && session.role !== requiredRole) {
    redirectToRolePage(session.role);
    return null;
  }
  return session;
}

// Hent brukere fra Firebase (brukes av innloggingssiden)
async function loadUsersFromFirebase() {
  try {
    const snap = await firebase.database().ref('ukeplan/users').once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.entries(data).map(([id, u]) => ({ id, ...u }));
  } catch (e) {
    console.error('Kunne ikke laste brukere fra Firebase:', e);
    return [];
  }
}

// Logg inn (async - henter brukere fra Firebase)
async function login(username, password) {
  // Sjekk hardkodet admin først
  if (ADMIN_USER.username.toLowerCase() === username.toLowerCase() && ADMIN_USER.password === password) {
    const session = {
      username: ADMIN_USER.username,
      role: ADMIN_USER.role,
      displayName: ADMIN_USER.displayName,
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  // Hent brukere fra Firebase
  const users = await loadUsersFromFirebase();

  const user = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() &&
    u.password === password
  );

  if (!user) {
    return { success: false, message: 'Feil brukernavn eller passord' };
  }

  const session = {
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return { success: true, session };
}

// Logg ut
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.href = 'index.html';
}

// Hent sesjon
function getSession() {
  try {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Redirect basert på rolle
function redirectToRolePage(role) {
  switch (role) {
    case 'admin':   window.location.href = 'admin.html';   break;
    case 'teacher': window.location.href = 'teacher.html'; break;
    case 'student': window.location.href = 'student.html'; break;
    default:        window.location.href = 'index.html';   break;
  }
}

// Render topbar brukerinfo
function renderAuthTopbar(session) {
  const roleBadgeClass = session.role;
  const roleLabels = { admin: 'Admin', teacher: 'Lærer', student: 'Elev' };

  return `
    <div class="topbar-user">
      <span class="role-badge ${roleBadgeClass}">${roleLabels[session.role]}</span>
      <span>${session.displayName}</span>
    </div>
    <button class="btn-logout" onclick="logout()">Logg ut</button>
  `;
}
