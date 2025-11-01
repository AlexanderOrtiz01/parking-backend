# 🚀 Setup del Backend - Para Todo el Equipo

## ✅ Configuración Automática de URLs

El backend ahora **detecta automáticamente** la IP local de cada desarrollador. No necesitas configurar IPs manualmente.

---

## 📦 Instalación (Para Nuevos Desarrolladores)

### 1. Clonar los Repositorios

```bash
# Backend
git clone [URL_DEL_BACKEND_REPO]
cd Parking-Backend
npm install

# App (en otra carpeta)
git clone [URL_DEL_APP_REPO]
cd Parking-Project
npm install
```

---

### 2. Configurar Variables de Entorno (Backend)

Copia el archivo `.env.example` a `.env` (si existe) o crea el archivo `.env`:

```env
BRAINTREE_ENVIRONMENT=sandbox
BRAINTREE_MERCHANT_ID=g5st6kgs4gdtmxkg
BRAINTREE_PUBLIC_KEY=ndbddy6qtzk6p9tj
BRAINTREE_PRIVATE_KEY=64d566fe01360382c6b0fe91932d1d96
PORT=3000
```

⚠️ **Importante:** No subir el archivo `.env` a Git (ya está en `.gitignore`)

---

### 3. Iniciar el Backend

```bash
cd Parking-Backend
node index.js
```

**Verás algo como:**

```
🚀 ================================
🚀 Parking Backend API
🚀 ================================
🚀 Servidor corriendo en puerto: 3000
🚀 Environment: sandbox
🚀 ================================

📡 URLs de acceso:
   🖥️  Localhost:          http://localhost:3000
   📱 Android Emulator:    http://10.0.2.2:3000
   🍎 iOS Simulator:       http://localhost:3000
   🌐 IP Local (WiFi):     http://192.168.X.X:3000

💡 Para tu equipo:
   1. Clonar el repo y ejecutar: npm install
   2. Copiar .env.example a .env (si aplica)
   3. Ejecutar: node index.js
   4. La app detectará automáticamente la URL correcta
```

La **IP Local** será diferente para cada desarrollador. Esto es normal y automático.

---

### 4. Iniciar la App

En otra terminal:

```bash
cd Parking-Project
npm start
# O con bun:
bun start
```

---

## 🎯 Cómo Funciona la Detección Automática

### En el Backend:

El servidor detecta automáticamente la IP local usando `os.networkInterfaces()` y:
- Escucha en `0.0.0.0:3000` (todas las interfaces)
- Muestra las URLs disponibles al iniciar
- Provee un endpoint `/api/config` con las URLs

### En la App:

La app usa la URL correcta según la plataforma:

```typescript
// Detección automática:
- Android Emulator → http://10.0.2.2:3000
- iOS Simulator    → http://localhost:3000
- Web             → http://localhost:3000
- Producción      → https://tu-app.railway.app
```

**No necesitas cambiar nada**. Todo es automático.

---

## 🧪 Verificar que Funciona

### Desde tu navegador:

Abre: http://localhost:3000

Deberías ver:

```json
{
  "status": "online",
  "message": "🚀 Parking Backend API está funcionando",
  "environment": "sandbox",
  "urls": {
    "localhost": "http://localhost:3000",
    "androidEmulator": "http://10.0.2.2:3000",
    "networkIp": "http://192.168.X.X:3000"
  }
}
```

### Desde la app:

1. Inicia el backend
2. Inicia la app
3. Ve a: **Perfil → Suscripción → 🧪 Probar Sistema de Pagos**
4. Deberías ver el banner verde: ✅ Backend Local - Transacciones REALES
5. Completa un pago de prueba
6. Verifica en https://sandbox.braintreegateway.com

---

## 📱 Plataformas Soportadas

| Plataforma | URL del Backend | Estado |
|------------|----------------|--------|
| **Android Emulator** | `http://10.0.2.2:3000` | ✅ Automático |
| **iOS Simulator** | `http://localhost:3000` | ✅ Automático |
| **Web (Expo)** | `http://localhost:3000` | ✅ Automático |
| **Dispositivo Físico** | `http://TU_IP:3000` | ⚠️ Manual* |

*Para dispositivo físico: Ambos (PC y dispositivo) deben estar en la misma WiFi.

---

## 🔧 Troubleshooting

### Error: "Network request failed"

**Causa:** El backend no está corriendo.

**Solución:**
```bash
cd Parking-Backend
node index.js
```

---

### Error: "Cannot find module"

**Causa:** No se instalaron las dependencias.

**Solución:**
```bash
cd Parking-Backend
npm install
```

---

### Error: "Port 3000 already in use"

**Causa:** Ya hay algo corriendo en el puerto 3000.

**Solución:**

Opción 1 - Cambiar puerto:
```bash
# En el archivo .env
PORT=3001
```

Opción 2 - Detener el proceso:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [NUMERO_PID] /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

### No aparecen transacciones en Braintree

**Causa:** Las credenciales pueden estar mal configuradas.

**Solución:**
1. Verifica el archivo `.env`
2. Ejecuta el script de diagnóstico:
   ```bash
   node diagnose.js
   ```
3. Debe mostrar: ✅ Conexión exitosa

---

## 📚 Estructura del Proyecto (Backend)

```
Parking-Backend/
├── index.js              # Servidor principal
├── package.json          # Dependencias
├── .env                  # Credenciales (NO subir a Git)
├── .env.example          # Plantilla de .env
├── .gitignore           # Archivos ignorados
├── diagnose.js          # Script de prueba
├── test-endpoints.js    # Tests automatizados
└── README.md            # Esta documentación
```

---

## 🚀 Deploy a Producción (Railway)

Cuando estés listo para producción:

1. **Push a GitHub:**
   ```bash
   git push origin main
   ```

2. **Conectar con Railway:**
   - Ve a https://railway.app
   - Conecta tu repositorio
   - Railway hará deploy automático

3. **Configurar Variables de Entorno en Railway:**
   - `BRAINTREE_ENVIRONMENT=sandbox` (o production)
   - `BRAINTREE_MERCHANT_ID=...`
   - `BRAINTREE_PUBLIC_KEY=...`
   - `BRAINTREE_PRIVATE_KEY=...`

4. **Actualizar la App:**
   ```typescript
   // braintreeServiceBackend.ts
   const BACKEND_URL = __DEV__ 
     ? getBackendUrl()  // Detección automática
     : 'https://tu-app.railway.app';  // URL de Railway
   ```

---

## 📝 Para Agregar al README.md

Agrega esto al README.md principal del proyecto:

```markdown
## 🏃‍♂️ Quick Start

### Backend
```bash
cd Parking-Backend
npm install
node index.js
```

### App
```bash
cd Parking-Project
npm install
npm start
```

La app se conectará automáticamente al backend local.
```

---

## ✅ Checklist para Nuevos Desarrolladores

- [ ] Clonar backend y app
- [ ] Instalar dependencias (`npm install` en ambos)
- [ ] Configurar `.env` en el backend
- [ ] Iniciar backend (`node index.js`)
- [ ] Iniciar app (`npm start`)
- [ ] Verificar conexión (http://localhost:3000)
- [ ] Probar pago en la app
- [ ] Verificar transacción en Braintree Dashboard

---

**¡Listo! Cualquier miembro del equipo puede clonar y correr sin configuración adicional!** 🎉
