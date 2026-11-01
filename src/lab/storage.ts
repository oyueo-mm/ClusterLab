/** Only small preferences live in localStorage. Original datasets use structured-clone IndexedDB. */
export function readPreference<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(`clusterlab:v1:${key}`);
    if (!text) return fallback;
    const value: unknown = JSON.parse(text);
    if (
      typeof value !== typeof fallback ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      return fallback;
    return value as T;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(`clusterlab:v1:${key}`, JSON.stringify(value));
  } catch {
    /* Preferences remain usable in memory. */
  }
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("clusterlab-labs", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("datasets");
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        database = undefined;
        reject(new Error("다른 탭의 데이터 저장소를 닫은 뒤 새로고침하세요."));
      };
    });
  return database;
}
export async function readDatasetState<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("datasets", "readonly");
    const request = transaction.objectStore("datasets").get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}
export async function writeDatasetState(key: string, value: unknown) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("datasets", "readwrite");
    transaction.objectStore("datasets").put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("데이터 저장이 취소되었습니다."));
  });
}
