import { createContext, useEffect, useState, type ReactNode } from 'react';
import { getAdminInfo, getMe, loginUser, logout as logoutRequest } from '../api/auth';

const AUTH_LOGOUT_EVENT = 'auth:logout';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'parent' | 'admin' | 'school-admin';
  schoolId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;

    try {
      return JSON.parse(stored) as User;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((me) => {
        const hydratedUser: User = {
          id: me.id,
          email: me.email,
          name: me.name,
          role: me.role,
          schoolId: me.schoolId,
        };
        setUser(hydratedUser);
        localStorage.setItem('user', JSON.stringify(hydratedUser));
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);

    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('accessToken', data.accessToken);

      let nextUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        schoolId: data.user.schoolId,
      };

      // Server login payload may not include schoolId; fetch admin info to enrich it.
      if (data.user.role === 'school-admin' && !data.user.schoolId) {
        const adminInfo = await getAdminInfo();
        nextUser = {
          ...nextUser,
          schoolId: adminInfo.user.schoolId || adminInfo.school?._id,
        };
      }

      setUser(nextUser);
      localStorage.setItem('user', JSON.stringify(nextUser));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutRequest().catch(() => undefined);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
