/**
 * WHATSAPP.JS — Envío y recepción de mensajes vía Twilio
 */

require('dotenv').config({ path: '../.env' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken) {
  console.error('[TWILIO] Error: TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están configurados');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

/**
 * Enviar mensaje a través de Twilio WhatsApp
 * @param {string} telefono - Número en formato E.164 (+56912345678)
 * @param {string} texto - Contenido del mensaje
 * @returns {Promise<string>} SID del mensaje
 */
async function sendMessage(telefono, texto) {
  try {
    const msg = await client.messages.create({
      body: texto,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${telefono}`,
    });

    console.log(`[TWILIO] Mensaje enviado. SID: ${msg.sid}`);
    return msg.sid;
  } catch (error) {
    console.error('[TWILIO] Error enviando mensaje:', error.message);
    throw error;
  }
}

/**
 * Manejar mensaje WhatsApp (wrapper principal)
 */
async function handleWhatsAppMessage(telefono, respuesta) {
  return sendMessage(telefono, respuesta);
}

module.exports = {
  sendMessage,
  handleWhatsAppMessage,
};
