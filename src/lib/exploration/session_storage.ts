let database: Promise<IDBDatabase> | null = null;

function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Este navegador no permite guardar la sesión local.')); return; }
    let blocked = false;
    const request = indexedDB.open('symbiolab', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('sessions')) request.result.createObjectStore('sessions'); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Otra pestaña impide abrir el guardado local. Cierra las otras pestañas y recarga.')); };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); database = null; };
      resolve(db);
    };
  }).catch(error => { database = null; throw error; });
  return database;
}

export async function loadSession(): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const request = tx.objectStore('sessions').get('exploration');
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo leer la sesión local.'));
  });
}

export async function saveSession(session: unknown) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session, 'exploration');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo guardar la sesión local. Exporta tu cuaderno para conservarlo.'));
  });
}
