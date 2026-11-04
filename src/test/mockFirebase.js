/**
 * In-Memory Mock Harness for Firebase Auth & Cloud Firestore
 * Provides zero-credential, deterministic, isolated state for unit and E2E tests.
 */

class MockFirestoreStore {
  constructor() {
    this.collections = {
      utenti: {},
      case: {},
      turni: {},
      debiti: {},
      spesa: {},
      note: {},
      documenti: {},
      contatti: {}
    };
    this.storageFiles = {};
    this.currentMockUser = null;
    this.authListeners = [];
    this.autoIdCounter = 1;
  }

  reset() {
    this.collections = {
      utenti: {},
      case: {},
      turni: {},
      debiti: {},
      spesa: {},
      note: {},
      documenti: {},
      contatti: {}
    };
    this.storageFiles = {};
    this.currentMockUser = null;
    this.authListeners = [];
    this.autoIdCounter = 1;
  }

  // Pre-seed a collection with documents
  seed(collName, docs) {
    if (!this.collections[collName]) {
      this.collections[collName] = {};
    }
    if (Array.isArray(docs)) {
      docs.forEach((doc, idx) => {
        const id = doc.id || `seed_${collName}_${idx + 1}`;
        const data = { ...doc };
        delete data.id;
        this.collections[collName][id] = this._wrapTimestamps(data);
      });
    } else if (typeof docs === 'object') {
      Object.entries(docs).forEach(([id, data]) => {
        this.collections[collName][id] = this._wrapTimestamps({ ...data });
      });
    }
  }

  _wrapTimestamps(data) {
    if (!data || typeof data !== 'object') return data;
    const res = Array.isArray(data) ? [...data] : { ...data };
    for (const key of Object.keys(res)) {
      const val = res[key];
      if (val instanceof Date) {
        if (!val.toMillis) {
          val.toMillis = () => val.getTime();
        }
      } else if (val && typeof val === 'object') {
        res[key] = this._wrapTimestamps(val);
      }
    }
    return res;
  }

  getCollection(collName) {
    return this.collections[collName] || {};
  }

  getDocData(collName, id) {
    const coll = this.collections[collName];
    return coll && coll[id] ? { ...coll[id] } : undefined;
  }

  // Auth Helpers
  setMockUser(user) {
    this.currentMockUser = user ? { ...user } : null;
    this._notifyAuthListeners();
  }

  _notifyAuthListeners() {
    this.authListeners.forEach((listener) => {
      try {
        listener(this.currentMockUser ? { ...this.currentMockUser } : null);
      } catch (err) {
        console.error("Error in mock auth listener:", err);
      }
    });
  }

  // Firestore Document Operations
  async setDoc(collName, id, data, options = {}) {
    if (!this.collections[collName]) {
      this.collections[collName] = {};
    }
    const processed = this._wrapTimestamps(data);
    if (options.merge && this.collections[collName][id]) {
      this.collections[collName][id] = {
        ...this.collections[collName][id],
        ...processed
      };
    } else {
      this.collections[collName][id] = { ...processed };
    }
    return Promise.resolve();
  }

  async getDoc(collName, id) {
    const coll = this.collections[collName] || {};
    const data = coll[id];
    const exists = () => !!data;
    return Promise.resolve({
      id,
      exists,
      data: () => (data ? { ...data } : undefined)
    });
  }

  async addDoc(collName, data) {
    if (!this.collections[collName]) {
      this.collections[collName] = {};
    }
    const id = `mock_${collName}_${this.autoIdCounter++}_${Math.random().toString(36).substr(2, 6)}`;
    const processed = this._wrapTimestamps(data);
    this.collections[collName][id] = { ...processed };
    return Promise.resolve({ id, ...processed });
  }

  async updateDoc(collName, id, data) {
    if (!this.collections[collName] || !this.collections[collName][id]) {
      // Return or throw standard error if document does not exist
      return Promise.reject(new Error(`Document ${collName}/${id} does not exist.`));
    }
    const processed = this._wrapTimestamps(data);
    this.collections[collName][id] = {
      ...this.collections[collName][id],
      ...processed
    };
    return Promise.resolve();
  }

  async deleteDoc(collName, id) {
    if (this.collections[collName] && this.collections[collName][id]) {
      delete this.collections[collName][id];
    }
    return Promise.resolve();
  }

