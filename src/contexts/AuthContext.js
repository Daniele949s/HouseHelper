import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { purgeAllOfflineStorage } from '../utils/offlineStorage';
import {
  isUserEmailVerified,
  resolveAccessState,
} from '../navigation/navigationRegistry';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function AuthInitializingShell() {
  return (
    <div
      className="hh-auth-loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: 'var(--bg-primary, #F7F6F2)',
        color: 'var(--text-main, #192820)',
        padding: '24px',
      }}
    >
      <i
        className="fas fa-spinner fa-spin"
        aria-hidden="true"
        style={{ fontSize: '1.6rem', color: 'var(--color-primary, #1D4435)' }}
      />
      <span style={{ fontSize: '0.95rem', fontWeight: 500, opacity: 0.8 }}>
        Verifica sessione in corso...
      </span>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userData, setUserDataState] = useState(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const lastUidRef = useRef(null);
  const authRequestIdRef = useRef(0);
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;

  const setUserData = useCallback((updater) => {
    authRequestIdRef.current += 1;
    setUserDataState(updater);
  }, []);

  const refreshUserData = useCallback(async (explicitUser) => {
    const targetUser =
      explicitUser !== undefined
        ? explicitUser
        : auth.currentUser || currentUserRef.current;

    if (!targetUser) {
      authRequestIdRef.current += 1;
      if (mountedRef.current) {
        setUserDataState(null);
      }
      return null;
    }

    const requestId = ++authRequestIdRef.current;
    try {
      const userDocRef = doc(db, 'utenti', targetUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!mountedRef.current || requestId !== authRequestIdRef.current) {
        return null;
      }
      const nextData = userDoc.exists() ? userDoc.data() : null;
      setUserDataState(nextData);
      return nextData;
    } catch (err) {
      console.error('Error refreshing user profile:', err);
      if (mountedRef.current && requestId === authRequestIdRef.current) {
        setUserDataState(null);
      }
      return null;
    }
  }, []);

  /**
   * Reloads Firebase Auth user state and forces an ID token refresh when verified
   * so Firestore rules immediately observe request.auth.token.email_verified == true.
   */
  const refreshAuthUser = useCallback(
    async ({ forceTokenRefresh = false } = {}) => {
      const targetUser = auth.currentUser || currentUserRef.current;
      if (!targetUser) {
        if (mountedRef.current) {
          setCurrentUser(null);
          setEmailVerified(false);
          setUserDataState(null);
        }
        return { verified: false, tokenVerified: false, user: null, userData: null };
      }

      if (typeof targetUser.reload === 'function') {
        await targetUser.reload();
      }

      const updatedUser = auth.currentUser || targetUser;
      const isVerified = isUserEmailVerified(updatedUser);
      let tokenVerified = isVerified;

      if (isVerified || forceTokenRefresh) {
        if (typeof updatedUser.getIdToken === 'function') {
          await updatedUser.getIdToken(true);
        }
        if (typeof updatedUser.getIdTokenResult === 'function') {
          let tokenResult = await updatedUser.getIdTokenResult(false);
          tokenVerified = tokenResult?.claims?.email_verified === true;
          if (isVerified && !tokenVerified && typeof updatedUser.getIdToken === 'function') {
            await updatedUser.getIdToken(true);
            tokenResult = await updatedUser.getIdTokenResult(false);
            tokenVerified = tokenResult?.claims?.email_verified === true;
          }
        }
      }

      const effectiveVerified = Boolean(isVerified && tokenVerified);
      let nextUserData = null;

      if (mountedRef.current) {
        currentUserRef.current = updatedUser;
        setCurrentUser(updatedUser);
        setEmailVerified(effectiveVerified);
      }

      if (effectiveVerified) {
        nextUserData = await refreshUserData(updatedUser);
      }

      return {
        verified: isVerified,
        tokenVerified: effectiveVerified,
        user: updatedUser,
        userData: nextUserData,
      };
    },
    [refreshUserData]
  );

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const requestId = ++authRequestIdRef.current;
      const nextUid = user ? user.uid : null;
      const prevUid = lastUidRef.current;
      lastUidRef.current = nextUid;

      if (prevUid && prevUid !== nextUid) {
        purgeAllOfflineStorage();
        setUserDataState(null);
      }

      currentUserRef.current = user;
      setCurrentUser(user);
      setEmailVerified(isUserEmailVerified(user));

      try {
        if (user) {
          // Fetch user document from firestore to get 'casaId' etc.
          const userDocRef = doc(db, 'utenti', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!mountedRef.current || requestId !== authRequestIdRef.current) {
            return;
          }
          if (userDoc.exists()) {
            setUserDataState(userDoc.data());
          } else {
            setUserDataState(null);
          }
        } else {
          if (!mountedRef.current || requestId !== authRequestIdRef.current) {
            return;
          }
          setUserDataState(null);
          purgeAllOfflineStorage();
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        if (mountedRef.current && requestId === authRequestIdRef.current) {
          setUserDataState(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const accessState = useMemo(
    () => resolveAccessState(currentUser, userData, emailVerified),
    [currentUser, userData, emailVerified]
  );

  const value = useMemo(
    () => ({
      currentUser,
      userData,
      loading,
      isEmailVerified: emailVerified,
      accessState,
      setUserData,
      refreshUserData,
      refreshAuthUser,
    }),
    [
      currentUser,
      userData,
      loading,
      emailVerified,
      accessState,
      setUserData,
      refreshUserData,
      refreshAuthUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? <AuthInitializingShell /> : children}
    </AuthContext.Provider>
  );
}
