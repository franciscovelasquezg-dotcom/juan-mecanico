/**
 * FLUJOS.JS — Procesar flujos principales
 */

const { diagnosticarTestigo, reportarAveria, leerOdometro } = require('./gemini');
const { saveHistorial, saveFalla, updateKmVehiculo } = require('./firestore');
const { sendMessage } = require('./telegram');

async function procesarFlujo({ intencion, telefono, conductor, vehiculo, empresa, mensaje, imagenUrl }) {
  try {
    switch (intencion) {
      case 'TESTIGO':
        return await flujoTestigo({ conductor, vehiculo, mensaje });

      case 'AVERIA':
        return await flujoAveria({ conductor, vehiculo, mensaje });

      case 'KM_SALIDA':
      case 'KM_LLEGADA':
        return await flujoKilometraje({ intencion, conductor, vehiculo, mensaje });

      case 'KM_FOTO':
        return await flujoFoto({ conductor, vehiculo, imagenUrl });

      default:
        return `Hola ${conductor.nombre} 👋\n\nSoy ${process.env.BOT_NOMBRE}. Puedo ayudarte con:\n🔴 Testigos del tablero\n🔧 Averías o daños\n📍 Kilómetros\n\n¿Qué necesitas?`;
    }
  } catch (error) {
    console.error('[FLUJOS] Error procesando flujo:', error.message);
    return `Error procesando solicitud. Intenta de nuevo en 2 minutos.`;
  }
}

async function flujoTestigo({ conductor, vehiculo, mensaje }) {
  const diagnostico = await diagnosticarTestigo(vehiculo, conductor, mensaje);

  if (diagnostico.urgencia === 'CRITICO') {
    await saveHistorial(vehiculo.id, {
      tipo: 'TESTIGO_CRITICO',
      testigo: diagnostico.testigo,
      conductor_nombre: conductor.nombre,
      timestamp: new Date(),
    });
    // TODO: Notificar jefe inmediatamente
  }

  return diagnostico.respuesta || 'Testigo registrado. Gracias por reportar.';
}

async function flujoAveria({ conductor, vehiculo, mensaje }) {
  const diagnostico = await reportarAveria(vehiculo, conductor, mensaje);

  // Guardar falla en Firestore
  const falla = {
    vehiculoId: vehiculo.id,
    categoria: diagnostico.categoria,
    descripcion: diagnostico.descripcion,
    urgencia: diagnostico.urgencia,
    puede_usar: diagnostico.puede_usar,
    conductor_nombre: conductor.nombre,
    conductor_telefono: conductor.telefono,
    timestamp: new Date(),
    estado: 'ABIERTA',
  };

  await saveFalla(vehiculo.id, falla);

  if (diagnostico.urgencia === 'CRITICO') {
    // TODO: Notificar jefe INMEDIATAMENTE
    await saveHistorial(vehiculo.id, {
      tipo: 'AVERIA_CRITICA',
      descripcion: diagnostico.descripcion,
      conductor_nombre: conductor.nombre,
      timestamp: new Date(),
    });
  }

  return diagnostico.respuesta || 'Avería registrada. El jefe ha sido notificado.';
}

async function flujoKilometraje({ intencion, conductor, vehiculo, mensaje }) {
  const kmMatch = mensaje.match(/\d+/);
  const km = kmMatch ? parseInt(kmMatch[0]) : null;

  if (!km) {
    return `📍 Para registrar kilómetros, envía un número. Ej:\n"Salí 45230"\n"Llegué 45400"`;
  }

  await updateKmVehiculo(vehiculo.id, km);
  await saveHistorial(vehiculo.id, {
    tipo: intencion === 'KM_SALIDA' ? 'KM_SALIDA' : 'KM_LLEGADA',
    km,
    conductor_nombre: conductor.nombre,
    timestamp: new Date(),
  });

  return `✅ Registrado ${km} km.\n\nGracias ${conductor.nombre}, buen viaje.`;
}

async function flujoFoto({ conductor, vehiculo, imagenUrl }) {
  if (!imagenUrl) {
    return `📷 No recibí la foto. Intenta enviando la imagen nuevamente.`;
  }

  const lectura = await leerOdometro(imagenUrl);

  if (lectura.valido) {
    await updateKmVehiculo(vehiculo.id, lectura.km);
    await saveHistorial(vehiculo.id, {
      tipo: 'FOTO_KM',
      km: lectura.km,
      conductor_nombre: conductor.nombre,
      imagen_url: imagenUrl,
      timestamp: new Date(),
    });

    return `✅ Foto procesada.\n\nRegistré ${lectura.km} km del odómetro.\n\n¿Es salida o llegada?`;
  }

  return `📷 No pude leer claramente el odómetro.\nIntenta con una foto más clara.`;
}

module.exports = {
  procesarFlujo,
};
