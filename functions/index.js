/**
 * JUAN MECÁNICO — Entry Point
 * Canal: Telegram (migrado desde Twilio/WhatsApp)
 * Pipeline: recibe update → valida conductor → detecta intención → procesa flujo → responde
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const { sendMessage, parsearUpdate, getImagenUrl } = require('./telegram');
const { validarConductor } = require('./validacion');
const { detectarIntencion } = require('./intencion');
const { procesarFlujo } = require('./flujos');

const app = express();
app.use(express.json());

// ──────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Juan Mecánico (Telegram)',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────────────────────
// WEBHOOK TELEGRAM (POST)
// Telegram llama a este endpoint con cada mensaje recibido
// ──────────────────────────────────────────────────────────────

app.post('/webhook', async (req, res) => {
  // Responder 200 inmediatamente a Telegram (evita retries)
  res.status(200).send('OK');

  try {
    console.log('[WEBHOOK] Update recibido de Telegram');

    const update = req.body;

    // Parsear update al formato estándar
    const parsed = parsearUpdate(update);

    if (!parsed) {
      console.log('[WEBHOOK] Update sin mensaje de texto, ignorando...');
      return;
    }

    const { chatId, mensaje, imagenFileId, nombreUsuario } = parsed;

    console.log(`[MSG] ChatId: ${chatId} | Usuario: ${nombreUsuario} | Texto: "${mensaje.substring(0, 50)}"`);

    // Resolver URL de imagen si hay foto adjunta
    let imagenUrl = null;
    if (imagenFileId) {
      imagenUrl = await getImagenUrl(imagenFileId);
      console.log('[IMG] Imagen recibida, URL resuelta');
    }

    // En Telegram usamos chatId como identificador (equivale al teléfono en WhatsApp)
    const telefono = String(chatId);

    // ── PASO 1: Validar conductor ──────────────────────────────
    console.log('[VALIDACION] Verificando conductor en Firestore...');
    const { valido, conductor, vehiculo, empresa } = await validarConductor(telefono);

    if (!valido) {
      console.log('[VALIDACION] Conductor no registrado:', telefono);
      await sendMessage(chatId,
        `Hola ${nombreUsuario} 👋\n\n` +
        `No estás registrado en *${process.env.BOT_NOMBRE || 'Juan Mecánico'}*.\n` +
        `Para usar el sistema, pide a tu jefe que te agregue.\n\n` +
        `¿Eres dueño de empresa? Escribe a: contacto@juanmecanico.cl`
      );
      return;
    }

    console.log('[VALIDACION] ✅ Conductor válido:', conductor.nombre);

    // ── PASO 2: Detectar intención ─────────────────────────────
    console.log('[INTENCION] Detectando intención...');
    const intencion = await detectarIntencion(mensaje, imagenUrl);
    console.log(`[INTENCION] Clasificado como: ${intencion}`);

    // ── PASO 3: Procesar flujo ─────────────────────────────────
    console.log(`[FLUJO] Procesando: ${intencion}`);
    const respuesta = await procesarFlujo({
      intencion,
      telefono,
      conductor,
      vehiculo,
      empresa,
      mensaje,
      imagenUrl,
    });

    // ── PASO 4: Enviar respuesta ───────────────────────────────
    console.log('[RESPONSE] Enviando respuesta...');
    await sendMessage(chatId, respuesta);

  } catch (error) {
    console.error('[ERROR] Error en pipeline:', error.message);
    console.error(error.stack);

    // Intentar notificar al usuario del error
    try {
      const update = req.body;
      const parsed = parsearUpdate(update);
      if (parsed?.chatId) {
        await sendMessage(parsed.chatId,
          `❌ Error técnico en ${process.env.BOT_NOMBRE || 'Juan Mecánico'}.\n` +
          `Intenta en 2 minutos o llama a tu jefe.`
        );
      }
    } catch (err) {
      console.error('[ERROR] No se pudo enviar mensaje de error:', err.message);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// LOCAL DEVELOPMENT
// ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🔧 Juan Mecánico (Telegram) corriendo en puerto ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Webhook: http://localhost:${PORT}/webhook`);
    console.log(`\n   Para testear localmente usa ngrok:`);
    console.log(`   ngrok http ${PORT}\n`);
  });
}

exports.juanMecanico = app;
