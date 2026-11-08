import React, {
  createContext, useState, useContext, useEffect, useCallback, useMemo, useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getProfile, updatePushToken, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';

const profileToUser = (fbUser, profile, previous = {}) => ({
  ...previous,
  uid: fbUser?.uid || previous.uid,
  email: fbUser?.email || previous.email || profile?.email,
  fullName: profile?.fullName || previous.fullName || fbUser?.displayName || '',
  role: profile?.role || previous.role || 'student',
  phone: profile?.phone ?? previous.phone ?? '',
  emergencyContacts: Array.isArray(profile?.emergencyContacts)
    ? profile.emergencyContacts
    : (previous.emergencyContacts || []),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  userRef.current = user;

  const persist = async (authToken, userData) => {
    if (authToken) await AsyncStorage.setItem(TOKEN_KEY, authToken);
    if (userData) await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const clearLocal = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const signOut = useCallback(async () => {
    // Clear the device token on the server first (needs a valid session),
    // then end the Firebase session so it cannot be resumed from storage.
    try { await updatePushToken(null); } catch { /* best effort */ }
    try { await fbSignOut(auth); } catch { /* best effort */ }
    await clearLocal();
  }, [clearLocal]);

  const signIn = useCallback(async (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    await persist(authToken, userData);
  }, []);

  const updateUser = useCallback(async (updatedData) => {
    const newUser = { ...(userRef.current || {}), ...updatedData };
    setUser(newUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  /**
   * Re-fetch the server profile so role/contacts reflect the database, not a
   * possibly stale or tampered local cache. The navigator derives its tabs
   * from `user.role`, but every privileged API call is still enforced
   * server-side, so this is about correctness, not security.
   */
  const refreshProfile = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    const profile = await getProfile();
    const freshToken = await fbUser.getIdToken();
    const merged = profileToUser(fbUser, profile, userRef.current || {});
    setToken(freshToken);
    setUser(merged);
    await persist(freshToken, merged);
    return merged;
  }, []);

  // Restore session on cold start.
  useEffect(() => {
    let unsubscribe = () => {};
    let settled = false;

    const restore = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn('Error loading stored auth:', error?.message || error);
      }
    };

    restore().finally(() => {
      // Wait for Firebase to report whether a session exists before we stop
      // showing the loading screen, so we never flash the login screen for a
      // signed-in user or keep a signed-out user on a cached profile.
      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          // Signed out (by us, by LoginScreen's role check, or by Firebase).
          await clearLocal();
        } else if (!settled) {
          // Restoring a persisted session: refresh the profile so the role
          // and contacts reflect the server. Fresh sign-ins are handled by
          // LoginScreen, which validates the role before calling signIn().
          try {
            await refreshProfile();
          } catch (err) {
            // Offline: keep the cached profile. A 401 is handled by the
            // unauthorized handler below.
            if (err?.code !== 'unauthorized') {
              console.warn('Profile refresh failed:', err?.message || err);
            }
          }
        }
        if (!settled) {
          settled = true;
          setLoading(false);
        }
      });
    });

    return () => unsubscribe();
  }, [clearLocal, refreshProfile]);

  // If the API rejects our token, sign out rather than looping on 401s.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (userRef.current) signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ user, token, loading, signIn, signOut, updateUser, refreshProfile }),
    [user, token, loading, signIn, signOut, updateUser, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
