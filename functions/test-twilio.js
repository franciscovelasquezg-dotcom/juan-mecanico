/**
 * TEST TWILIO — Verificar que credenciales funcionan
 */

require('dotenv').config({ path: '../.env' });
const twilio = require('twilio');

async function test() {
  console.log('\n🧪 TEST TWILIO — Verificar Autenticación\n');

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  console.log(`Account SID: ${accountSid.substring(0, 10)}...`);
  console.log(`Auth Token: ${authToken.substring(0, 10)}...`);
  console.log(`WhatsApp Number: ${whatsappNumber}\n`);

  try {
    const client = twilio(accountSid, authToken);

    // Intentar obtener info de la cuenta
    const account = await client.api.accounts(accountSid).fetch();

    console.log('✅ AUTENTICACIÓN EXITOSA');
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Account Type: ${account.type}`);
    console.log(`   Friendly Name: ${account.friendlyName}`);

  } catch (error) {
    console.log('❌ AUTENTICACIÓN FALLIDA');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code || 'N/A'}`);
    console.log(`   Status: ${error.status || 'N/A'}`);
  }

  console.log('\n');
}

test().catch(console.error);
