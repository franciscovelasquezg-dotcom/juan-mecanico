/**
 * TEST LOCAL — Validar pipeline sin dependencias externas
 */

require('dotenv').config({ path: '../.env' });

const { detectarIntencion } = require('./intencion');

async function test() {
  console.log('\n🧪 TEST LOCAL — Clasificación de Intención\n');

  const tests = [
    { msg: 'Se prendi ó la luz roja del motor', expected: 'TESTIGO' },
    { msg: 'Se rompi ó el motor', expected: 'AVERIA' },
    { msg: 'Salí 150000', expected: 'KM_SALIDA' },
    { msg: 'Llegué 151000', expected: 'KM_LLEGADA' },
    { msg: 'Hola', expected: 'OTRO' },
  ];

  for (const test of tests) {
    try {
      const resultado = await detectarIntencion(test.msg);
      const status = resultado === test.expected ? '✅' : '❌';
      console.log(`${status} "${test.msg}" → ${resultado} (esperado: ${test.expected})`);
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n✅ Tests completados\n');
}

test().catch(console.error);
