/**
 * Market Mapper Application State & Navigation Context
 * Phase 2 Integration: Supabase Auth, Profiles, Roles, Semantic Permissions & Offline Session
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppRoute, Profile, UserRole, SyncStatus, Mission } from '../types';
import { initializeDatabase, getDatabaseStats, resetDatabase, NotificationRepository, MissionRepository } from '../db';
import { useResponsive, ResponsiveState } from '../hooks/useResponsive';
import { IS_DEV } from '../config/env';
import { AuthService } from '../lib/auth/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getPermissions,
  UserPermissions,
  isAdmin as checkIsAdmin,
  isTeamLead as checkIsTeamLead,
  isMapper as checkIsMapper,
} from '../lib/auth/permissions';

// Fallback development profiles for local testing when Supabase is not connected
export const DEMO_PROFILES: Record<UserRole, Profile> = {
  mapper: {
    id: 'usr_mapper_01',
    fullName: 'Chioma Adebayo',
    email: 'chioma.adebayo@field.marketmapper.org',
    phone: '+234 803 123 4567',
    role: 'mapper',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  team_lead: {
    id: 'usr_lead_01',
    fullName: 'Ibrahim Danladi',
    email: 'ibrahim.danladi@field.marketmapper.org',
    phone: '+234 802 987 6543',
    role: 'team_lead',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  admin: {
    id: 'usr_admin_01',
    fullName: 'Dr. Folashade Adeleke',
    email: 'folashade.adeleke@marketmapper.org',
    phone: '+234 809 555 1122',
    role: 'admin',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-06-01T08:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
};

interface AppContextType {
  // Navigation
  currentRoute: AppRoute;
  routeHistory: AppRoute[];
  navigateTo: (route: AppRoute) => void;
  goBack: () => void;

  // Supabase Auth & Profile
  currentUser: Profile;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isOfflineAuth: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, pass: string, phone?: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (pass: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;

  // Semantic Permissions & Roles
  permissions: UserPermissions;
  isAdmin: boolean;
  isTeamLead: boolean;
  isMapper: boolean;

  // Development Role Preview Switcher (DEV ONLY — Does NOT change Supabase credentials or DB permissions)
  setUserRole: (role: UserRole) => void;

  // Offline & Synchronization
  isOffline: boolean;
  toggleOffline: () => void;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;

  // Database State & Inspection
  dbReady: boolean;
  dbStats: {
    version: number;
    totalTables: number;
    businessesCount: number;
    pathsCount: number;
    pendingOutboxCount: number;
    pendingMediaUploadCount: number;
    revisitsCount: number;
    catalogueCount: number;
  };
  refreshDbStats: () => Promise<void>;
  resetDb: (confirmWithUnsynced?: boolean) => Promise<{ success: boolean; message: string }>;

  // Notifications
  unreadNotifsCount: number;
  markNotifsRead: () => void;
  refreshNotifsCount: () => Promise<void>;

  // Phase 5 Active Mission & Area Context
  activeMission: Mission | null;
  activeMissionId: string;
  activeAreaId: string;
  activeStartingPoint: { name: string; latitude: number; longitude: number } | null;
  assignedStartingPoint: { name: string; latitude: number; longitude: number } | null;
  actualMappingStartPoint: {
    provenance: 'assigned_starting_point' | 'current_gps_location' | 'manual_point';
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  setActiveMissionContext: (
    missionId: string,
    areaId?: string,
    assignedPoint?: { name: string; latitude: number; longitude: number } | null,
    actualStartPoint?: {
      provenance: 'assigned_starting_point' | 'current_gps_location' | 'manual_point';
      name: string;
      latitude: number;
      longitude: number;
    } | null
  ) => void;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;

  // Responsive Layout & Capability
  previewDeviceMode: 'auto' | 'phone' | 'tablet';
  setPreviewDeviceMode: (mode: 'auto' | 'phone' | 'tablet') => void;
  responsive: ResponsiveState;
  isTabletView: boolean;
  isDev: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation State
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('splash');
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>(['splash']);

  // Auth & Profile State
  const [currentUser, setCurrentUser] = useState<Profile>(DEMO_PROFILES.mapper);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isOfflineAuth, setIsOfflineAuth] = useState<boolean>(false);

  // Network & Sync State
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(3);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(2);

  // Responsive device simulator (development only)
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'auto' | 'phone' | 'tablet'>('auto');
  const responsive = useResponsive(previewDeviceMode);

  // Database State
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [dbStats, setDbStats] = useState({
    version: 1,
    totalTables: 24,
    businessesCount: 14,
    pathsCount: 4,
    pendingOutboxCount: 3,
    pendingMediaUploadCount: 1,
    revisitsCount: 2,
    catalogueCount: 5,
  });

  // Calculate semantic permissions based on authenticated profile
  const permissions = useMemo(() => getPermissions(currentUser), [currentUser]);
  const isAdmin = useMemo(() => checkIsAdmin(currentUser), [currentUser]);
  const isTeamLead = useMemo(() => checkIsTeamLead(currentUser), [currentUser]);
  const isMapper = useMemo(() => checkIsMapper(currentUser), [currentUser]);

  // Boot: Initialize SQLite database & restore Supabase Session
  useEffect(() => {
    let isMounted = true;

    async function boot() {
      try {
        await initializeDatabase();
        if (isMounted) {
          setDbReady(true);
          const stats = await getDatabaseStats();
          setDbStats(stats);
        }

        // Restore Supabase Auth session
        const { user, isOffline: offlineState } = await AuthService.getInitialSession();
        if (isMounted) {
          setIsOfflineAuth(offlineState);
          if (user) {
            setCurrentUser(user);
            setIsAuthenticated(true);
            setCurrentRoute('home');
          } else {
            // Default demo mapper for pre-configured development preview
            if (!isSupabaseConfigured()) {
              setCurrentUser(DEMO_PROFILES.mapper);
              setIsAuthenticated(true);
              setCurrentRoute('home');
            } else {
              setIsAuthenticated(false);
              setCurrentRoute('sign_in');
            }
          }
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize app on boot:', err);
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    boot();

    // Supabase auth state listener
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session) {
          const profile = await AuthService.fetchProfile(session.user.id);
          if (profile && isMounted) {
            setCurrentUser(profile);
            setIsAuthenticated(true);
            setCurrentRoute('home');
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentRoute('sign_in');
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const profile = await AuthService.fetchProfile(session.user.id);
          if (profile && isMounted) {
            setCurrentUser(profile);
          }
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const isTabletView = responsive.isExpandedLayout;

  const navigateTo = (route: AppRoute) => {
    setRouteHistory((prev) => [...prev, route]);
    setCurrentRoute(route);
  };

  const goBack = () => {
    if (routeHistory.length > 1) {
      const next = [...routeHistory];
      next.pop();
      const target = next[next.length - 1];
      setRouteHistory(next);
      setCurrentRoute(target);
    } else {
      setCurrentRoute('home');
    }
  };

  // Sign In with Supabase
  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsAuthLoading(true);
    const res = await AuthService.signIn(email, pass);
    setIsAuthLoading(false);

    if (res.success && res.data) {
      setCurrentUser(res.data);
      setIsAuthenticated(true);
      navigateTo('home');
      return { success: true };
    }

    // Fallback for dev mode when Supabase is not connected
    if (!isSupabaseConfigured()) {
      setIsAuthenticated(true);
      navigateTo('home');
      return { success: true };
    }

    return { success: false, error: res.error || 'Invalid credentials.' };
  };

  // Sign Up with Supabase
  const signUp = async (
    name: string,
    email: string,
    pass: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    setIsAuthLoading(true);
    const res = await AuthService.signUp(name, email, pass, phone);
    setIsAuthLoading(false);

    if (res.success && res.data) {
      if (res.data.requiresVerification) {
        return { success: true, requiresVerification: true };
      }
      if (res.data.session) {
        const profile = await AuthService.fetchProfile(res.data.user.id);
        if (profile) {
          setCurrentUser(profile);
          setIsAuthenticated(true);
          navigateTo('home');
        }
      }
      return { success: true };
    }

    // Fallback for dev mode when Supabase is not connected
    if (!isSupabaseConfigured()) {
      const newProfile: Profile = {
        id: `usr_${Date.now()}`,
        fullName: name,
        email,
        phone,
        role: 'mapper', // Strictly mapper role
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentUser(newProfile);
      setIsAuthenticated(true);
      navigateTo('home');
      return { success: true };
    }

    return { success: false, error: res.error || 'Registration failed.' };
  };

  // Sign Out (Phase 2N: Does NOT delete local SQLite field data)
  const logout = async () => {
    await AuthService.signOut();
    setIsAuthenticated(false);
    navigateTo('sign_in');
  };

  const requestPasswordReset = async (email: string) => {
    return AuthService.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (pass: string) => {
    return AuthService.confirmPasswordReset(pass);
  };

  const resendVerification = async (email: string) => {
    return AuthService.resendVerificationEmail(email);
  };

  // Development-only role tester helper (does NOT modify Supabase user roles or production permissions)
  const setUserRole = (role: UserRole) => {
    if (!IS_DEV) {
      console.warn('Role switching is disabled in production environments.');
      return;
    }
    setCurrentUser(DEMO_PROFILES[role]);
  };

  const toggleOffline = () => {
    setIsOffline((prev) => {
      const next = !prev;
      setSyncStatus(next ? 'local_only' : pendingSyncCount > 0 ? 'pending' : 'synced');
      return next;
    });
  };

  const triggerSync = async () => {
    if (isOffline) return;
    setSyncStatus('syncing');
    await new Promise((r) => setTimeout(r, 1200));
    setPendingSyncCount(0);
    setSyncStatus('synced');
    await refreshDbStats();
  };

  const refreshDbStats = async () => {
    const stats = await getDatabaseStats();
    setDbStats(stats);
  };

  // Safe database reset (protected, requires dev mode and confirmation)
  const resetDb = async (confirmWithUnsynced = false): Promise<{ success: boolean; message: string }> => {
    if (!IS_DEV) {
      return { success: false, message: 'Database reset is strictly disabled in production builds.' };
    }

    if (pendingSyncCount > 0 && !confirmWithUnsynced) {
      return {
        success: false,
        message: `Database contains ${pendingSyncCount} unsynced outbox records. Please confirm destructive deletion or sync first.`,
      };
    }

    await resetDatabase();
    await refreshDbStats();
    return { success: true, message: 'SQLite database reset and minimal test seed reloaded.' };
  };

  // Phase 5 Active Mission & Area Context
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string>('mission_oja_oba_01');
  const [activeAreaId, setActiveAreaId] = useState<string>('area_gate_2_frontage');
  const [assignedStartingPoint, setAssignedStartingPoint] = useState<{
    name: string;
    latitude: number;
    longitude: number;
  } | null>({
    name: 'North Gate Junction',
    latitude: 6.4532,
    longitude: 3.1908,
  });
  const [actualMappingStartPoint, setActualMappingStartPoint] = useState<{
    provenance: 'assigned_starting_point' | 'current_gps_location' | 'manual_point';
    name: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  // activeStartingPoint aliases assignedStartingPoint for backward compatibility
  const activeStartingPoint = assignedStartingPoint;

  useEffect(() => {
    if (!activeMissionId) {
      setActiveMission(null);
      return;
    }
    MissionRepository.getMissionById(activeMissionId)
      .then((m) => {
        if (m) setActiveMission(m);
      })
      .catch((err) => {
        console.warn('Failed to load active mission:', err);
      });
  }, [activeMissionId]);

  const setActiveMissionContext = useCallback(
    (
      missionId: string,
      areaId?: string,
      assignedPoint?: { name: string; latitude: number; longitude: number } | null,
      actualStartPoint?: {
        provenance: 'assigned_starting_point' | 'current_gps_location' | 'manual_point';
        name: string;
        latitude: number;
        longitude: number;
      } | null
    ) => {
      setActiveMissionId(missionId);
      if (areaId) {
        setActiveAreaId(areaId);
      }
      if (assignedPoint !== undefined) {
        setAssignedStartingPoint(assignedPoint);
      }
      if (actualStartPoint !== undefined) {
        setActualMappingStartPoint(actualStartPoint);
      }
    },
    []
  );

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    setCurrentUser((prev) => {
      if (prev.id === userId) {
        return { ...prev, role: newRole };
      }
      return prev;
    });
  }, []);

  const refreshNotifsCount = useCallback(async () => {
    try {
      const unread = await NotificationRepository.getUnreadCount(currentUser.id);
      setUnreadNotifsCount(unread);
    } catch {
      // Ignore
    }
  }, [currentUser.id]);

  const markNotifsRead = () => {
    setUnreadNotifsCount(0);
    NotificationRepository.markAllAsRead(currentUser.id).catch(() => {});
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        routeHistory,
        navigateTo,
        goBack,
        currentUser,
        isAuthenticated,
        isAuthLoading,
        isOfflineAuth,
        signIn,
        signUp,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
        resendVerification,
        permissions,
        isAdmin,
        isTeamLead,
        isMapper,
        setUserRole,
        isOffline,
        toggleOffline,
        syncStatus,
        pendingSyncCount,
        triggerSync,
        dbReady,
        dbStats,
        refreshDbStats,
        resetDb,
        unreadNotifsCount,
        markNotifsRead,
        refreshNotifsCount,
        activeMission,
        activeMissionId,
        activeAreaId,
        activeStartingPoint,
        assignedStartingPoint,
        actualMappingStartPoint,
        setActiveMissionContext,
        updateUserRole,
        previewDeviceMode,
        setPreviewDeviceMode,
        responsive,
        isTabletView,
        isDev: IS_DEV,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
