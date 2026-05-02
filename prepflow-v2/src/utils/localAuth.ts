// Simple local authentication using localStorage (no backend required)

export interface LocalUser {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  name: string;
  createdAt: string;
}

// Simple hash function (for demo purposes - not cryptographically secure)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Get all users from localStorage
function getAllUsers(): LocalUser[] {
  const usersJson = localStorage.getItem('prepflow_users');
  return usersJson ? JSON.parse(usersJson) : [];
}

// Save all users to localStorage
function saveAllUsers(users: LocalUser[]): void {
  localStorage.setItem('prepflow_users', JSON.stringify(users));
}

// Get current session
export function getCurrentSession(): AuthSession | null {
  const sessionJson = localStorage.getItem('prepflow_session');
  return sessionJson ? JSON.parse(sessionJson) : null;
}

// Save session
function saveSession(session: AuthSession): void {
  localStorage.setItem('prepflow_session', JSON.stringify(session));
}

// Clear session
export function clearSession(): void {
  localStorage.removeItem('prepflow_session');
}

// Sign up a new user
export function signUp(username: string, password: string, name: string): { success: boolean; error?: string; session?: AuthSession } {
  // Validate username
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { success: false, error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' };
  }

  // Validate password
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Validate name (only if provided - name can be empty during initial signup and set later)
  if (name && name.trim().length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' };
  }

  const usernameLower = username.toLowerCase();
  const users = getAllUsers();

  // Check if username already exists
  if (users.some(u => u.username.toLowerCase() === usernameLower)) {
    return { success: false, error: 'Username already taken' };
  }

  // Create new user
  const newUser: LocalUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: usernameLower,
    name: name.trim(),
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };

  // Save user
  users.push(newUser);
  saveAllUsers(users);

  // Create session
  const session: AuthSession = {
    userId: newUser.id,
    username: newUser.username,
    name: newUser.name,
    createdAt: new Date().toISOString(),
  };
  saveSession(session);

  return { success: true, session };
}

// Sign in an existing user
export function signIn(username: string, password: string): { success: boolean; error?: string; session?: AuthSession } {
  const usernameLower = username.toLowerCase();
  const users = getAllUsers();

  // Find user
  const user = users.find(u => u.username.toLowerCase() === usernameLower);
  if (!user) {
    return { success: false, error: 'Username not found' };
  }

  // Check password
  const passwordHash = simpleHash(password);
  if (user.passwordHash !== passwordHash) {
    return { success: false, error: 'Incorrect password' };
  }

  // Create session
  const session: AuthSession = {
    userId: user.id,
    username: user.username,
    name: user.name,
    createdAt: new Date().toISOString(),
  };
  saveSession(session);

  return { success: true, session };
}

// Sign out
export function signOut(): void {
  clearSession();
}

// Check if user is signed in
export function isSignedIn(): boolean {
  return getCurrentSession() !== null;
}
