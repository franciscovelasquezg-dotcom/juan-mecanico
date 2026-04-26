/**
 * VALIDACION.JS — Validar que conductor está registrado y activo
 */

const { getFirestore } = require('./firestore');

// MODO TEST — conductores hardcodeados mientras se configura Firestore
const CONDUCTORES_TEST = {
  '7089130086': {
    nombre: 'Francisco',
    empresaId: 'empresa-test',
    vehiculoId: 'vehiculo-test',
    activo: true,
  },
};
const VEHICULOS_TEST = {
  'vehiculo-test': {
    id: 'vehiculo-test',
    patente: 'ABC-123',
    marca: 'Mercedes-Benz',
    modelo: 'Actros',
    ano: 2020,
    kmActual: 150000,
  },
};
const EMPRESAS_TEST = {
  'empresa-test': { id: 'empresa-test', nombre: 'Transportes Test' },
};

async function validarConductor(telefono) {
  // ── Modo test: responder sin Firestore ────────────────────────
  if (CONDUCTORES_TEST[telefono]) {
    const conductor = CONDUCTORES_TEST[telefono];
    return {
      valido: true,
      conductor: { id: telefono, ...conductor },
      vehiculo: VEHICULOS_TEST[conductor.vehiculoId] || null,
      empresa: EMPRESAS_TEST[conductor.empresaId] || null,
    };
  }

  // ── Modo producción: Firestore ────────────────────────────────
  try {
    const db = getFirestore();

    const conductorSnap = await db.collection('conductores').doc(telefono).get();
    if (!conductorSnap.exists) {
      console.log('[VALIDACION] Conductor no existe:', telefono);
      return { valido: false, conductor: null };
    }

    const conductor = conductorSnap.data();
    if (!conductor.activo) {
      return { valido: false, conductor: null };
    }

    let vehiculo = null;
    if (conductor.vehiculoId) {
      const v = await db.collection('vehiculos').doc(conductor.vehiculoId).get();
      if (v.exists) vehiculo = v.data();
    }

    let empresa = null;
    if (conductor.empresaId) {
      const e = await db.collection('empresas').doc(conductor.empresaId).get();
      if (e.exists) empresa = e.data();
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

module.exports = { validarConductor };
