# 🚀 Parking Backend API - Deployment en Koyeb

Backend para sistema de pagos con Braintree y suscripciones.

## 📋 Requisitos

- Node.js 18+ o Bun 1.0+
- Cuenta de Braintree (Sandbox o Production)
- Cuenta de GitHub
- Cuenta de Koyeb (gratuita)

## 🔧 Variables de Entorno

Configura estas variables en Koyeb:

```env
BRAINTREE_MERCHANT_ID=tu_merchant_id
BRAINTREE_PUBLIC_KEY=tu_public_key
BRAINTREE_PRIVATE_KEY=tu_private_key
BRAINTREE_ENVIRONMENT=sandbox
PORT=8000
```

## 🌐 Endpoints

- `GET /` - Health check
- `GET /api/health` - Health check simple
- `GET /api/plans` - Listar planes
- `POST /api/token` - Generar client token
- `POST /api/subscribe` - Crear suscripción
- `GET /api/subscription/status` - Consultar estado
- `PUT /api/subscription/update` - Actualizar suscripción
- `POST /api/subscription/cancel` - Cancelar suscripción
- `POST /api/parking-payment` - Pago único de parqueo

## 🚀 Deploy en Koyeb

### Paso 1: Preparar el repositorio
```bash
git init
git add .
git commit -m "Initial commit - Parking Backend"
```

### Paso 2: Subir a GitHub
1. Crear repositorio en GitHub: https://github.com/new
2. Nombre sugerido: `parking-backend`
3. Ejecutar:
```bash
git remote add origin https://github.com/TU_USUARIO/parking-backend.git
git branch -M main
git push -u origin main
```

### Paso 3: Deploy en Koyeb
1. Ir a https://app.koyeb.com/
2. Crear cuenta con: alexvillalta0108@gmail.com
3. Conectar con GitHub
4. Crear nuevo servicio:
   - **Repository**: Seleccionar `parking-backend`
   - **Branch**: `main`
   - **Build command**: (dejar vacío, usa package.json)
   - **Run command**: `npm start`
   - **Port**: `8000`
   - **Instance type**: Nano (gratuito)

### Paso 4: Configurar Variables de Entorno
En Koyeb → Service → Environment variables:
- `BRAINTREE_MERCHANT_ID`
- `BRAINTREE_PUBLIC_KEY`
- `BRAINTREE_PRIVATE_KEY`
- `BRAINTREE_ENVIRONMENT=sandbox`
- `PORT=8000`

### Paso 5: Deploy
Click en "Deploy" y esperar 2-3 minutos.

## ✅ Verificar Deployment

```bash
curl https://tu-app.koyeb.app/
curl https://tu-app.koyeb.app/api/plans
```

## 📝 Notas

- Plan gratuito de Koyeb: 1 servicio nano, $5.50 de crédito mensual
- El servicio se suspende después de inactividad (se reactiva automáticamente)
- URL pública automática: `https://nombre-servicio.koyeb.app`
