const DB_NAME = 'docscanner-db'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('theme')) {
        db.createObjectStore('theme', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error('Transaction aborted'))
  })
}

export async function readAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    const result = await new Promise<T[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })

    db.close()
    return result
  } catch {
    return []
  }
}

export async function writeAllToStore<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDb()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)

  store.clear()
  items.forEach((item) => store.put(item))

  await transactionPromise(transaction)
  db.close()
}

export async function readSingleFromStore<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    const result = await new Promise<T | null>((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result as T | null)
      request.onerror = () => reject(request.error)
    })

    db.close()
    return result
  } catch {
    return null
  }
}

export async function writeSingleToStore<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)
  store.put({ id: key, value })

  await transactionPromise(transaction)
  db.close()
}
