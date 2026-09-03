import { enviarAbastecimentos } from './api.js';

const DB_NAME = 'biomassa-abastecimento';
const STORE_NAME = 'fila';

function openDb() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function () {
      var db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'ID' });
      }
    };
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

async function withStore(mode, callback) {
  var db = await openDb();
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(STORE_NAME, mode);
    var store = tx.objectStore(STORE_NAME);
    var result = callback(store);
    tx.oncomplete = function () { resolve(result); };
    tx.onerror = function () { reject(tx.error); };
  });
}

export async function enqueue(record) {
  await withStore('readwrite', function (store) {
    store.put(record);
  });
}

export async function listPending() {
  var db = await openDb();
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(STORE_NAME, 'readonly');
    var store = tx.objectStore(STORE_NAME);
    var request = store.getAll();
    request.onsuccess = function () { resolve(request.result); };
    request.onerror = function () { reject(request.error); };
  });
}

async function remove(id) {
  await withStore('readwrite', function (store) {
    store.delete(id);
  });
}

let syncing = false;

export async function trySync() {
  if (syncing) return { salvos: 0, restantes: (await listPending()).length };
  syncing = true;
  try {
    var pendentes = await listPending();
    if (pendentes.length === 0) return { salvos: 0, restantes: 0 };

    var resultado = await enviarAbastecimentos(pendentes);
    for (var i = 0; i < pendentes.length; i++) {
      await remove(pendentes[i].ID);
    }
    return { salvos: resultado.salvos, restantes: 0 };
  } catch (err) {
    var restantes = (await listPending()).length;
    return { salvos: 0, restantes: restantes, erro: err.message };
  } finally {
    syncing = false;
  }
}
