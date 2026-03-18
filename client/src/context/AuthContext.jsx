import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi, getMe } from '../api/services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const res = await getMe();

      setUser(res.data.user);
      setToken(stored);

      const userData = res.data.user;
      
      //  CHANGED: 'club' is now 'team'
      if (userData?.team) {
        // Safely extract the ID whether team is an object or just a string
        const teamId = typeof userData.team === 'object' ? userData.team._id : userData.team;
        localStorage.setItem('selectedTeam', teamId);
      }

    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedTeam'); //  CHANGED
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await loginApi({ email, password });

    const { token: newToken, user: userData } = res.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    //  CHANGED: 'club' is now 'team'
    if (userData?.team) {
      const teamId = typeof userData.team === 'object' ? userData.team._id : userData.team;
      localStorage.setItem('selectedTeam', teamId);
    }

    setToken(newToken);
    setUser(userData);

    return userData;
  };

  const register = async (data) => {
    const res = await registerApi(data);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedTeam'); //  CHANGED
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  
  //  NEW: Helper flags for UI conditional rendering
  const isSuperAdmin = user?.role === 'super_admin'; 

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        token, 
        loading, 
        isAuthenticated, 
        isSuperAdmin,
        login, 
        register, 
        logout 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};