import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import {
  fetchHouseholdData,
  isUserHouseAdmin,
  acceptHouseholdMember,
  kickHouseholdMember,
  transferHouseholdAdmin,
  createHousehold,
  joinHousehold,
  leaveHousehold,
  deleteHousehold,
  updateRoommateVacation,
} from "../services/householdService";
import {
  getHouseholdSnapshot,
  saveHouseholdSnapshot,
  purgeTenantStorage,
} from "../utils/offlineStorage";

const defaultHouseholdContext = {
  house: null,
  roommates: [],
  roommateMap: {},
  loading: false,
  isAdmin: false,
  adminUid: null,
  acceptMember: async () => {},
  kickMember: async () => {},
  transferAdminRole: async () => {},
  refreshHousehold: async () => ({ house: null, roommates: [], roommateMap: {} }),
  createHouse: async () => null,
  joinHouse: async () => null,
  leaveHouse: async () => {},
  deleteHouse: async () => {},
  updateVacation: async () => {},
};

const HouseholdContext = createContext(defaultHouseholdContext);

export function useHousehold() {
  return useContext(HouseholdContext) || defaultHouseholdContext;
}

function buildRoommateMap(roommates, fallbackUsername) {
  const map = {};
  if (!Array.isArray(roommates)) return map;
  roommates.forEach((r) => {
    if (!r) return;
    const uid = r.uid || r.id;
    if (uid) {
      map[uid] = r.username || fallbackUsername;
    }
  });
  return map;
}

/**
 * Deep Household module provider: memoizes active Household, Roommates, and lookup map
 * per casaId, and centralizes create/join/leave/vacation mutations.
 */
