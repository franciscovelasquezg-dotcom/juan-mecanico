/**
 * ESTADO-CONVERSACION.JS — Manejo de estados de conversación por usuario
 * Guarda en memoria mientras el bot está corriendo.
 * En producción se puede mover a Firestore/Redis.
 */

// Estado por chatId: { paso, datos }
const estados = {};

const PASOS = {
  INICIO: 'INICIO',
  ESPERANDO_TIPO_PROBLEMA: 'ESPERANDO_TIPO_PROBLEMA',
  ESPERANDO_DESCRIPCION: 'ESPERANDO_DESCRIPCION',
  ESPERANDO_VEHICULO: 'ESPERANDO_VEHICULO',
  PROCESANDO: 'PROCESANDO',
};

function getEstado(chatId) {
  return estados[chatId] || { paso: PASOS.INICIO, datos: {} };
}

function setEstado(chatId, paso, datos = {}) {
  estados[chatId] = {
    paso,
    datos: { ...( estados[chatId]?.datos || {}), ...datos },
  };
}

function resetEstado(chatId) {
  delete estados[chatId];
}

module.exports = { PASOS, getEstado, setEstado, resetEstado };
