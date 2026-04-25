/**
 * JUAN MECÁNICO — Cloud Function Principal
 * Entry point: recibe webhook de Twilio, procesa mensaje, envía respuesta
 */

require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const { handleWhatsAppMessage } = require('./whatsapp');
const { validarConductor } = require('./validacion');
const { detectarIntencion } = require('./intencion');
const { procesarFlujo } = require('./flujos');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware para validar firma Twilio
const validateTwilioRequest = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const url = `${process.env.WEBHOOK_URL || 'http://localhost:3000'}${req.originalUrl}`;
  const signature = req.get('X-Twilio-Signature') || '';

  const isValid = twilio.validateRequest(
    authToken,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    console.warn('[SECURITY] Firma Twilio inválida. Rechazando request.');
    return res.status(403).send('Forbidden');
  }

  next();
};

// ──────────────────────────────────────────────────────────────
// HEALTH CHECK
// ──────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).send({
    status: 'OK',
    service: 'Juan Mecánico',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────────────────────
// WEBHOOK TWILIO VERIFICATION (GET)
// ──────────────────────────────────────────────────────────────

app.get('/webhook', (req, res) => {
  console.log('[WEBHOOK] GET verificación exitosa');
  res.status(200).send('OK');
});

// ──────────────────────────────────────────────────────────────
// WEBHOOK TWILIO MESSAGE HANDLER (POST)
// ──────────────────────────────────────────────────────────────
// ⚠️ VALIDACIÓN COMENTADA PARA TESTING LOCAL
// Descommentar validateTwilioRequest antes de production

app.post('/webhook', async (req, res) => {
  try {
    console.log('[WEBHOOK] POST request received');

    const { From, Body, MediaUrl0 } = req.body;
    const telefono = From.replace('whatsapp:', '');
    const mensaje = Body || '';
    const imagenUrl = MediaUrl0 || null;

    console.log(`[MSG] De: ${telefono} | Texto: ${mensaje.substring(0, 50)}`);

    // PASO 1: Validar conductor
    console.log('[VALIDACION] Verificando conductor en Firestore...');
    const { valido, conductor, vehiculo, empresa } = await validarConductor(telefono);

    if (!valido) {
      console.log('[VALIDACION] Conductor no registrado:', telefono);
      const respuesta = `Hola 👋\n\nNo estás registrado en ${process.env.BOT_NOMBRE}.\nPara usar el sistema, pide a tu jefe que te agregue.\n\nSi eres dueño de empresa escribe a: contacto@juanmecanico.cl`;
      await handleWhatsAppMessage(telefono, respuesta);
      res.status(200).send('OK');
      return;
    }

    console.log('[VALIDACION] ✅ Conductor válido:', conductor.nombre);

    // PASO 2: Detectar intención del mensaje
    console.log('[INTENCION] Detectando intención...');
    const intencion = await detectarIntencion(mensaje, imagenUrl);
    console.log(`[INTENCION] Clasificado como: ${intencion}`);

    // PASO 3: Procesar flujo correspondiente
    console.log(`[FLUJO] Procesando flujo: ${intencion}`);
    const respuesta = await procesarFlujo({
      intencion,
      telefono,
      conductor,
      vehiculo,
      empresa,
      mensaje,
      imagenUrl,
    });

    // PASO 4: Enviar respuesta
    console.log('[RESPONSE] Enviando respuesta a:', telefono);
    await handleWhatsAppMessage(telefono, respuesta);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[ERROR]', error.message);
    const respuesta = `❌ Error técnico en ${process.env.BOT_NOMBRE}.\nIntenta en 2 minutos o llama a tu jefe.`;

    try {
      const telefono = req.body.From?.replace('whatsapp:', '');
      if (telefono) await handleWhatsAppMessage(telefono, respuesta);
    } catch (err) {
      console.error('[ERROR] No se pudo enviar error message:', err);
    }

    res.status(500).send('Error');
  }
});

// ──────────────────────────────────────────────────────────────
// EXPORT PARA CLOUD FUNCTIONS
// ──────────────────────────────────────────────────────────────

exports.handleWhatsApp = app;

// ──────────────────────────────────────────────────────────────
// LOCAL DEVELOPMENT (si se corre con npm start)
// ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🔧 Juan Mecánico corriendo en puerto ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}
