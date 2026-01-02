export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PostcardBuilderDB', 2)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (e) => {
      const db = e.target.result

      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })
}

export async function saveImages(images) {
  const db = await openDB()
  const transaction = db.transaction(['images'], 'readwrite')
  const store = transaction.objectStore('images')

  await store.clear()

  for (const img of images) {
    await store.add({
      id: img.id,
      name: img.name,
      dataUrl: img.dataUrl
    })
  }
}

export async function getAllImages(db) {
  const transaction = db.transaction(['images'], 'readonly')
  const store = transaction.objectStore('images')

  return new Promise((resolve) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
  })
}

export async function saveSettings(settings) {
  const db = await openDB()
  const transaction = db.transaction(['settings'], 'readwrite')
  const store = transaction.objectStore('settings')

  await store.put({
    key: 'settings',
    value: settings
  })
}

export async function getSetting(db, key) {
  const transaction = db.transaction(['settings'], 'readonly')
  const store = transaction.objectStore('settings')

  return new Promise((resolve) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result?.value)
  })
}
