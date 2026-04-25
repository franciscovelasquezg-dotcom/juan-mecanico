# TEST WEBHOOK — Validar Juan Mecánico Localmente

**Objetivo:** Validar que el webhook Twilio funciona en desarrollo antes de desplegar a GCP

---

## PASO 1: Preparar Ambiente Local

```bash
cd D:\carpeta app 2026\juan-mecanico\functions

# 1. Instalar dependencias
npm install

# 2. Crear .env con credenciales de desarrollo
cp ../.env.example ../.env

# Editar .env con:
# - GOOGLE_PROJECT_ID=your-project-id
# - FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
# - TWILIO_ACCOUNT_SID=ACxxxxx
# - TWILIO_AUTH_TOKEN=xxxxx
# - TWILIO_WHATSAPP_NUMBER=+14155238886
# - GEMINI_API_KEY=AIzaSyxxxxxx
# - GEMINI_MODEL=gemini-2.0-flash
# - WEBHOOK_URL=http://localhost:3000 (para desarrollo local)
```

---

## PASO 2: Correr Servidor Local

```bash
npm start
```

**Salida esperada:**
```
🔧 Juan Mecánico corriendo en puerto 3000
Health: http://localhost:3000/health
```

---

## PASO 3: Test Health Check (sin Twilio)

En otra terminal:

```bash
# Test que el servidor está vivo
curl http://localhost:3000/health

# Debería retornar:
# {"status":"OK","service":"Juan Mecánico","timestamp":"2026-04-25T..."}
```

✅ Si esto funciona, la app está corriendo.

---

## PASO 4: Test Webhook SIN Firma (desarrollo)

Para desarrollo rápido, puedes comentar temporalmente la validación Twilio en index.js:

```javascript
// En index.js, cambia:
app.post('/webhook', validateTwilioRequest, async (req, res) => {
// A:
app.post('/webhook', async (req, res) => {

// IMPORTANTE: Descomentar después de tests. Nunca deployer sin validación.
```

---

## PASO 5: Test Webhook con Payload Twilio

Opción A: Usar Postman o similar

```http
POST http://localhost:3000/webhook
Content-Type: application/x-www-form-urlencoded

From=whatsapp:+56912345678
Body=Hola+Juan+Mecánico
MessageSid=SMxxxxxxxxxxxxx
```

Opción B: Usar curl

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=Hola+Juan+Mecánico&MessageSid=SMxxxxxxxxxxxxx"
```

**Salida esperada en consola:**
```
[WEBHOOK] POST request received
[MSG] De: +56912345678 | Texto: Hola Juan Mecánico
[VALIDACION] Verificando conductor...
[VALIDACION] Conductor no registrado: +56912345678
[RESPONSE] Enviando respuesta a: +56912345678
[TWILIO] Mensaje enviado. SID: SMxxxxxxxxxxxxx
```

---

## PASO 6: Test con Conductor Registrado

Primero, crear datos de prueba en Firestore:

```bash
# En GCP Cloud Shell o Firebase console:

# 1. Crear conductor
db.collection('conductores').doc('+56912345678').set({
  nombre: 'Pedro Test',
  activo: true,
  vehiculoId: 'v001',
  empresaId: 'emp001'
})

# 2. Crear vehículo
db.collection('vehiculos').doc('v001').set({
  patente: 'XXJJ45',
  marca: 'Volvo',
  modelo: 'FH16',
  ano: 2020,
  combustible: 'Diesel',
  kmActual: 150000
})

# 3. Crear empresa
db.collection('empresas').doc('emp001').set({
  nombre: 'Transportes Test SPA',
  ciudad: 'Santiago',
  activa: true
})
```

Luego test:

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=Luz+roja+en+el+tablero&MessageSid=SMxxxxx"
```

**Salida esperada:**
```
[WEBHOOK] POST request received
[MSG] De: +56912345678 | Texto: Luz roja en el tablero
[VALIDACION] Verificando conductor...
[VALIDACION] ✅ Conductor válido: Pedro Test
[INTENCION] Detectando intención...
[INTENCION] Clasificado como: TESTIGO
[FLUJO] Procesando flujo: TESTIGO
[GEMINI] Llamando diagnosticarTestigo...
[RESPONSE] Enviando respuesta a: +56912345678
```

---

## PASO 7: Tests Específicos por Flujo

### Test 1: TESTIGO (luz del tablero)

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=Se+prendi%C3%B3+la+luz+roja+del+motor&MessageSid=SM1"
```

Espera respuesta de Gemini sobre diagnóstico del testigo.

### Test 2: AVERIA (daño mecánico)

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=Se+rompi%C3%B3+el+par+motor&MessageSid=SM2"
```

Espera respuesta de Gemini sobre diagnóstico de avería.

### Test 3: KILOMETRAJE

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=Sal%C3%AD+165000&MessageSid=SM3"
```

Espera respuesta de registro de km.

### Test 4: FOTO (odómetro)

Para fotos, Twilio envía `MediaUrl0`:

```bash
curl -X POST http://localhost:3000/webhook \
  -d "From=whatsapp:+56912345678&Body=&MediaUrl0=https://example.com/odometer.jpg&MessageSid=SM4"
```

---

## PASO 8: Checklist de Validación

- [ ] Health check retorna OK
- [ ] Conductor no registrado → retorna mensaje "No estás registrado"
- [ ] Conductor registrado → procesa mensajes correctamente
- [ ] TESTIGO → Gemini responde con diagnóstico
- [ ] AVERIA → Gemini responde con urgencia
- [ ] KM → Actualiza km en Firestore
- [ ] FOTO → Lee odómetro y retorna km
- [ ] Errores → No envía mensajes técnicos al usuario
- [ ] Logs → Aparecen todos los [WEBHOOK], [VALIDACION], [INTENCION], [RESPONSE]

---

## Troubleshooting Local

### "GEMINI_API_KEY not found"
```bash
# Asegurar que .env está en la carpeta padre
cat ../.env | grep GEMINI_API_KEY
```

### "Firebase auth failed"
```bash
# GOOGLE_APPLICATION_CREDENTIALS debe estar configurada O usar .env
export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/serviceAccountKey.json
```

### "validateRequest always fails"
Durante desarrollo local, comentar temporalmente:
```javascript
// const validateTwilioRequest = ... (comentar)
// app.post('/webhook', validateTwilioRequest, ... (remover middleware)
```

---

## PASO 9: Descommentar Validación (pre-deploy)

Antes de desplegar a GCP:

```javascript
// DESCOMENTAR validación Twilio
app.post('/webhook', validateTwilioRequest, async (req, res) => {
  // ... código
})
```

Y test con firma válida (requiere Twilio CLI o ngrok):

```bash
# Con ngrok (expone servidor local)
ngrok http 3000
# Copia la URL de ngrok (ej: https://abc123.ngrok.io)

# En Twilio Console, configura webhook a:
# https://abc123.ngrok.io/webhook

# Test desde WhatsApp
# Envía mensaje al número de sandbox
```

---

## PASO 10: Logs en Tiempo Real

Ver todos los eventos en desarrollo:

```bash
# En otra terminal (con servidor corriendo)
npm run watch-logs
# O manualmente:
tail -f logs/juan-mecanico.log
```

---

## Próximos Pasos

✅ **Cuando tests locales pasen:**
1. Descommentar validación Twilio
2. Test con ngrok + Twilio sandbox
3. Deploy a GCP Cloud Functions
4. Configurar webhook en Twilio Console a URL de producción
5. Test con conductor real en Twilio sandbox

---

**Última actualización:** 25/04/2026  
**Estado:** Test local completo