  async getDocs(collName, constraints = []) {
    const coll = this.collections[collName] || {};
    let items = Object.entries(coll).map(([id, d]) => ({ id, ...d }));

    // Apply where filters
    for (const c of constraints) {
      if (c && c._type === 'where') {
        const { field, op, val } = c;
        items = items.filter((item) => {
          const itemVal = item[field];
          switch (op) {
            case '==':
              return itemVal === val;
            case '!=':
              return itemVal !== val;
            case '>':
              return itemVal > val;
            case '>=':
              return itemVal >= val;
            case '<':
              return itemVal < val;
            case '<=':
              return itemVal <= val;
            case 'array-contains':
              return Array.isArray(itemVal) && itemVal.includes(val);
            case 'in':
              return Array.isArray(val) && val.includes(itemVal);
            default:
              return true;
          }
        });
      }
    }

    const docs = items.map((item) => {
      const dataObj = { ...item };
      const id = dataObj.id;
      delete dataObj.id;
      return {
        id,
        exists: () => true,
        data: () => ({ ...dataObj })
      };
    });

    return Promise.resolve({
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (callback) => docs.forEach(callback)
    });
  }
}

// Global Singleton Instance for Tests
export const mockStore = new MockFirestoreStore();

// Cloud Firestore Mock API
export const collection = (db, collName) => {
  return { _type: 'collection', path: collName };
};

export const doc = (dbOrColl, ...pathSegments) => {
  let collName = '';
  let docId = '';

  if (typeof dbOrColl === 'string') {
    collName = dbOrColl;
    docId = pathSegments[0];
  } else if (dbOrColl && dbOrColl._type === 'collection') {
    collName = dbOrColl.path;
    docId = pathSegments[0];
  } else {
    // dbOrColl is db instance
    collName = pathSegments[0];
    docId = pathSegments[1];
  }

  if (!docId) {
    docId = `mock_doc_${mockStore.autoIdCounter++}`;
  }

  return { _type: 'doc', coll: collName, id: docId };
};

export const where = (field, op, val) => {
  return { _type: 'where', field, op, val };
};

export const query = (collRef, ...constraints) => {
  return {
    _type: 'query',
    coll: collRef.path,
    constraints: constraints.filter(Boolean)
  };
};

export const getDoc = async (docRef) => {
  return mockStore.getDoc(docRef.coll, docRef.id);
};

export const getDocs = async (queryOrCollRef) => {
  const collName = queryOrCollRef.coll || queryOrCollRef.path;
  const constraints = queryOrCollRef.constraints || [];
  return mockStore.getDocs(collName, constraints);
};

export const setDoc = async (docRef, data, options) => {
  return mockStore.setDoc(docRef.coll, docRef.id, data, options);
};

export const addDoc = async (collRef, data) => {
  return mockStore.addDoc(collRef.path, data);
};

export const updateDoc = async (docRef, data) => {
  return mockStore.updateDoc(docRef.coll, docRef.id, data);
};

export const deleteDoc = async (docRef) => {
  return mockStore.deleteDoc(docRef.coll, docRef.id);
};

// Firebase Auth Mock API
export const getAuth = () => {
  return {
    currentUser: mockStore.currentMockUser
  };
};

export class GoogleAuthProvider {}

export const onAuthStateChanged = (auth, callback) => {
  mockStore.authListeners.push(callback);
  // Immediately call with current state
  try {
    callback(mockStore.currentMockUser ? { ...mockStore.currentMockUser } : null);
  } catch (err) {
    console.error("Error in onAuthStateChanged callback:", err);
  }
  return () => {
    const idx = mockStore.authListeners.indexOf(callback);
    if (idx !== -1) mockStore.authListeners.splice(idx, 1);
  };
};

export const signInWithEmailAndPassword = async (auth, email, password) => {
  const trimmed = (email || '').trim().toLowerCase();
  // Check if user exists in mock utenti
  const users = Object.entries(mockStore.collections.utenti);
  const found = users.find(([id, u]) => (u.email || '').toLowerCase() === trimmed);

  const uid = found ? found[0] : `user_${Math.random().toString(36).substr(2, 8)}`;
  const user = {
    uid,
    email: trimmed,
    displayName: found ? found[1].username : 'Test User'
  };

  mockStore.setMockUser(user);
  return { user };
};

export const createUserWithEmailAndPassword = async (auth, email, password) => {
  const trimmed = (email || '').trim().toLowerCase();
  const uid = `user_${Math.random().toString(36).substr(2, 8)}`;
  const user = {
    uid,
    email: trimmed,
    displayName: ''
  };

  mockStore.setMockUser(user);
  return { user };
};

export const signInWithPopup = async (auth, provider) => {
  const uid = `google_user_${Math.random().toString(36).substr(2, 8)}`;
  const user = {
    uid,
    email: 'google_user@test.com',
    displayName: 'Google Roommate'
  };
  mockStore.setMockUser(user);
  return { user };
};

export const signOut = async (auth) => {
  mockStore.setMockUser(null);
  return Promise.resolve();
};

export const getFirestore = () => ({ _isMockDb: true });

