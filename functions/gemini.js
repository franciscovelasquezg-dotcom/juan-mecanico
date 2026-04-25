/**
 * GEMINI.JS — Llamadas a Google Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('./prompts');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Clasificar intención del mensaje
 */
async function clasificarIntencion(mensaje) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = prompts.DETECTAR_INTENSION.replace('{mensaje}', mensaje);
    const result = await model.generateContent(prompt);
    const texto = result.response.text().trim().toUpperCase();

    const validas = ['TESTIGO', 'AVERIA', 'KM_SALIDA', 'KM_LLEGADA', 'KM_FOTO', 'OTRO'];
    return validas.includes(texto) ? texto : 'OTRO';
  } catch (error) {
    console.error('[GEMINI] Error clasificar:', error.message);
    return 'OTRO';
  }
}

/**
 * Diagnosticar testigo del tablero
 */
async function diagnosticarTestigo(vehiculo, conductor, mensaje) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = prompts.DIAGNOSTICO_TESTIGO
      .replace('{marca}', vehiculo?.marca || 'Desconocida')
      .replace('{modelo}', vehiculo?.modelo || 'Desconocido')
      .replace('{año}', vehiculo?.anio || 'N/A')
      .replace('{combustible}', vehiculo?.combustible || 'N/A')
      .replace('{nombre}', conductor?.nombre || 'Conductor')
      .replace('{mensaje}', mensaje);

    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    // Parsear JSON de respuesta
    try {
      const json = JSON.parse(texto);
      return json;
    } catch (e) {
      console.warn('[GEMINI] No es JSON válido, retornando como texto');
      return {
        urgencia: 'PUEDE_ESPERAR',
        testigo: 'Testigo reportado',
        respuesta: texto,
      };
    }
  } catch (error) {
    console.error('[GEMINI] Error diagnosticar testigo:', error.message);
    return {
      urgencia: 'PUEDE_ESPERAR',
      testigo: 'Error en diagnóstico',
      respuesta: 'No pude procesar el diagnóstico. Intenta describiendo el testigo nuevamente.',
    };
  }
}

/**
 * Reportar avería
 */
async function reportarAveria(vehiculo, conductor, mensaje) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = prompts.REPORTE_AVERIA
      .replace('{marca}', vehiculo?.marca || 'Desconocida')
      .replace('{modelo}', vehiculo?.modelo || 'Desconocido')
      .replace('{año}', vehiculo?.anio || 'N/A')
      .replace('{nombre}', conductor?.nombre || 'Conductor')
      .replace('{mensaje}', mensaje);

    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    try {
      const json = JSON.parse(texto);
      return json;
    } catch (e) {
      console.warn('[GEMINI] No es JSON válido');
      return {
        urgencia: 'PUEDE_ESPERAR',
        categoria: 'OTRO',
        descripcion: 'Avería reportada',
        puede_usar: true,
        respuesta: texto,
      };
    }
  } catch (error) {
    console.error('[GEMINI] Error reportar avería:', error.message);
    return {
      urgencia: 'PUEDE_ESPERAR',
      categoria: 'OTRO',
      descripcion: 'Error procesando',
      puede_usar: true,
      respuesta: 'No pude procesar la avería. Intenta nuevamente.',
    };
  }
}

/**
 * Leer número de odómetro desde imagen
 */
async function leerOdometro(imagenUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    // Fetch imagen
    const response = await fetch(imagenUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Determinar tipo MIME
    const mimeType = imagenUrl.includes('.png') ? 'image/png' : 'image/jpeg';

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      prompts.LEER_ODOMETRO,
    ]);

    const texto = result.response.text().trim();
    const numero = parseInt(texto, 10);

    if (isNaN(numero)) {
      return { valido: false, km: null, razon: 'NO_LEGIBLE' };
    }

    return { valido: true, km: numero, razon: 'OK' };
  } catch (error) {
    console.error('[GEMINI] Error leer odómetro:', error.message);
    return { valido: false, km: null, razon: 'ERROR' };
  }
}

module.exports = {
  clasificarIntencion,
  diagnosticarTestigo,
  reportarAveria,
  leerOdometro,
};
