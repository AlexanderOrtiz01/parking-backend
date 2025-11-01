/**
 * Backend API para Braintree Payment Gateway
 * Soporta Sandbox y Production
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const braintree = require('braintree');
const http = require('http');
const https = require('https');
const os = require('os');

// Aumentar timeout global de HTTP/HTTPS
http.globalAgent.maxSockets = Infinity;
https.globalAgent.maxSockets = Infinity;
https.globalAgent.timeout = 60000; // 60 segundos

const app = express();
const PORT = process.env.PORT || 3000;

// Función para obtener la IP local
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Buscar IPv4 que no sea localhost y no sea interna
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Middleware
app.use(cors());
app.use(express.json());

// Validar que las credenciales de Braintree estén configuradas
if (!process.env.BRAINTREE_MERCHANT_ID || !process.env.BRAINTREE_PUBLIC_KEY || !process.env.BRAINTREE_PRIVATE_KEY) {
  console.error('❌ ERROR: Faltan credenciales de Braintree en el archivo .env');
  console.error('   Asegúrate de que .env tenga:');
  console.error('   - BRAINTREE_MERCHANT_ID');
  console.error('   - BRAINTREE_PUBLIC_KEY');
  console.error('   - BRAINTREE_PRIVATE_KEY');
  process.exit(1);
}

// Configurar Braintree Gateway
// NOTA: El SDK de Braintree tiene un timeout interno de ~30 segundos que no se puede cambiar fácilmente
const gateway = new braintree.BraintreeGateway({
  environment: process.env.BRAINTREE_ENVIRONMENT === 'production' 
    ? braintree.Environment.Production 
    : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

// Helper para reintentar llamadas a Braintree con backoff exponencial
async function retryBraintreeCall(fn, maxRetries = 3, initialDelayMs = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`   🔄 Intento ${i + 1}/${maxRetries}...`);
      
      // Crear una promesa con timeout personalizado de 90 segundos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 90 seconds')), 90000);
      });
      
      // Ejecutar la función con timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      
      console.log(`   ✅ Llamada exitosa en intento ${i + 1}`);
      return result;
    } catch (error) {
      lastError = error;
      const isLastAttempt = i === maxRetries - 1;
      const isTimeout = error.message && (
        error.message.includes('timeout') || 
        error.message.includes('timed out') ||
        error.type === 'unexpectedError'
      );
      
      console.error(`   ❌ Error en intento ${i + 1}:`, error.message);
      
      if (isLastAttempt) {
        console.error(`   ⛔ Todos los intentos fallaron`);
        throw error;
      }
      
      if (!isTimeout) {
        // Si no es timeout, no tiene sentido reintentar
        throw error;
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = initialDelayMs * Math.pow(2, i);
      console.log(`   ⏳ Esperando ${delay}ms antes de reintentar...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (req, res) => {
  const localIp = getLocalIpAddress();
  
  res.json({
    status: 'online',
    message: '🚀 Parking Backend API está funcionando',
    environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox',
    version: '1.0.0',
    endpoints: {
      health: 'GET /',
      config: 'GET /api/config',
      token: 'POST /api/token',
      payment: 'POST /api/payment',
      subscription: 'POST /api/subscription',
      cancel: 'POST /api/cancel'
    },
    urls: {
      localhost: `http://localhost:${PORT}`,
      androidEmulator: `http://10.0.2.2:${PORT}`,
      networkIp: `http://${localIp}:${PORT}`
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox'
  });
});

// ============================================
// ENDPOINT DE CONFIGURACIÓN (Para la app)
// ============================================

app.get('/api/config', (req, res) => {
  const localIp = getLocalIpAddress();
  
  res.json({
    success: true,
    backendUrl: `http://${localIp}:${PORT}`,
    urls: {
      localhost: `http://localhost:${PORT}`,
      androidEmulator: `http://10.0.2.2:${PORT}`,
      iosSimulator: `http://localhost:${PORT}`,
      networkIp: `http://${localIp}:${PORT}`
    },
    environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox',
    port: PORT
  });
});

// ============================================
// GENERAR CLIENT TOKEN
// ============================================

app.post('/api/token', async (req, res) => {
  try {
    console.log('🔧 Generando client token de Braintree...');
    console.log('🌐 Conectando a Braintree Sandbox API...');

    const response = await retryBraintreeCall(async () => {
      return await gateway.clientToken.generate({});
    });

    console.log('✅ Client token generado exitosamente');

    res.json({
      success: true,
      clientToken: response.clientToken
    });
  } catch (error) {
    console.error('❌ Error generando token:', error);
    
    // Errores específicos
    let errorMessage = 'Error generando token';
    let statusCode = 500;
    
    const isTimeout = error.message && (
      error.message.includes('timeout') || 
      error.message.includes('timed out')
    );
    
    if (isTimeout || error.type === 'unexpectedError') {
      errorMessage = 'Braintree Sandbox no responde. Intentando de nuevo...';
      console.error('⚠️  TIMEOUT: Braintree Sandbox tardó demasiado');
      console.error('   Posibles causas:');
      console.error('   1. Primera conexión del día (Braintree puede tardar)');
      console.error('   2. Conexión a internet lenta');
      console.error('   3. Braintree Sandbox con problemas temporales');
      console.error('   💡 SOLUCIÓN: Intenta de nuevo en 10 segundos');
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message,
      type: error.type || 'timeout'
    });
  }
});

// ============================================
// PROCESAR PAGO DE SUSCRIPCIÓN
// ============================================

app.post('/api/payment', async (req, res) => {
  try {
    const { nonce, planId, amount, userId } = req.body;

    console.log('💳 Procesando pago de suscripción...', {
      planId,
      amount,
      userId
    });

    // Validar datos requeridos
    if (!nonce || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos (nonce, amount)'
      });
    }

    // Procesar transacción en Braintree
    const result = await gateway.transaction.sale({
      amount: amount.toString(),
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true
      }
    });

    if (result.success) {
      const transactionId = result.transaction.id;
      
      console.log('✅ Pago procesado exitosamente:', {
        transactionId,
        amount,
        status: result.transaction.status
      });

      res.json({
        success: true,
        transactionId: transactionId,
        message: 'Pago procesado exitosamente en Braintree Sandbox',
        transaction: {
          id: transactionId,
          amount: result.transaction.amount,
          status: result.transaction.status,
          type: result.transaction.type,
          createdAt: result.transaction.createdAt
        },
        dashboardUrl: `https://sandbox.braintreegateway.com/merchants/${process.env.BRAINTREE_MERCHANT_ID}/transactions/${transactionId}`
      });
    } else {
      console.error('❌ Error en transacción:', result.message);
      console.error('❌ Detalles del error:', {
        errors: result.errors,
        params: result.params,
        verification: result.verification
      });
      
      res.status(400).json({
        success: false,
        error: 'Error procesando pago',
        message: result.message,
        details: result.errors ? result.errors.deepErrors() : null
      });
    }
  } catch (error) {
    console.error('❌ Error procesando pago:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error procesando pago',
      message: error.message
    });
  }
});

// ============================================
// PROCESAR PAGO DE PARQUEO
// ============================================

app.post('/api/parking-payment', async (req, res) => {
  try {
    const { nonce, amount, userId, entryId } = req.body;

    console.log('🅿️ Procesando pago de parqueo...', {
      amount,
      userId,
      entryId
    });

    // Validar datos requeridos
    if (!nonce || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos (nonce, amount)'
      });
    }

    const result = await gateway.transaction.sale({
      amount: amount.toString(),
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true
      }
    });

    if (result.success) {
      const transactionId = result.transaction.id;
      
      console.log('✅ Pago de parqueo procesado:', {
        transactionId,
        amount
      });

      res.json({
        success: true,
        transactionId: transactionId,
        message: 'Pago de parqueo procesado exitosamente',
        transaction: {
          id: transactionId,
          amount: result.transaction.amount,
          status: result.transaction.status
        },
        dashboardUrl: `https://sandbox.braintreegateway.com/merchants/${process.env.BRAINTREE_MERCHANT_ID}/transactions/${transactionId}`
      });
    } else {
      console.error('❌ Error en pago de parqueo:', result.message);
      console.error('❌ Detalles del error:', {
        errors: result.errors,
        params: result.params
      });
      
      res.status(400).json({
        success: false,
        error: 'Error procesando pago',
        message: result.message,
        details: result.errors ? result.errors.deepErrors() : null
      });
    }
  } catch (error) {
    console.error('❌ Error procesando pago de parqueo:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error procesando pago de parqueo',
      message: error.message
    });
  }
});

// ============================================
// CANCELAR SUSCRIPCIÓN
// ============================================

app.post('/api/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    console.log('❌ Cancelando suscripción...', { subscriptionId });

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere subscriptionId'
      });
    }

    const result = await gateway.subscription.cancel(subscriptionId);

    if (result.success) {
      console.log('✅ Suscripción cancelada exitosamente');

      res.json({
        success: true,
        message: 'Suscripción cancelada exitosamente'
      });
    } else {
      console.error('❌ Error cancelando suscripción:', result.message);
      
      res.status(400).json({
        success: false,
        error: 'Error cancelando suscripción',
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error cancelando suscripción',
      message: error.message
    });
  }
});

// ============================================
// MANEJO DE ERRORES 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: {
      health: 'GET /',
      token: 'POST /api/token',
      payment: 'POST /api/payment',
      parkingPayment: 'POST /api/parking-payment',
      cancel: 'POST /api/cancel'
    }
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  
  console.log('');
  console.log('🚀 ================================');
  console.log('🚀 Parking Backend API');
  console.log('🚀 ================================');
  console.log(`🚀 Servidor corriendo en puerto: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.BRAINTREE_ENVIRONMENT || 'sandbox'}`);
  console.log('🚀 ================================');
  console.log('');
  console.log('📡 URLs de acceso:');
  console.log(`   🖥️  Localhost:          http://localhost:${PORT}`);
  console.log(`   📱 Android Emulator:    http://10.0.2.2:${PORT}`);
  console.log(`   🍎 iOS Simulator:       http://localhost:${PORT}`);
  console.log(`   🌐 IP Local (WiFi):     http://${localIp}:${PORT}`);
  console.log('');
  console.log('� Endpoints disponibles:');
  console.log('   GET  /              → Health check + URLs');
  console.log('   GET  /api/config    → Configuración de URLs');
  console.log('   GET  /api/health    → Health check simple');
  console.log('   POST /api/token     → Generar client token');
  console.log('   POST /api/payment   → Procesar pago de suscripción');
  console.log('   POST /api/parking-payment → Procesar pago de parqueo');
  console.log('   POST /api/cancel    → Cancelar suscripción');
  console.log('');
  console.log('🔐 Braintree configurado:');
  console.log(`   Merchant ID: ${process.env.BRAINTREE_MERCHANT_ID || '(no configurado)'}`);
  console.log(`   Environment: ${process.env.BRAINTREE_ENVIRONMENT || 'sandbox'}`);
  console.log('');
});
