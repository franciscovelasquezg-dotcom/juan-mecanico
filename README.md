# 🔧 JUAN MECÁNICO — Desarrollo Phase 1

Bot WhatsApp para diagnóstico de fallas en flotas PYME (Twilio + Gemini + Firestore)

**Estado:** En desarrollo (25/04/2026)  
**Timeline:** Día 1-10  
**Líderes:** Andrés Castillo (Planificador) + Carmen Vidal (Supervisora)

---

## 📋 QUICK START

### Setup Local

```bash
# 1. Clonar repo
git clone https://github.com/franciscovelasquezg-dotcom/juan-mecanico.git
cd juan-mecanico/functions

# 2. Instalar dependencias
npm install

# 3. Crear .env
cp ../.env.example ../.env
# Editar .env con credenciales reales

# 4. Correr localmente
npm start
# Acceso: http://localhost:3000/health
```

### Deploy a Google Cloud

```bash
# 1. Autenticar
gcloud auth login
gcloud config set project YOUR-PROJECT-ID

# 2. Deploy
npm run deploy

# 3. Obtener URL
gcloud functions describe handleWhatsApp --region=us-central1
```

### Configurar Webhook Twilio

1. Ir a [Twilio Console](https://www.twilio.com/console)
2. WhatsApp → Sandbox Settings
3. Cuando mensajes lleguen, POST a: `https://YOUR-FUNCTION-URL/webhook`
4. HTTP method: POST

### Testear Localmente (RECOMENDADO ANTES DE DEPLOY)

Ver [TEST_WEBHOOK.md](functions/TEST_WEBHOOK.md) para guía completa de testing local:

```bash
cd functions
npm start
# En otra terminal:
curl http://localhost:3000/health
curl -X POST http://localhost:3000/webhook -d "From=whatsapp:+569..."
```

---

## 📁 ESTRUCTURA

```
juan-mecanico/
├── functions/
│   ├── index.js              ← Entry point principal (webhook + flujos)
│   ├── whatsapp.js           ← Twilio send/receive ✅
│   ├── validacion.js         ← Verificar conductor ✅
│   ├── intencion.js          ← Detectar intención (Gemini) ✅
│   ├── firestore.js          ← CRUD Firestore ✅
│   ├── flujos.js             ← Procesar flujos (TESTIGO/AVERIA/KM/FOTO) ✅
│   ├── prompts.js            ← Prompts Gemini ✅
│   ├── gemini.js             ← Llamadas Gemini ✅
│   ├── TEST_WEBHOOK.md       ← Guía test local
│   ├── package.json
│   └── .env.example
├── DEPLOYMENT.md             ← Deploy a GCP paso a paso
├── firestore.rules           ← Security rules (próximo)
├── firebase.json             ← Config Firebase (próximo)
└── README.md
```

---

## 🚀 ROADMAP FASE 1

### ✅ Paso 1: Setup GCP + Twilio (EN CURSO)
- [x] Crear estructura proyecto
- [x] package.json + dependencias
- [ ] Crear proyecto GCP
- [ ] Habilitar Cloud Functions, Firestore, Storage
- [ ] Cuenta Twilio (sandbox)
- [ ] Deploy función vacía

### ⏳ Paso 2: Webhook Twilio (EN DESARROLLO)
- [x] Implementar `whatsapp.js` completo
- [x] GET /webhook con validación Twilio
- [x] POST /webhook con procesamiento de mensajes
- [x] Flujos inteligentes (TESTIGO, AVERIA, KM, FOTO)
- [x] Test guide para desarrollo local
- [ ] Test con número real en Twilio sandbox
- [ ] Test con conductor real registrado

### ⏳ Paso 3: PDPL Flow (Próximo)
- [ ] Primer mensaje: consentimiento PDPL
- [ ] `aceptoPDPL` en Firestore
- [ ] Validar aceptación en todos los flujos
- [ ] Test completo

---

## 🔐 CREDENCIALES REQUERIDAS

### Twilio
```
TWILIO_ACCOUNT_SID=     # De twilio.com/console
TWILIO_AUTH_TOKEN=      # De twilio.com/console
TWILIO_WHATSAPP_NUMBER= # +14155238886 (sandbox) o tu número
```

### Google Cloud
```
GOOGLE_PROJECT_ID=       # Tu proyecto GCP
FIREBASE_STORAGE_BUCKET= # nombre.appspot.com
```

### Gemini
```
GEMINI_API_KEY=    # De AI Studio
GEMINI_MODEL=      # gemini-2.0-flash (o 2.5-flash)
```

---

## 📊 ESTADO ACTUAL

| Componente | Status | Owner |
|-----------|--------|-------|
| Estructura base | ✅ DONE | Claude |
| Validación conductor | ✅ DONE | Claude |
| Detección intención | ✅ DONE | Claude |
| Twilio webhook | ⏳ IN PROGRESS | Claude |
| PDPL compliance | ⏳ IN PROGRESS | Andrea (Paralelo) |
| Validación mercado | ⏳ IN PROGRESS | Catalina (Paralelo) |

---

## 🎯 SUCCESS CRITERIA FASE 1

- ✅ Twilio sandbox funcional (10+ mensajes)
- ✅ Gemini responde >95% accuracy
- ✅ 3 conductores beta testing sin problemas
- ✅ 0 incidentes PDPL
- ✅ Completado en 10 días

---

## 📞 CONTACTOS

| Rol | Persona | Slack/Email |
|-----|---------|-----------|
| Planificador | Andrés Castillo | |
| Supervisora | Carmen Vidal | |
| CTO Advisor | Rodrigo Fuenzalida | |
| Security | Andrea Espinoza | |
| Marketing | Catalina Soto | |

---

## 🔗 REFERENCIAS

- [Especificación Completa](../gran-consejo/proyectos/juan-mecanico/spec.md)
- [Estado del Proyecto](../gran-consejo/proyectos/juan-mecanico/estado.md)
- [Sesión Consejo](../gran-consejo/proyectos/juan-mecanico/sesiones/sesion-001-especificacion-consejo.md)
- [Documentación PDPL](../gran-consejo/consejo/especialistas/DEPARTAMENTO-SEGURIDAD.md)

---

**Creado:** 25/04/2026  
**Última actualización:** 25/04/2026  
**Próximo milestone:** Twilio webhook funcional (Día 2)
