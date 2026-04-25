# DEPLOYMENT — Guía para Lanzar a GCP

**Objetivo:** Deploy de Cloud Function a Google Cloud Platform  
**Tiempo estimado:** 20 minutos  
**Requisitos:** gcloud CLI + credenciales GCP + Twilio

---

## PASO 1: Configurar Google Cloud Project

### 1.1 Crear Project en GCP

```bash
# Si no tienes proyecto, créalo:
gcloud projects create juan-mecanico-prod --name="Juan Mecánico Producción"

# Verificar que fue creado
gcloud projects list
```

### 1.2 Habilitar APIs Necesarias

```bash
# Reemplaza PROJECT_ID con tu proyecto real
export PROJECT_ID=juan-mecanico-prod

# Habilitar Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com \
  --project=$PROJECT_ID

# Habilitar Firestore API
gcloud services enable firestore.googleapis.com \
  --project=$PROJECT_ID

# Habilitar Storage API
gcloud services enable storage.googleapis.com \
  --project=$PROJECT_ID

# Habilitar Artifact Registry (para deploy)
gcloud services enable artifactregistry.googleapis.com \
  --project=$PROJECT_ID
```

### 1.3 Crear Firestore Database

```bash
# Crear database Firestore (modo nativo)
gcloud firestore databases create \
  --region=us-central1 \
  --project=$PROJECT_ID
```

### 1.4 Crear Storage Bucket

```bash
# Bucket para fotos de averías
gsutil mb -p $PROJECT_ID gs://$PROJECT_ID-fotos-mecanicas
```

---

## PASO 2: Preparar .env con Credenciales

### 2.1 Obtener GOOGLE_PROJECT_ID

```bash
# Ya lo tienes: juan-mecanico-prod (o tu proyecto)
echo $PROJECT_ID
```

### 2.2 Obtener FIREBASE_STORAGE_BUCKET

```bash
# Es el nombre del bucket que creaste
echo "gs://$PROJECT_ID-fotos-mecanicas"
# O en formato Firebase:
echo "$PROJECT_ID.appspot.com"
```

### 2.3 Configurar Twilio

