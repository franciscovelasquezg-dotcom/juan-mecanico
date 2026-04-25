/**
 * INTENCION.JS — Detectar intención del mensaje usando Gemini
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Detectar intención liviana del mensaje
 * Clasificación rápida sin contexto pesado
 * @param {string} mensaje - Texto del conductor
 * @param {string|null} imagenUrl - URL de imagen (si la hay)
 * @returns {Promise<string>} Intención: TESTIGO|AVERIA|KM_SALIDA|KM_LLEGADA|KM_FOTO|OTRO
 */
async function detectarIntencion(mensaje, imagenUrl = null) {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `Clasifica este mensaje de un conductor de camión en UNA de estas categorías:

TESTIGO     → describe o fotografía un testigo/luz del tablero
AVERIA      → reporta daño, sonido extraño, problema mecánico sin testigo
KM_SALIDA   → avisa que está saliendo (con o sin km)
KM_LLEGADA  → avisa que llegó (con o sin km)
KM_FOTO     → manda foto que podría ser del odómetro
OTRO        → cualquier otra cosa

Responde SOLO con la palabra de la categoría. Sin explicación.

Mensaje: "${mensaje}"`;

    const result = await model.generateContent(prompt);
    const clasificacion = result.response.text().trim().toUpperCase();

    // Validar que sea una clasificación válida
    const validas = ['TESTIGO', 'AVERIA', 'KM_SALIDA', 'KM_LLEGADA', 'KM_FOTO', 'OTRO'];
    const intencion = validas.includes(clasificacion) ? clasificacion : 'OTRO';

    console.log(`[INTENCION] Detectada: ${intencion}`);
    return intencion;
  } catch (error) {
    console.error('[INTENCION] Error:', error.message);
    return 'OTRO';
  }
}

module.exports = {
  detectarIntencion,
};
