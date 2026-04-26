/**
 * JUAN MECÁNICO — Bot Telegram con flujo conversacional
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const { validarConductor } = require('./validacion');
const { PASOS, getEstado, setEstado, resetEstado } = require('./estado-conversacion');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('\n🔧 Juan Mecánico iniciado');
console.log('   Bot: @juanito_mecanico_bot\n');

// ── Enviar mensaje con botones opcionales ─────────────────────
async function reply(chatId, texto, opciones = null) {
  const opts = { parse_mode: 'Markdown' };
  if (opciones) {
    opts.reply_markup = {
      keyboard: opciones.map(o => [{ text: o }]),
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  } else {
    opts.reply_markup = { remove_keyboard: true };
  }
  await bot.sendMessage(chatId, texto, opts);
}

// ── Manejador principal ───────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = (msg.text || msg.caption || '').trim();
  const nombre = msg.from?.first_name || 'Conductor';
  const tieneFoto = msg.photo && msg.photo.length > 0;

  if (!texto && !tieneFoto) return;

  console.log(`[MSG] ${nombre} (${chatId}): "${texto}"`);

  try {
    // ── Validar conductor ─────────────────────────────────────
    const { valido, conductor } = await validarConductor(String(chatId));

    if (!valido) {
      await reply(chatId,
        `Hola ${nombre} 👋\n\nNo estás registrado en *Juan Mecánico*.\nPide a tu jefe que te agregue al sistema.`
      );
      return;
    }

    const { paso, datos } = getEstado(chatId);
    const nombreConductor = conductor.nombre || nombre;

    // ── /start o reinicio ─────────────────────────────────────
    if (texto === '/start' || texto.toLowerCase() === 'menu') {
      resetEstado(chatId);
      await mostrarMenu(chatId, nombreConductor);
      return;
    }

    // ── PASO INICIO ───────────────────────────────────────────
    if (paso === PASOS.INICIO) {
      await mostrarMenu(chatId, nombreConductor);
      return;
    }

    // ── PASO: ¿Qué tipo de problema? ─────────────────────────
    if (paso === PASOS.ESPERANDO_TIPO_PROBLEMA) {
      // Si manda foto directo → asumir testigo
      if (tieneFoto && !texto) {
        setEstado(chatId, PASOS.ESPERANDO_VEHICULO, { tipo: 'TESTIGO', fotoDirecta: true });
        await reply(chatId, `📸 Vi la foto. ¿Qué vehículo estás manejando?\nEscribe marca, modelo y año.\n\nEj: "Mercedes Actros 2020" o "Volvo FH 2021"`);
        return;
      }

      const t = texto.toLowerCase();

      // KM
      const esKm = t.includes('km') || t.includes('kilómetro') || t.includes('kilometro')
        || t.includes('📍') || t.includes('salí') || t.includes('sali')
        || t.includes('llegué') || t.includes('llegue') || t.includes('odómetro');

      // Testigo
      const esTestigo = t.includes('testigo') || t.includes('luz se') || t.includes('luz del')
        || t.includes('se prendió') || t.includes('se prendio') || t.includes('tablero')
        || t.includes('indicador') || t.includes('🔴');

      // Fin de reporte
      const esListo = (t === 'no' || t === 'no, listo' || t.includes('✅') || t.includes('listo') || t.includes('nada más') || t.includes('nada mas'));

      if (esKm) {
        setEstado(chatId, PASOS.ESPERANDO_DESCRIPCION, { tipo: 'KM' });
        await reply(chatId, `📍 *Kilómetros*\n\n¿Estás *saliendo* o *llegando*?\n¿Cuántos km marca el odómetro?`, ['🚀 Saliendo', '🏁 Llegando']);

      } else if (esTestigo) {
        setEstado(chatId, PASOS.ESPERANDO_VEHICULO, { tipo: 'TESTIGO' });
        await reply(chatId, `🔴 *Testigo del tablero*\n\n¿Qué vehículo estás manejando?\nEscribe marca, modelo y año.\n\nEj: "Mercedes Actros 2020" o "Volvo FH 2021"`);

      } else if (esListo) {
        resetEstado(chatId);
        await reply(chatId, `✅ Listo ${nombreConductor}. ¡Buen viaje! 🚛`);

      } else {
        // Cualquier descripción de problema → tratar como avería/falla directa
        // Guardar lo que dijo como descripción inicial
        setEstado(chatId, PASOS.ESPERANDO_VEHICULO, { tipo: 'AVERIA', descripcionInicial: texto });
        await reply(chatId, `Entendido. ¿Qué vehículo estás manejando?\nEscribe marca, modelo y año.\n\nEj: "Mercedes Actros 2020", "Volvo FH 2021", "Hyundai HD78 2019"`);
      }
      return;
    }

    // ── PASO: ¿Qué vehículo? ──────────────────────────────────
    if (paso === PASOS.ESPERANDO_VEHICULO) {
      const vehiculoDescripcion = texto;
      const descripcionInicial = datos.descripcionInicial || null;

      setEstado(chatId, PASOS.ESPERANDO_DESCRIPCION, { vehiculoDescripcion });

      // Si ya describió el problema antes de dar el vehículo → procesar directo
      if (descripcionInicial) {
        await reply(chatId, `⏳ Analizando para el *${vehiculoDescripcion}*...`);
        const respuesta = await diagnosticar(datos.tipo, descripcionInicial, vehiculoDescripcion, nombreConductor);
        await reply(chatId, respuesta);
        resetEstado(chatId);
        setTimeout(() => ofrecerOtroReporte(chatId, nombreConductor), 1500);
        return;
      }

      if (datos.tipo === 'TESTIGO') {
        await reply(chatId, `✅ *${vehiculoDescripcion}*\n\n🔴 ¿Cuál testigo o luz se encendió?\nDescríbelo o manda una foto del tablero.`);
      } else {
        await reply(chatId, `✅ *${vehiculoDescripcion}*\n\n🔧 ¿Qué está pasando exactamente?\nDescribe la falla con detalle.`);
      }
      return;
    }

    // ── PASO: Descripción del problema ────────────────────────
    if (paso === PASOS.ESPERANDO_DESCRIPCION) {
      const tipo = datos.tipo;

      // KM
      if (tipo === 'KM') {
        const km = texto.match(/\d+/)?.[0];
        const esSalida = texto.toLowerCase().includes('saliendo') || texto.toLowerCase().includes('salí') || texto.toLowerCase().includes('🚀');
        if (km) {
          await reply(chatId, `✅ Registrado *${parseInt(km).toLocaleString()} km* (${esSalida ? 'salida' : 'llegada'}).\n\nGracias ${nombreConductor}, buen viaje 🚛`);
        } else {
          await reply(chatId, `✅ Kilómetros registrados. Gracias ${nombreConductor} 🚛`);
        }
        resetEstado(chatId);
        setTimeout(() => ofrecerOtroReporte(chatId, nombreConductor), 1500);
        return;
      }

      // TESTIGO o AVERIA → analizar
      const vehiculo = datos.vehiculoDescripcion || 'Vehículo no especificado';
      await reply(chatId, `⏳ Analizando para el *${vehiculo}*...`);

      let respuesta;
      if (tieneFoto) {
        respuesta = await diagnosticarConFoto(msg, tipo, texto, vehiculo, nombreConductor);
      } else {
        respuesta = await diagnosticar(tipo, texto, vehiculo, nombreConductor);
      }
      await reply(chatId, respuesta);

      resetEstado(chatId);
      setTimeout(() => ofrecerOtroReporte(chatId, nombreConductor), 1500);
      return;
    }

  } catch (error) {
    console.error('[ERROR]', error.message);
    await reply(chatId, `❌ Error técnico. Intenta de nuevo.`);
    resetEstado(chatId);
  }
});

// ── Mostrar menú inicial ──────────────────────────────────────
async function mostrarMenu(chatId, nombre) {
  await reply(chatId,
    `Hola *${nombre}* 👋\n\n¿Qué necesitas reportar hoy?`,
    ['🔴 Testigo del tablero', '🔧 Avería o daño', '📍 Kilómetros']
  );
  setEstado(chatId, PASOS.ESPERANDO_TIPO_PROBLEMA);
}

async function ofrecerOtroReporte(chatId, nombre) {
  await reply(chatId, `¿Hay algo más que reportar?`, ['Sí, otro reporte', '✅ No, listo']);
  setEstado(chatId, PASOS.ESPERANDO_TIPO_PROBLEMA);
}

// ── Diagnóstico con Gemini (con fallback si falla) ────────────
async function diagnosticar(tipo, descripcion, vehiculo, conductor) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' }, { apiVersion: 'v1beta' });

    const prompt = tipo === 'TESTIGO'
      ? `Eres Juan Mecánico, experto en mecánica para conductores chilenos.
Vehículo: ${vehiculo}
Conductor: ${conductor}
Testigo reportado: "${descripcion}"

Basándote en el manual técnico del ${vehiculo}:
1. Identifica qué testigo es
2. Clasifica urgencia: CRITICO / URGENTE / PUEDE_ESPERAR
3. Explica qué hacer ahora mismo
4. Máximo 120 palabras, español simple sin tecnicismos
5. Si CRITICO: empieza con 🔴 PARA EL VEHÍCULO AHORA
6. Si URGENTE: empieza con 🟠 Ve al taller hoy
7. Si PUEDE_ESPERAR: empieza con 🟡`

      : `Eres Juan Mecánico, experto en mecánica para conductores chilenos.
Vehículo: ${vehiculo}
Conductor: ${conductor}
Falla reportada: "${descripcion}"

Basándote en el manual técnico del ${vehiculo}:
1. Diagnóstica la falla
2. Indica si puede seguir usando el vehículo
3. Explica qué hacer ahora mismo
4. Máximo 120 palabras, español simple`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();

  } catch (err) {
    console.error('[GEMINI ERROR]', err.message);
    // Fallback por palabras clave si Gemini falla
    return diagnosticarFallback(tipo, descripcion, vehiculo);
  }
}

// ── Diagnóstico con foto (Gemini Vision) ─────────────────────
async function diagnosticarConFoto(msg, tipo, textoAdicional, vehiculo, conductor) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' }, { apiVersion: 'v1beta' });

    // Descargar foto de Telegram
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileLink = await bot.getFileLink(fileId);
    const https = require('https');
    const imageBuffer = await new Promise((resolve, reject) => {
      https.get(fileLink, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
    });
    const base64 = imageBuffer.toString('base64');

    const prompt = `Eres Juan Mecánico, experto en mecánica para conductores chilenos.
Vehículo: ${vehiculo}
Conductor: ${conductor}
${textoAdicional ? `Descripción adicional: "${textoAdicional}"` : ''}

Analiza esta imagen del tablero/vehículo y:
1. Identifica TODOS los testigos o luces encendidas que veas
2. Clasifica urgencia: CRITICO / URGENTE / PUEDE_ESPERAR
3. Explica qué significa cada testigo para este ${vehiculo}
4. Indica qué hacer ahora mismo paso a paso
5. Máximo 150 palabras, español simple sin tecnicismos
6. Si CRITICO: empieza con 🔴 PARA EL VEHÍCULO AHORA
7. Si URGENTE: empieza con 🟠 Ve al taller hoy
8. Si PUEDE_ESPERAR: empieza con 🟡`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: base64 } }
    ]);

    console.log('[VISION] Análisis de foto completado para:', vehiculo);
    return result.response.text().trim();

  } catch (err) {
    console.error('[VISION ERROR]', err.message);
    // Si falla vision, intentar con texto
    return diagnosticar(tipo, textoAdicional || 'foto del tablero', vehiculo, conductor);
  }
}

// ── Fallback sin Gemini ───────────────────────────────────────
function diagnosticarFallback(tipo, descripcion, vehiculo) {
  const d = descripcion.toLowerCase();

  if (tipo === 'TESTIGO') {
    if (d.includes('aceite') || d.includes('oil'))
      return `🔴 *PARA EL VEHÍCULO AHORA*\n\nEl testigo de aceite indica presión baja de aceite en el motor del ${vehiculo}.\n\n*Qué hacer:*\n1. Apaga el motor inmediatamente\n2. Espera 10 minutos y revisa el nivel de aceite\n3. Si está bajo, agrega aceite antes de continuar\n4. Si el testigo sigue encendido después de agregar aceite → llama al taller\n\n⚠️ Continuar con este testigo puede fundir el motor.`;

    if (d.includes('temperatura') || d.includes('agua') || d.includes('calor'))
      return `🔴 *PARA EL VEHÍCULO AHORA*\n\nEl motor está sobrecalentando en el ${vehiculo}.\n\n*Qué hacer:*\n1. Detente en un lugar seguro y apaga\n2. NO abras el radiador en caliente (quemaduras)\n3. Espera 30 minutos que enfríe\n4. Revisa nivel de agua del radiador\n5. Llama al taller antes de continuar`;

    if (d.includes('batería') || d.includes('bateria') || d.includes('alternador'))
      return `🟠 *Ve al taller hoy*\n\nTestigo de batería en el ${vehiculo}. El alternador puede no estar cargando.\n\n*Qué hacer:*\n1. Apaga todo lo que puedas (radio, A/C)\n2. Ve directo al taller más cercano\n3. No apagues el motor en el camino (puede no partir de nuevo)`;

    if (d.includes('freno') || d.includes('abs'))
      return `🟠 *Ve al taller hoy*\n\nTestigo de frenos en el ${vehiculo}. Reduce la velocidad.\n\n*Qué hacer:*\n1. Maneja con precaución a baja velocidad\n2. Aumenta la distancia de seguimiento\n3. Ve al taller hoy sin excusas`;

    return `🟡 *Testigo encendido en ${vehiculo}*\n\nNo pude identificar exactamente cuál es. Por seguridad:\n1. Toma una foto clara del tablero\n2. Llama a tu jefe o taller de confianza\n3. Si el vehículo se comporta diferente → para y llama`;
  }

  if (tipo === 'AVERIA') {
    if (d.includes('neumático') || d.includes('neumatico') || d.includes('rueda') || d.includes('llanta') || d.includes('goma'))
      return `🟠 *Neumático bajo o pinchado*\n\n*Qué hacer ahora:*\n1. Para en un lugar seguro fuera de la calzada\n2. Enciende las balizas\n3. Si tienes rueda de repuesto → cámbiala\n4. Si no → llama a asistencia en ruta\n\n⚠️ No manejes con el neumático bajo, puedes perder el control.`;

    if (d.includes('humo') || d.includes('fuego') || d.includes('llama'))
      return `🔴 *PARA EL VEHÍCULO INMEDIATAMENTE*\n\n1. Detente en lugar seguro AHORA\n2. Apaga el motor\n3. Todos fuera del vehículo\n4. Llama al 132 (Bomberos) si hay fuego\n5. NO intentes apagarlo solo`;

    if (d.includes('freno') || d.includes('no frena') || d.includes('pedal'))
      return `🔴 *EMERGENCIA DE FRENOS*\n\n1. Baja las marchas progresivamente\n2. Usa el freno de mano suavemente\n3. Busca una subida o zona de escape\n4. Llama al 133 si no puedes frenar\n\n⚠️ No apagues el motor mientras el vehículo está en movimiento`;

    return `🟡 *Falla registrada en ${vehiculo}*\n\nTu reporte fue guardado. Tu jefe será notificado.\n\n*Mientras tanto:*\n- Si el vehículo se comporta con riesgo → para de inmediato\n- Si puede seguir → ve directo al taller al terminar el turno`;
  }

  return `✅ Reporte registrado. Tu jefe fue notificado.`;
}

// ── Errores de polling ────────────────────────────────────────
bot.on('polling_error', (err) => console.error('[POLLING]', err.code));
process.on('SIGINT', () => { bot.stopPolling(); process.exit(0); });
