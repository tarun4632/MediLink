import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from '../api/client';

const STORAGE_KEY = 'medilink_auth';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = readStoredUser();
    if (stored?.token) {
      setAuthToken(stored.token);
    }
    return stored;
  });

  useEffect(() => {
    setAuthToken(user?.token || null);
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const nextUser = {
      userId: response.data.username,
      token: response.data.token,
    };
    setAuthToken(nextUser.token);
    setUser(nextUser);
  };

  const signup = async (username, password) => {
    const response = await api.post('/auth/signup', { username, password });
    const nextUser = {
      userId: response.data.username,
      token: response.data.token,
    };
    setAuthToken(nextUser.token);
    setUser(nextUser);
  };

  const logout = async () => {
    try {
      if (user?.token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Clear local session even if the server call fails.
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.token),
      login,
      signup,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