export function HouseholdProvider({ children }) {
  const { currentUser, userData, setUserData } = useAuth();
  const { t } = useLanguage();
  const currentUid = currentUser?.uid || null;
  const casaId = userData?.casaId || null;

  const [house, setHouse] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [roommateMap, setRoommateMap] = useState({});
  const [loading, setLoading] = useState(false);

  const membershipRef = useRef(null);
  membershipRef.current = { house, roommates, currentUid, casaId };

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastCasaIdRef = useRef(casaId);
  const skipLoadCasaIdRef = useRef(null);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadHousehold = useCallback(
    async (targetCasaId = casaId) => {
      const requestId = ++requestIdRef.current;

      if (!targetCasaId) {
        if (mountedRef.current) {
          setHouse(null);
          setRoommates([]);
          setRoommateMap({});
          setLoading(false);
        }
        return { house: null, roommates: [], roommateMap: {}, cancelled: !mountedRef.current };
      }

      if (mountedRef.current) {
        setLoading(true);
      }

      const fallback = tRef.current("dashboard.roommateFallback", {}, "Coinquilino");

      try {
        const result = await fetchHouseholdData(targetCasaId, fallback);
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return { house: null, roommates: [], roommateMap: {}, cancelled: true };
        }
        setHouse(result.house);
        setRoommates(result.roommates);
        setRoommateMap(result.roommateMap);
        if (result.house) {
          saveHouseholdSnapshot(targetCasaId, {
            ...result.house,
            memberCount: result.roommates.length || 1,
            roommates: result.roommates,
            roommateMap: result.roommateMap,
          });
        }
        return { ...result, cancelled: false };
      } catch (err) {
        console.warn("Could not load household data:", err);
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return { house: null, roommates: [], roommateMap: {}, cancelled: true };
        }

        const cached = getHouseholdSnapshot(targetCasaId);
        if (cached && typeof cached === "object") {
          let cachedHouse = null;
          if (cached.house && typeof cached.house === "object") {
            cachedHouse = cached.house;
          } else {
            const {
              roommates: _ignoredRoommates,
              roommateMap: _ignoredMap,
              memberCount: _ignoredCount,
              ...houseFields
            } = cached;
            if (Object.keys(houseFields).length > 0) {
              cachedHouse = { id: targetCasaId, ...houseFields };
            }
          }
          const cachedRoommates = Array.isArray(cached.roommates) ? cached.roommates : [];
          const cachedRoommateMap =
            cached.roommateMap &&
            typeof cached.roommateMap === "object" &&
            !Array.isArray(cached.roommateMap)
              ? cached.roommateMap
              : buildRoommateMap(cachedRoommates, fallback);

          setHouse(cachedHouse);
          setRoommates(cachedRoommates);
          setRoommateMap(cachedRoommateMap);
          return {
            house: cachedHouse,
            roommates: cachedRoommates,
            roommateMap: cachedRoommateMap,
            cancelled: false,
          };
        }

        setHouse(null);
        setRoommates([]);
        setRoommateMap({});
        return { house: null, roommates: [], roommateMap: {}, cancelled: false };
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [casaId]
  );

  useEffect(() => {
    const prevCasaId = lastCasaIdRef.current;
    if (prevCasaId && prevCasaId !== casaId) {
      purgeTenantStorage(prevCasaId);
      setHouse(null);
      setRoommates([]);
      setRoommateMap({});
    }
    lastCasaIdRef.current = casaId;

    if (!currentUid || !casaId) {
      requestIdRef.current += 1;
      skipLoadCasaIdRef.current = null;
      setHouse(null);
      setRoommates([]);
      setRoommateMap({});
      setLoading(false);
      return;
    }

    if (skipLoadCasaIdRef.current === casaId) {
      skipLoadCasaIdRef.current = null;
      return;
    }

    loadHousehold(casaId);
  }, [currentUid, casaId, loadHousehold]);

  const createHouse = useCallback(
    async (name) => {
      if (!currentUser) return null;
      const previousCasaId = casaId;
      const entryRequestId = requestIdRef.current;
      const result = await createHousehold({ name, creatorUid: currentUser.uid });
      if (!mountedRef.current || requestIdRef.current !== entryRequestId) {
        return null;
      }
      const newCasaId = result.house.id;

      requestIdRef.current += 1;
      if (previousCasaId && previousCasaId !== newCasaId) {
        purgeTenantStorage(previousCasaId);
      }
      lastCasaIdRef.current = newCasaId;

      const fallback = tRef.current("dashboard.roommateFallback", {}, "Coinquilino");
      const creatorName = userData?.username || currentUser.displayName || fallback;
      const membership = { casaId: newCasaId, ruoloCasa: "admin", statoMembro: "active" };
      const selfProfile = {
        ...(userData || {}),
        uid: currentUser.uid,
        id: currentUser.uid,
        username: creatorName,
        email: userData?.email || currentUser.email || "",
        ...membership,
      };
      const initialRoommates = [selfProfile];
      const initialRoommateMap = { [currentUser.uid]: creatorName };

      setHouse(result.house);
      setRoommates(initialRoommates);
      setRoommateMap(initialRoommateMap);
      setLoading(false);

      saveHouseholdSnapshot(newCasaId, {
        ...result.house,
        memberCount: 1,
        roommates: initialRoommates,
        roommateMap: initialRoommateMap,
      });

      if (userData?.username) {
        skipLoadCasaIdRef.current = newCasaId;
      }
      setUserData((prev) => ({ ...(prev || {}), ...membership }));
      return result;
    },
    [currentUser, userData, casaId, setUserData]
  );

  const joinHouse = useCallback(
    async (code) => {
      if (!currentUser) return null;
      const previousCasaId = casaId;
      const entryRequestId = requestIdRef.current;
      const result = await joinHousehold({ code, userUid: currentUser.uid });
      if (!result || !mountedRef.current || requestIdRef.current !== entryRequestId) {
        return null;
      }

      const newCasaId = result.house.id;
      if (previousCasaId && previousCasaId !== newCasaId) {
        purgeTenantStorage(previousCasaId);
      }
      lastCasaIdRef.current = newCasaId;

      const fallback = tRef.current("dashboard.roommateFallback", {}, "Coinquilino");
      const selfName = userData?.username || currentUser.displayName || fallback;
      const membership = { casaId: newCasaId, ruoloCasa: "member", statoMembro: "pending" };
      const selfProfile = {
        ...(userData || {}),
        uid: currentUser.uid,
        id: currentUser.uid,
        username: selfName,
        email: userData?.email || currentUser.email || "",
        ...membership,
      };

      setHouse(result.house);
      setRoommates([selfProfile]);
      setRoommateMap({ [currentUser.uid]: selfName });

      skipLoadCasaIdRef.current = newCasaId;
      setUserData((prev) => ({ ...(prev || {}), ...membership }));

      const hydrated = await loadHousehold(newCasaId);
      if (!mountedRef.current || hydrated?.cancelled || lastCasaIdRef.current !== newCasaId) {
        return null;
      }

      if (!hydrated.house) {
        setHouse(result.house);
      }
      if (!hydrated.roommates || hydrated.roommates.length === 0) {
        const fallbackRoommates = [selfProfile];
        const fallbackMap = { [currentUser.uid]: selfName };
        setRoommates(fallbackRoommates);
        setRoommateMap(fallbackMap);
        saveHouseholdSnapshot(newCasaId, {
          ...(hydrated.house || result.house),
          memberCount: 1,
          roommates: fallbackRoommates,
          roommateMap: fallbackMap,
        });
      }

      return result;
    },
    [currentUser, userData, casaId, setUserData, loadHousehold]
  );

  const leaveHouse = useCallback(async () => {
    if (!currentUser) return;
    const previousCasaId = casaId || lastCasaIdRef.current;
    requestIdRef.current += 1;
    skipLoadCasaIdRef.current = null;
    const current = membershipRef.current;
    if (previousCasaId && current?.house && current.house.id === previousCasaId
      && isUserHouseAdmin(current.house, currentUser.uid)) {
      const otherMembers = (current.roommates || []).filter((m) => (m.uid || m.id) && (m.uid || m.id) !== currentUser.uid);
      if (otherMembers.length > 0) {
        const successor = otherMembers.find((m) => m.statoMembro !== "pending") || otherMembers[0];
        const successorUid = successor.uid || successor.id;
        if (successorUid) {
          await transferHouseholdAdmin({
            casaId: previousCasaId,
            currentAdminUid: currentUser.uid,
            newAdminUid: successorUid,
          });
        }
      }
    }
    await leaveHousehold(currentUser.uid);
    if (previousCasaId) {
      purgeTenantStorage(previousCasaId);
    }
    lastCasaIdRef.current = null;
    setUserData((prev) => (prev ? { ...prev, casaId: null, ruoloCasa: null, statoMembro: null } : null));
    if (mountedRef.current) {
      setHouse(null);
      setRoommates([]);
      setRoommateMap({});
      setLoading(false);
    }
  }, [currentUser, casaId, setUserData]);

  const deleteHouse = useCallback(async () => {
    if (!currentUser) return;
    const targetCasaId = casaId || lastCasaIdRef.current;
    if (!targetCasaId) return;
    requestIdRef.current += 1;
    skipLoadCasaIdRef.current = null;
    await deleteHousehold({ casaId: targetCasaId, adminUid: currentUser.uid });
    purgeTenantStorage(targetCasaId);
    lastCasaIdRef.current = null;
    setUserData((prev) => (prev ? { ...prev, casaId: null, ruoloCasa: null, statoMembro: null } : null));
    if (mountedRef.current) {
      setHouse(null);
      setRoommates([]);
      setRoommateMap({});
      setLoading(false);
    }
  }, [currentUser, casaId, setUserData]);

  const updateVacation = useCallback(
    async (vacation) => {
      if (!currentUser) return;
      await updateRoommateVacation(currentUser.uid, vacation);
      setUserData((prev) =>
        prev
          ? {
              ...prev,
              inVacanza: Boolean(vacation.inVacanza),
              vacanzaInizio: vacation.inVacanza ? (vacation.vacanzaInizio || null) : null,
              vacanzaFine: vacation.inVacanza ? (vacation.vacanzaFine || null) : null,
            }
          : prev
      );
      setRoommates((prev) =>
        prev.map((r) =>
          r.uid === currentUser.uid
            ? {
                ...r,
                inVacanza: Boolean(vacation.inVacanza),
                vacanzaInizio: vacation.inVacanza ? (vacation.vacanzaInizio || null) : null,
                vacanzaFine: vacation.inVacanza ? (vacation.vacanzaFine || null) : null,
              }
            : r
        )
      );
    },
    [currentUser, setUserData]
  );

  const adminUid = house?.adminUid || house?.creatoreId || null;
  const isAdmin = isUserHouseAdmin(house, currentUid);

  const updateMembership = useCallback(async (targetUid, persist, apply) => {
    const current = membershipRef.current;
    if (current.house?.id !== casaId || current.casaId !== casaId
      || !isUserHouseAdmin(current.house, currentUid)
      || !current.roommates.some((member) => (member.uid || member.id) === targetUid)) {
      throw new Error("Household admin and a member of the same household are required.");
    }

    await persist();
    const latest = membershipRef.current;
    if (!mountedRef.current || latest.currentUid !== currentUid || latest.casaId !== casaId
      || latest.house?.id !== casaId || lastCasaIdRef.current !== casaId) {
      return;
    }

    const next = apply(latest);
    const fallback = tRef.current("dashboard.roommateFallback", {}, "Coinquilino");
    const nextMap = buildRoommateMap(next.roommates, fallback);
    membershipRef.current = { ...latest, ...next };
    requestIdRef.current += 1;
    setHouse(next.house);
    setRoommates(next.roommates);
    setRoommateMap(nextMap);
    setLoading(false);
    saveHouseholdSnapshot(casaId, {
      ...next.house,
      memberCount: next.roommates.length || 1,
      roommates: next.roommates,
      roommateMap: nextMap,
    });
  }, [casaId, currentUid]);

  const acceptMember = useCallback((targetUid) => updateMembership(
    targetUid,
    () => acceptHouseholdMember({ casaId, adminUid: currentUid, targetUid }),
    (latest) => ({
      house: latest.house,
      roommates: latest.roommates.map((member) => (member.uid || member.id) === targetUid
        ? { ...member, statoMembro: "active", ruoloCasa: "member" }
        : member),
    })
  ), [casaId, currentUid, updateMembership]);

  const kickMember = useCallback((targetUid) => updateMembership(
    targetUid,
    () => kickHouseholdMember({ casaId, adminUid: currentUid, targetUid }),
    (latest) => ({
      house: latest.house,
      roommates: latest.roommates.filter((member) => (member.uid || member.id) !== targetUid),
    })
  ), [casaId, currentUid, updateMembership]);

  const transferAdminRole = useCallback((newAdminUid) => updateMembership(
    newAdminUid,
    () => transferHouseholdAdmin({ casaId, currentAdminUid: currentUid, newAdminUid }),
    (latest) => {
      setUserData((prev) => prev?.casaId === casaId ? { ...prev, ruoloCasa: "member" } : prev);
      return {
        house: { ...latest.house, adminUid: newAdminUid, creatoreId: newAdminUid },
        roommates: latest.roommates.map((member) => {
          const uid = member.uid || member.id;
          if (uid === newAdminUid) return { ...member, ruoloCasa: "admin", statoMembro: "active" };
          if (uid === currentUid) return { ...member, ruoloCasa: "member" };
          return member;
        }),
      };
    }
  ), [casaId, currentUid, setUserData, updateMembership]);

  const value = useMemo(
    () => ({
      house,
      roommates,
      roommateMap,
      loading,
      isAdmin,
      adminUid,
      acceptMember,
      kickMember,
      transferAdminRole,
      refreshHousehold: loadHousehold,
      createHouse,
      joinHouse,
      leaveHouse,
      deleteHouse,
      updateVacation,
    }),
    [
      house, roommates, roommateMap, loading, isAdmin, adminUid, acceptMember, kickMember,
      transferAdminRole, loadHousehold, createHouse, joinHouse, leaveHouse, deleteHouse, updateVacation,
    ]
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}
