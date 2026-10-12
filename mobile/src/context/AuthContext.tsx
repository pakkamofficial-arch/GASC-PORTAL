import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  error: string | null;
  mustChangePasswordPending: boolean;
  login: (identifier: string, password: string) => Promise<{ mustChangePassword?: boolean }>;
  setSession: (userData: any, profileData: any, tokens: { accessToken: string; refreshToken: string }) => void;
  completePasswordChange: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePasswordPending, setMustChangePasswordPending] = useState<boolean>(false);

  const clearError = () => setError(null);

  const login = async (identifier: string, password: string): Promise<{ mustChangePassword?: boolean }> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });

      if (response.success && response.data) {
        const { user: userData, tokens, profile: profileData, mustChangePassword } = response.data;
        api.setTokens(tokens.accessToken, tokens.refreshToken);
        setUser(userData);
        setProfile(profileData);
        const requiresChange = Boolean(userData?.mustChangePassword || mustChangePassword);
        setMustChangePasswordPending(requiresChange);
        return { mustChangePassword: requiresChange };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to college server');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completePasswordChange = async (currentPassword: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (response.success && response.data) {
        if (response.data.tokens) {
          api.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
        }
        if (response.data.user) {
          setUser((prev) => (prev ? { ...prev, ...response.data.user, mustChangePassword: false } : response.data.user));
        } else {
          setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
        }
        setMustChangePasswordPending(false);
      } else {
        throw new Error(response.message || 'Password update failed');
      }
    } catch (err: any) {
      setError(err.message || 'Password update failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = (userData: any, profileData: any, tokens: { accessToken: string; refreshToken: string }): void => {
    api.setTokens(tokens.accessToken, tokens.refreshToken);
    setUser(userData);
    setProfile(profileData);
    setMustChangePasswordPending(Boolean(userData?.mustChangePassword));
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = api.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {});
      }
    } finally {
      api.setTokens(null, null);
      setUser(null);
      setProfile(null);
      setMustChangePasswordPending(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
        setProfile(res.data.profile);
      }
    } catch (err) {
      console.log('[Auth] Profile refresh error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        mustChangePasswordPending,
        login,
        setSession,
        completePasswordChange,
        logout,
        refreshProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