1. Ir a [Twilio Console](https://www.twilio.com/console)
2. Obtener:
   - **TWILIO_ACCOUNT_SID** (ej: `ACxxxxx...`)
   - **TWILIO_AUTH_TOKEN** (ej: `xxxxx...`)
3. WhatsApp → Sandbox → Copiar número:
   - **TWILIO_WHATSAPP_NUMBER** (ej: `+14155238886`)

### 2.4 Configurar Gemini API

1. Ir a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crear API Key
3. Copiar: **GEMINI_API_KEY**

### 2.5 Crear .env final

```bash
cd juan-mecanico

# Copiar template
cp .env.example .env

# Editar con tus valores
nano .env
# O usar tu editor favorito

# Contenido final debe verse:
cat .env
```

**Archivo .env completado:**
```
GOOGLE_PROJECT_ID=juan-mecanico-prod
FIREBASE_STORAGE_BUCKET=juan-mecanico-prod.appspot.com
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
GEMINI_API_KEY=AIzaSyxxxxxx
GEMINI_MODEL=gemini-2.0-flash
BOT_NOMBRE=Juan Mecánico
PRIVACY_URL=https://example.com/politica-privacidad.html
MAX_FALLAS_ANTES_ALERTA=3
RATE_LIMIT_POR_HORA=15
```

---

## PASO 3: Instalar Dependencias

```bash
cd functions

# Instalar packages
npm install

# Verificar instalación
npm list
```

---

## PASO 4: Testear Localmente (Optional)

```bash
# Correr en local (port 3000)
npm start

# En otra terminal, test health:
curl http://localhost:3000/health

# Debería retornar:
# {"status":"OK","service":"Juan Mecánico","timestamp":"2026-04-25T..."}
```

---

## PASO 5: Deploy a Cloud Functions

### 5.1 Autenticar gcloud

```bash
# Login en Google
gcloud auth login

# Seleccionar project
gcloud config set project juan-mecanico-prod
```

### 5.2 Deploy la función

```bash
cd functions

# Deploy (reemplaza PROJECT_ID)
gcloud functions deploy handleWhatsApp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point handleWhatsApp \
  --region us-central1 \
  --set-env-vars \
GOOGLE_PROJECT_ID=juan-mecanico-prod,\
FIREBASE_STORAGE_BUCKET=juan-mecanico-prod.appspot.com,\
TWILIO_ACCOUNT_SID=ACxxxxx,\
TWILIO_AUTH_TOKEN=xxxxx,\
TWILIO_WHATSAPP_NUMBER=+14155238886,\
GEMINI_API_KEY=AIzaSyxxxxxx,\
GEMINI_MODEL=gemini-2.0-flash,\
BOT_NOMBRE="Juan Mecánico",\
PRIVACY_URL=https://example.com/politica-privacidad.html,\
MAX_FALLAS_ANTES_ALERTA=3,\
RATE_LIMIT_POR_HORA=15
```

**Salida esperada:**
```
Deploying function (may take a while - up to 2 minutes)...
✓ Deploying Cloud Function handleWhatsApp
...
httpsTrigger:
  url: https://us-central1-juan-mecanico-prod.cloudfunctions.net/handleWhatsApp
status: ACTIVE
```

### 5.3 Obtener URL de la función

```bash
# Copiar la URL de arriba, ej:
# https://us-central1-juan-mecanico-prod.cloudfunctions.net/handleWhatsApp

# O ejecutar:
gcloud functions describe handleWhatsApp \
  --region us-central1 \
  --format='value(httpsTrigger.url)'
```

---

## PASO 6: Configurar Twilio Webhook

1. Ir a [Twilio Console → WhatsApp](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. Bajo "Sandbox Configuration":
3. **When a message comes in:** POST a tu URL
   - Pegar: `https://us-central1-juan-mecanico-prod.cloudfunctions.net/handleWhatsApp`
4. HTTP method: POST
5. Save

---

## PASO 7: Test con Número Real

### 7.1 Configurar Número en Twilio

En Twilio WhatsApp Sandbox:
1. Obtener el número de sandbox: `+14155238886`
2. O usar tu número de WhatsApp Business

### 7.2 Enviar Mensaje de Test

**Opción A: WhatsApp real**
1. Abrir WhatsApp en tu teléfono
2. Enviar mensaje a `+14155238886` (sandbox)
3. El bot debería responder

**Opción B: Verificar logs**

```bash
# Ver logs en tiempo real
gcloud functions logs read handleWhatsApp \
  --limit 50 \
  --follow
```

**Salida esperada:**
```
[WEBHOOK] POST request received
[MSG] De: +56912345678 | Texto: Hola Juan Mecánico
[VALIDACION] Verificando conductor...
[RESPONSE] Enviando respuesta...
```

---

## PASO 8: Configurar Firestore Security Rules

```bash
cd ..

# Deployer rules
gcloud firestore deploy firestore.rules \
  --region=us-central1
```

**firestore.rules debe contener:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conductores/{telefono} {
      allow read, write: if request.auth.uid == telefono;
    }
    match /fallas/{vehiculoId}/activas/{fallaId} {
      allow read, write: if true;  // TODO: restringir por jefe
    }
  }
}
```

---

## 🚨 TROUBLESHOOTING

### "401 Unauthorized" al deploy

```bash
# Re-autenticar
gcloud auth login

# Verificar credenciales
gcloud auth list
```

### "Function not found" después de deploy

```bash
# Esperar 30 segundos y reintentar
sleep 30

# Verificar status
gcloud functions describe handleWhatsApp --region us-central1
```

### Logs vacíos / No responde

```bash
# Verificar que la función existe
gcloud functions list

# Ver últimos 100 logs
gcloud functions logs read handleWhatsApp --limit 100

# Si hay error de auth de Gemini, revisar GEMINI_API_KEY
```

### Twilio no envía mensajes

1. Verificar que URL en Twilio es correcta
2. Verificar que TWILIO_WHATSAPP_NUMBER es correcto
3. En Twilio, ir a Logs para ver requests

---

## ✅ CHECKLIST DEPLOYMENT

- [ ] gcloud CLI instalado
- [ ] Google Cloud Project creado (juan-mecanico-prod)
- [ ] APIs habilitadas (Cloud Functions, Firestore, Storage)
- [ ] .env completado con todas las credenciales
- [ ] npm install ejecutado
- [ ] Función deployada a Cloud Functions
- [ ] URL de función copiada
- [ ] Webhook configurado en Twilio
- [ ] Test con número real exitoso
- [ ] Logs verificados (sin errores)

---

## 📱 TESTING CON TWILIO SANDBOX

### Obtener número para testing

1. Ir a [Twilio WhatsApp Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox)
2. "To use this sandbox, send a WhatsApp message to:
3. Copiar el número (ej: `+14155238886`)
4. Desde tu WhatsApp, enviar mensaje a ese número

### Mensajes de test

```
Hola Juan Mecánico
→ Bot responde con menú

Salí 45230
→ Registra km

Luz roja en el tablero
→ Pide diagnóstico
```

---

## 🔗 REFERENCIAS

- [Google Cloud Functions Docs](https://cloud.google.com/functions/docs)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security)

---

**Última actualización:** 25/04/2026  
**Estado:** Listo para deployment
