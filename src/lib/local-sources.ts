// Browser file handles are stored on this device, never in localStorage or on a server.
const DATABASE = 'dev-project-unifier-local-sources';
const STORE = 'handles';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function accessHandles<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void) => void): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    let result: T;
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
    transaction.onabort = () => { database.close(); reject(transaction.error); };
    action(transaction.objectStore(STORE), value => { result = value; });
  });
}

export function saveSourceHandles(id: string, handles: FileSystemHandle[]): Promise<void> {
  return accessHandles<void>('readwrite', (store, resolve) => {
    const request = store.put(handles, id);
    request.onsuccess = () => resolve();
  });
}

export function loadSourceHandles(id: string): Promise<FileSystemHandle[] | undefined> {
  return accessHandles<FileSystemHandle[] | undefined>('readonly', (store, resolve) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as FileSystemHandle[] | undefined);
  });
}

export function deleteSourceHandles(id: string): Promise<void> {
  return accessHandles<void>('readwrite', (store, resolve) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
  });
}

export async function requestSourcePermission(handle: FileSystemHandle): Promise<boolean> {
  const permitted = handle as FileSystemHandle & {
    queryPermission(options: { mode: 'read' }): Promise<PermissionState>;
    requestPermission(options: { mode: 'read' }): Promise<PermissionState>;
  };
  if (await permitted.queryPermission({ mode: 'read' }) === 'granted') return true;
  return await permitted.requestPermission({ mode: 'read' }) === 'granted';
}
