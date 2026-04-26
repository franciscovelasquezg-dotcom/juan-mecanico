/**
 * SETUP TEST DATA — Carga conductor y vehículo de prueba en Firestore
 * Correr UNA VEZ: node functions/setup-test-data.js
 */

require('dotenv').config({ path: '../.env' });
const { getFirestore } = require('./firestore');

// El chatId de Telegram de Francisco (se obtiene al primer mensaje al bot)
// Por ahora usamos un placeholder, el bot lo mostrará al primer mensaje rechazado
const TELEGRAM_CHAT_ID_FRANCISCO = 'REEMPLAZAR_CON_TU_CHAT_ID';

async function setup() {
  console.log('\n🔧 Cargando datos de prueba en Firestore...\n');

  const db = getFirestore();

  // 1. Empresa de prueba
  await db.collection('empresas').doc('empresa-test').set({
    nombre: 'Transportes Test',
    rut: '12345678-9',
    activa: true,
    creadoEn: new Date(),
  });
  console.log('✅ Empresa creada: Transportes Test');

  // 2. Vehículo de prueba
  await db.collection('vehiculos').doc('vehiculo-test').set({
    patente: 'ABC-123',
    marca: 'Mercedes-Benz',
    modelo: 'Actros',
    ano: 2020,
    empresaId: 'empresa-test',
    kmActual: 150000,
    activo: true,
    creadoEn: new Date(),
  });
  console.log('✅ Vehículo creado: ABC-123 (Mercedes Actros 2020)');

  // 3. Conductor de prueba (usando el chatId de Telegram como ID)
  const conductorId = TELEGRAM_CHAT_ID_FRANCISCO;
  await db.collection('conductores').doc(conductorId).set({
    nombre: 'Francisco (Test)',
    telefono: conductorId,
    empresaId: 'empresa-test',
    vehiculoId: 'vehiculo-test',
    activo: true,
    creadoEn: new Date(),
  });
  console.log(`✅ Conductor creado con ID: ${conductorId}`);

  console.log('\n🎉 Datos de prueba listos. Puedes iniciar el bot con:');
  console.log('   node functions/bot.js\n');

  process.exit(0);
}

setup().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
