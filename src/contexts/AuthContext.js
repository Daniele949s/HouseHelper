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

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
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

  const value = useMemo(
    () => ({
      currentUser,
      userData,
      setUserData,
      refreshUserData,
    }),
    [currentUser, userData, setUserData, refreshUserData]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