// Bundled modules for jest.mock()
export const firestoreMock = {
  collection,
  doc,
  where,
  query,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getFirestore
};

export const authMock = {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
};

export const appFirebaseMock = {
  auth: {
    get currentUser() {
      return mockStore.currentMockUser;
    }
  },
  db: { _isMockDb: true },
  storage: { _isMockStorage: true },
  googleProvider: new GoogleAuthProvider(),
  default: { name: '[DEFAULT]' }
};

// ============================================================================
// Firebase Storage In-Memory Mocks (Milestone M6)
// ============================================================================

export class MockStorageStore {
  constructor(store = mockStore) {
    this.store = store;
  }
  get files() {
    return this.store.storageFiles;
  }
  reset() {
    this.store.storageFiles = {};
  }
  upload(path, data, metadata = {}) {
    const size = data?.size !== undefined ? data.size : (data?.length || 0);
    const contentType = metadata?.contentType || data?.type || "application/octet-stream";
    this.store.storageFiles[path] = {
      data,
      size,
      contentType,
      metadata,
      uploadedAt: new Date().toISOString()
    };
    return { ref: ref(null, path) };
  }
  getDownloadURL(path) {
    return Promise.resolve(
      `https://firebasestorage.googleapis.com/v0/b/househelper-mock/o/${encodeURIComponent(path)}?alt=media&token=mock-token`
    );
  }
  delete(path) {
    delete this.store.storageFiles[path];
    return Promise.resolve();
  }
}

export const mockStorageStore = new MockStorageStore(mockStore);

export const getStorage = () => ({ _isMockStorage: true });

export const ref = (storageOrRef, path = "") => {
  let fullPath = "";
  if (storageOrRef && storageOrRef._type === "storageRef") {
    fullPath = storageOrRef.fullPath ? `${storageOrRef.fullPath}/${path}` : path;
  } else {
    fullPath = path || "";
  }
  fullPath = fullPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const name = fullPath.split("/").pop() || "";
  return {
    _type: "storageRef",
    fullPath,
    name,
    bucket: "househelper-12050.firebasestorage.app"
  };
};

export const uploadBytes = async (storageRef, data, metadata = {}) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  const size = data?.size !== undefined ? data.size : (data?.length || 0);
  const contentType = metadata?.contentType || data?.type || "application/octet-stream";
  mockStore.storageFiles[path] = {
    data,
    size,
    contentType,
    metadata,
    uploadedAt: new Date().toISOString()
  };
  return {
    ref: typeof storageRef === "object" ? storageRef : ref(null, path),
    metadata: {
      ...metadata,
      size,
      contentType,
      fullPath: path,
      name: path.split("/").pop()
    }
  };
};

export const uploadBytesResumable = (storageRef, data, metadata = {}) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  const size = data?.size !== undefined ? data.size : (data?.length || 0);
  const contentType = metadata?.contentType || data?.type || "application/octet-stream";
  mockStore.storageFiles[path] = {
    data,
    size,
    contentType,
    metadata,
    uploadedAt: new Date().toISOString()
  };
  const snapshotRef = typeof storageRef === "object" ? storageRef : ref(null, path);
  const snapshot = {
    ref: snapshotRef,
    bytesTransferred: size,
    totalBytes: size,
    state: "success",
    metadata: {
      ...metadata,
      size,
      contentType,
      fullPath: path,
      name: path.split("/").pop()
    }
  };

  return {
    snapshot,
    on: (event, progressCallback, errorCallback, completeCallback) => {
      if (typeof progressCallback === "function") {
        progressCallback({
          bytesTransferred: size,
          totalBytes: size
        });
      }
      if (typeof completeCallback === "function") {
        completeCallback();
      }
      return () => {};
    },
    then: (onResolved, onRejected) => Promise.resolve(snapshot).then(onResolved, onRejected),
    catch: (onRejected) => Promise.resolve(snapshot).catch(onRejected)
  };
};

export const getDownloadURL = async (storageRef) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  return `https://firebasestorage.googleapis.com/v0/b/househelper-mock/o/${encodeURIComponent(path)}?alt=media&token=mock-token`;
};

export const deleteObject = async (storageRef) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  delete mockStore.storageFiles[path];
  return Promise.resolve();
};

export const listAll = async (storageRef) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  const prefix = path ? `${path}/` : "";
  const items = Object.keys(mockStore.storageFiles)
    .filter((k) => k.startsWith(prefix))
    .map((k) => ref(null, k));
  return { items, prefixes: [] };
};

export const getMetadata = async (storageRef) => {
  const path = typeof storageRef === "string" ? storageRef : storageRef.fullPath;
  const item = mockStore.storageFiles[path];
  return item ? (item.metadata || {}) : {};
};

export const storageMock = {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};

export default mockStore;
