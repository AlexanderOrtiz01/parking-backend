# 🚀 Parking Backend API

Backend para integración con Braintree Payment Gateway con sistema de **Suscripciones**.

**🌐 URL de Producción:** https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app

---

## 📋 Características

✅ Sistema de suscripciones recurrentes con Braintree  
✅ Integración con Braintree Sandbox/Production  
✅ Procesamiento de pagos de parqueo (transacciones únicas)  
✅ Generación de client tokens  
✅ Consulta y gestión de suscripciones  
✅ Cancelación de suscripciones  
✅ CORS habilitado para React Native  
✅ Variables de entorno seguras  
✅ Desplegado en Koyeb  

---

## 🔧 Instalación Local

### Requisitos previos:
- [Node.js](https://nodejs.org) v18 o superior
- [Bun](https://bun.sh) v1.0.0 o superior (opcional)

### 1. Instalar dependencias:

```bash
npm install
# o con bun
bun install
```

### 2. Configurar variables de entorno:

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Braintree Sandbox:

```env
BRAINTREE_ENVIRONMENT=sandbox
BRAINTREE_MERCHANT_ID=your_merchant_id_here
BRAINTREE_PUBLIC_KEY=your_public_key_here
BRAINTREE_PRIVATE_KEY=your_private_key_here
PORT=3000
```

**📌 Obtener credenciales:**
1. Ve a https://sandbox.braintreegateway.com/login
2. Settings → API Keys
3. Copia: Merchant ID, Public Key, Private Key

### 3. Iniciar servidor:

```bash
npm start
# o con bun
bun start
```

O en modo desarrollo con hot reload:

```bash
bun dev
```

El servidor estará corriendo en: `http://localhost:3000`

---

## 📡 Endpoints Disponibles

**Base URL:** `https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app`

### 🔍 Health Check

**GET /**
```bash
curl https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/
```

Response:
```json
{
  "status": "online",
  "message": "🚀 Parking Backend API con Suscripciones está funcionando",
  "environment": "sandbox",
  "version": "2.0.0",
  "subscriptionBased": true
}
```

---

### � Listar Planes

**GET /api/plans**
```bash
curl https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/plans
```

Response:
```json
{
  "success": true,
  "plans": [
    {
      "id": "premium-monthly",
      "name": "Premium Mensual",
      "price": "14.99",
      "currencyIsoCode": "USD"
    }
  ]
}
```

---

### �🔑 Generar Client Token

**POST /api/token**
```bash
curl -X POST https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/token \
  -H "Content-Type: application/json" \
  -d '{"customerId":"user123"}'
```

Request:
```json
{
  "customerId": "user123"  // Opcional
}
```

Response:
```json
{
  "success": true,
  "clientToken": "eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9u..."
}
```

---

### 💳 Crear Suscripción

**POST /api/subscribe**
```bash
curl -X POST https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethodNonce": "fake-valid-nonce",
    "planId": "premium-monthly",
    "userId": "user123",
    "email": "user@example.com"
  }'
```

Request:
```json
{
  "paymentMethodNonce": "tokenize_from_braintree",
  "planId": "premium-monthly",
  "userId": "firebase_user_id",
  "email": "user@example.com"
}
```

Response:
```json
{
  "success": true,
  "subscription": {
    "id": "xyz789",
    "status": "Active",
    "planId": "premium-monthly",
    "price": "14.99",
    "nextBillingDate": "2025-12-01"
  }
}
```

---

### 🔍 Consultar Estado de Suscripción

**GET /api/subscription/status?userId=user123**
```bash
curl "https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/subscription/status?userId=user123"
```

Response (con suscripción):
```json
{
  "success": true,
  "subscription": {
    "id": "xyz789",
    "status": "Active",
    "planId": "premium-monthly",
    "isPremium": true
  }
}
```

Response (sin suscripción):
```json
{
  "success": true,
  "subscription": {
    "status": "free",
    "isPremium": false
  }
}
```

---

### ❌ Cancelar Suscripción

**POST /api/subscription/cancel**
```bash
curl -X POST https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/subscription/cancel \
  -H "Content-Type: application/json" \
  -d '{"subscriptionId":"xyz789"}'
```

Request:
```json
{
  "subscriptionId": "xyz789"
}
```

Response:
```json
{
  "success": true,
  "message": "Suscripción cancelada exitosamente"
}
```

---

### 🅿️ Pago de Parqueo (Transacción Única)

**POST /api/parking-payment**
```bash
curl -X POST https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/parking-payment \
  -H "Content-Type: application/json" \
  -d '{
    "nonce": "fake-valid-nonce",
    "amount": "5.00",
    "userId": "user123",
    "entryId": "entry456"
  }'
```

Request:
```json
{
  "nonce": "payment_method_nonce",
  "amount": "5.00",
  "userId": "user123",
  "entryId": "entry456"
}
```

Response:
```json
{
  "success": true,
  "transaction": {
    "id": "abc123",
    "amount": "5.00",
    "status": "submitted_for_settlement"
  },
  "message": "Pago de parqueo procesado exitosamente"
}
```

---

## � Integración con React Native

### 1. Instalar Braintree Drop-in:

```bash
npm install react-native-braintree-dropin-ui
```

### 2. Configurar API URL:

```javascript
// config.js
export const API_URL = 'https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app';
```

### 3. Ejemplo de uso:

```javascript
import BraintreeDropIn from 'react-native-braintree-dropin-ui';
import { API_URL } from './config';

// Obtener client token
const getClientToken = async (userId) => {
  const response = await fetch(`${API_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId: userId })
  });
  const data = await response.json();
  return data.clientToken;
};

// Crear suscripción
const createSubscription = async (userId, email) => {
  try {
    const clientToken = await getClientToken(userId);
    
    const result = await BraintreeDropIn.show({
      clientToken: clientToken,
      vaultManager: true
    });
    
    const response = await fetch(`${API_URL}/api/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethodNonce: result.nonce,
        planId: 'premium-monthly',
        userId: userId,
        email: email
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log('✅ Suscripción creada:', data.subscription.id);
      return data.subscription;
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Consultar estado de suscripción
const checkStatus = async (userId) => {
  const response = await fetch(`${API_URL}/api/subscription/status?userId=${userId}`);
  const data = await response.json();
  return data.subscription;
};
```

---

## �🚀 Deploy en Koyeb

✅ **Ya está desplegado en:** https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app

### Pasos para deploy (ya completados):

1. ✅ Crear cuenta en Koyeb (https://app.koyeb.com)
2. ✅ Conectar repositorio de GitHub
3. ✅ Configurar variables de entorno en Dashboard
4. ✅ Deploy automático desde GitHub
5. ✅ URL pública generada

### Variables de entorno configuradas en Koyeb:

```
BRAINTREE_ENVIRONMENT=sandbox
BRAINTREE_MERCHANT_ID=****** (configurado)
BRAINTREE_PUBLIC_KEY=****** (configurado)
BRAINTREE_PRIVATE_KEY=****** (SECRET, configurado)
PORT=8000
```

⚠️ **SEGURIDAD:** Las credenciales reales están configuradas en el dashboard de Koyeb, **NO en el código ni en GitHub**

---

## 🔐 Seguridad y Mejores Prácticas

### ✅ Lo que SÍ está seguro:

- ✅ Credenciales almacenadas en variables de entorno de Koyeb
- ✅ `.env` en `.gitignore` (no se sube a GitHub)
- ✅ Repo privado en GitHub
- ✅ Private Key marcada como SECRET en Koyeb

### ⚠️ NUNCA hagas esto:

- ❌ Subir credenciales al README
- ❌ Hacer commit de archivo `.env`
- ❌ Exponer Private Key en el código
- ❌ Compartir credenciales por Slack/Discord
- ❌ Hacer el repo público sin sanitizar

### 🔄 Cambiar a Producción:

Cuando estés listo:

1. Obtén credenciales de producción: https://www.braintreegateway.com
2. En Koyeb → Settings → Environment variables:
   ```
   BRAINTREE_ENVIRONMENT=production
   BRAINTREE_MERCHANT_ID=prod_merchant_id
   BRAINTREE_PUBLIC_KEY=prod_public_key
   BRAINTREE_PRIVATE_KEY=prod_private_key
   ```
3. Redeploy automático

---

## 🔍 Verificar Suscripciones en Braintree

### Sandbox (actual):
https://sandbox.braintreegateway.com → Subscriptions

### Production (futuro):
https://www.braintreegateway.com → Subscriptions

---

## 🧪 Testing Local

### Con curl (Local):

```bash
# Health check
curl http://localhost:3000/

# Generar token
curl -X POST http://localhost:3000/api/token

# Crear suscripción
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"paymentMethodNonce":"fake-valid-nonce","planId":"premium-monthly","userId":"user123","email":"user@example.com"}'
```

### Con curl (Producción Koyeb):

```bash
# Health check
curl https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/

# Listar planes
curl https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/plans

# Crear suscripción
curl -X POST https://strategic-anthiathia-sistema-parqueo-sv-b15a404b.koyeb.app/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"paymentMethodNonce":"fake-valid-nonce","planId":"premium-monthly","userId":"user123","email":"user@example.com"}'
```

### Con Postman:

1. Importa la colección (endpoints arriba)
2. Prueba cada endpoint
3. Verifica respuestas

---

## 📊 Logs

El servidor muestra logs en tiempo real:

```
🚀 ================================
🚀 Parking Backend API
🚀 ================================
🚀 Servidor corriendo en puerto: 3000
🚀 Environment: sandbox
🚀 URL Local: http://localhost:3000
🚀 ================================

📡 Endpoints disponibles:
   GET  /                          → Health check
   POST /api/token                 → Generar client token
   POST /api/subscribe             → Crear suscripción
   GET  /api/subscription/status   → Consultar estado
   POST /api/subscription/cancel   → Cancelar suscripción
   POST /api/parking-payment       → Pago de parqueo
   GET  /api/plans                 → Listar planes
   POST /api/parking-payment → Procesar pago de parqueo
   POST /api/cancel    → Cancelar suscripción

🔐 Braintree configurado:
   Merchant ID: g5st6kgs4gdtmxkg
   Environment: sandbox
```

---

## 🔍 Verificar Transacciones en Braintree

### Sandbox:
https://sandbox.braintreegateway.com → Transactions

### Production:
https://www.braintreegateway.com → Transactions

---

## ⚠️ Notas Importantes

1. **Nunca expongas tu Private Key** en el código del frontend
2. **Usa variables de entorno** siempre (`.env` o Railway Dashboard)
3. **No subas `.env` a GitHub** (está en `.gitignore`)
4. **Para producción**, cambia las credenciales y el environment
5. **Railway plan gratuito** incluye $5 USD/mes de crédito (~500 horas)

---

## 📦 Dependencias

- **express**: Servidor HTTP
- **braintree**: SDK de Braintree
- **cors**: Habilitar CORS para React Native
- **dotenv**: Variables de entorno

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'braintree'"
```bash
npm install
```

### Error: "BRAINTREE_MERCHANT_ID is not defined"
- Verifica que el archivo `.env` existe
- Verifica que las variables están configuradas

### Error: "Transaction declined"
- Estás usando tarjetas de prueba correctas? (ej: 4111 1111 1111 1111)
- Verifica que estás en Sandbox mode

### Railway deploy falla:
- Verifica que las variables de entorno están configuradas en Railway Dashboard
- Revisa los logs en Railway para ver el error específico

---

## 📞 Soporte

Para issues o preguntas, contacta al desarrollador.

---

## 📄 Licencia

MIT

---

**¡Backend listo para Railway! 🚀**
