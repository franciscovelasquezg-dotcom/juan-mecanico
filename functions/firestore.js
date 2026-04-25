/**
 * FIRESTORE.JS — Operaciones CRUD con Firestore
 */

const { Firestore } = require('@google-cloud/firestore');

let db = null;

/**
 * Obtener instancia de Firestore (singleton)
 */
function getFirestore() {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
  }
  return db;
}

/**
 * Guardar evento en historial
 */
async function saveHistorial(vehiculoId, evento) {
  try {
    const db = getFirestore();
    const docRef = await db
      .collection('historial')
      .doc(vehiculoId)
      .collection('eventos')
      .add({
        ...evento,
        fecha: new Date(),
      });

    console.log('[FIRESTORE] Evento guardado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIRESTORE] Error saving historial:', error.message);
    throw error;
  }
}

/**
 * Guardar falla activa
 */
async function saveFalla(vehiculoId, falla) {
  try {
    const db = getFirestore();
    const docRef = await db
      .collection('fallas')
      .doc(vehiculoId)
      .collection('activas')
      .add({
        ...falla,
        fecha: new Date(),
        resuelta: false,
      });

    console.log('[FIRESTORE] Falla guardada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[FIRESTORE] Error saving falla:', error.message);
    throw error;
  }
}

/**
 * Obtener fallas activas del vehículo
 */
async function getFallasActivas(vehiculoId) {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('fallas')
      .doc(vehiculoId)
      .collection('activas')
      .where('resuelta', '==', false)
      .get();

    const fallas = [];
    snapshot.forEach((doc) => {
      fallas.push({ id: doc.id, ...doc.data() });
    });

    console.log(`[FIRESTORE] ${fallas.length} fallas activas encontradas`);
    return fallas;
  } catch (error) {
    console.error('[FIRESTORE] Error getting fallas:', error.message);
    return [];
  }
}

/**
 * Actualizar km actual del vehículo
 */
async function updateKmVehiculo(vehiculoId, kmActual) {
  try {
    const db = getFirestore();
    await db
      .collection('vehiculos')
      .doc(vehiculoId)
      .update({
        kmActual,
        ultimoKmEn: new Date(),
      });

    console.log('[FIRESTORE] KM actualizado:', kmActual);
  } catch (error) {
    console.error('[FIRESTORE] Error updating km:', error.message);
    throw error;
  }
}

module.exports = {
  getFirestore,
  saveHistorial,
  saveFalla,
  getFallasActivas,
  updateKmVehiculo,
};
