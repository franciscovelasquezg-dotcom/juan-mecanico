/**
 * VALIDACION.JS — Validar que conductor está registrado y activo
 */

const { getFirestore } = require('./firestore');

/**
 * Validar conductor en Firestore
 * @param {string} telefono - Número en formato E.164
 * @returns {Promise<Object>} { valido, conductor, vehiculo, empresa }
 */
async function validarConductor(telefono) {
  try {
    const db = getFirestore();

    // 1. Buscar conductor
    const conductorSnap = await db.collection('conductores').doc(telefono).get();

    if (!conductorSnap.exists) {
      console.log('[VALIDACION] Conductor no existe:', telefono);
      return { valido: false, conductor: null };
    }

    const conductor = conductorSnap.data();

    // 2. Verificar que está activo
    if (!conductor.activo) {
      console.log('[VALIDACION] Conductor inactivo:', telefono);
      return { valido: false, conductor: null };
    }

    // 3. Obtener vehículo asignado
    let vehiculo = null;
    if (conductor.vehiculoId) {
      const vehiculoSnap = await db
        .collection('vehiculos')
        .doc(conductor.vehiculoId)
        .get();

      if (vehiculoSnap.exists) {
        vehiculo = vehiculoSnap.data();
      }
    }

    // 4. Obtener empresa
    let empresa = null;
    if (conductor.empresaId) {
      const empresaSnap = await db
        .collection('empresas')
        .doc(conductor.empresaId)
        .get();

      if (empresaSnap.exists) {
        empresa = empresaSnap.data();
      }
    }

    return {
      valido: true,
      conductor: { id: telefono, ...conductor },
      vehiculo,
      empresa,
    };
  } catch (error) {
    console.error('[VALIDACION] Error:', error.message);
    return { valido: false, conductor: null };
  }
}

module.exports = {
  validarConductor,
};
