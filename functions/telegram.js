/**
 * JUAN MECÁNICO — Capa de mensajería Telegram
 * Reemplaza whatsapp.js — misma interfaz, diferente canal
 */

require('dotenv').config({ path: '../.env' });
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Instancia del bot (polling=false porque usamos webhook)
let bot;

function getBot() {
  if (!bot) {
    bot = new TelegramBot(TOKEN);
  }
  return bot;
}

/**
 * Enviar mensaje de texto a un chat de Telegram
 * @param {string|number} chatId - ID del chat (equivale al "telefono" en WhatsApp)
 * @param {string} mensaje - Texto a enviar
 */
async function sendMessage(chatId, mensaje) {
  const client = getBot();
  try {
    await client.sendMessage(chatId, mensaje, { parse_mode: 'Markdown' });
    console.log(`[TELEGRAM] ✅ Mensaje enviado a chatId: ${chatId}`);
  } catch (error) {
    console.error(`[TELEGRAM] ❌ Error enviando a ${chatId}:`, error.message);
    // Reintentar sin Markdown si falla (caracteres especiales)
    try {
      await client.sendMessage(chatId, mensaje);
    } catch (err2) {
      console.error('[TELEGRAM] Error en reintento:', err2.message);
      throw err2;
    }
  }
}

/**
 * Enviar foto a un chat de Telegram
 * @param {string|number} chatId
 * @param {string} fotoUrl - URL de la imagen
 * @param {string} caption - Texto acompañante
 */
async function sendPhoto(chatId, fotoUrl, caption = '') {
  const client = getBot();
  try {
    await client.sendPhoto(chatId, fotoUrl, { caption });
    console.log(`[TELEGRAM] ✅ Foto enviada a chatId: ${chatId}`);
  } catch (error) {
    console.error(`[TELEGRAM] ❌ Error enviando foto a ${chatId}:`, error.message);
    throw error;
  }
}

/**
 * Parsear update de Telegram → formato estándar interno
 * @param {object} update - Update de Telegram (req.body)
 * @returns {{ chatId, mensaje, imagenUrl, nombreUsuario }}
 */
function parsearUpdate(update) {
  const message = update.message || update.edited_message;

  if (!message) {
    return null;
  }

  const chatId = message.chat.id;
  const mensaje = message.text || message.caption || '';
  const nombreUsuario = message.from?.first_name || 'Conductor';

  // Si hay foto, obtener la URL del file_id (la más grande)
  let imagenFileId = null;
  if (message.photo && message.photo.length > 0) {
    // Telegram envía array de tamaños, el último es el más grande
    imagenFileId = message.photo[message.photo.length - 1].file_id;
  }

  return {
    chatId,
    mensaje,
    imagenFileId,
    imagenUrl: null, // Se resuelve en index.js con getFileUrl
    nombreUsuario,
  };
}

/**
 * Obtener URL pública de una imagen desde file_id de Telegram
 * @param {string} fileId
 * @returns {string} URL pública de la imagen
 */
async function getImagenUrl(fileId) {
  const client = getBot();
  try {
    const file = await client.getFile(fileId);
    return `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
  } catch (error) {
    console.error('[TELEGRAM] Error obteniendo URL de imagen:', error.message);
    return null;
  }
}

module.exports = {
  sendMessage,
  sendPhoto,
  parsearUpdate,
  getImagenUrl,
};
