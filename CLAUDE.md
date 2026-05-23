# CLAUDE.md — Juan Mecánico

## Stack
Node.js + Express + Firebase (Firestore + Storage) + Gemini AI + Telegram Bot API

## Contexto
Bot de Telegram para taller mecánico. Recibe reportes de fallas de vehículos por mensaje/foto, los analiza con Gemini Vision y los registra en Firestore.

## Estructura
```
functions/
  bot.js                → entry point — servidor Express + webhook Telegram
  telegram.js           → manejo de mensajes entrantes
  gemini.js             → análisis de imágenes y texto con Gemini
  firestore.js          → lectura/escritura Firestore
  flujos.js             → flujos de conversación
  estado-conversacion.js → estado por usuario
  intencion.js          → clasificación de intención del mensaje
  validacion.js         → validación de inputs
  prompts.js            → prompts para Gemini
  whatsapp.js           → legacy (no activo)
```

## Reglas
- Proyecto **legacy** — no migrar a TypeScript ni reorganizar estructura sin necesidad
- Firebase es el único backend permitido aquí (no Supabase)
- Google Cloud está bloqueado para proyectos **nuevos**, pero este proyecto lo usa (legacy)
- Credenciales siempre en `.env` (nunca hardcodeadas)

## Deploy
- Servidor en Oracle VPS o Render
- Variables de entorno configuradas manualmente en el servidor
- Ver `DEPLOYMENT.md` para instrucciones completas
