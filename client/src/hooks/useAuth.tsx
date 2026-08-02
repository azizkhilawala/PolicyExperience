import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, fetchCurrentUser, fetchUsers, switchUser as apiSwitchUser } from '../api/auth.js';
import { setCurrentUserId } from '../api/client.js';

interface AuthContextValue {
  user: User | null;
  users: User[];
  switchUser: (userId: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCurrentUser(), fetchUsers()])
      .then(([me, allUsers]) => {
        setUser(me);
        setUsers(allUsers);
        setCurrentUserId(me.id);
      })
      .finally(() => setLoading(false));
  }, []);

  const switchUser = async (userId: string) => {
    const newUser = await apiSwitchUser(userId);
    setUser(newUser);
    setCurrentUserId(newUser.id);
  };

  return (
    <AuthContext.Provider value={{ user, users, switchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
