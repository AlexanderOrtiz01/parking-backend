/**
 * Backend API para Braintree Payment Gateway con Suscripciones
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

// Validar credenciales de Braintree
if (!process.env.BRAINTREE_MERCHANT_ID || !process.env.BRAINTREE_PUBLIC_KEY || !process.env.BRAINTREE_PRIVATE_KEY) {
  console.error('❌ ERROR: Faltan credenciales de Braintree en el archivo .env');
  process.exit(1);
}

// Configurar Braintree Gateway
const gateway = new braintree.BraintreeGateway({
  environment: process.env.BRAINTREE_ENVIRONMENT === 'production' 
    ? braintree.Environment.Production 
    : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

// Helper para reintentar llamadas
async function retryBraintreeCall(fn, maxRetries = 3, initialDelayMs = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`   🔄 Intento ${i + 1}/${maxRetries}...`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 90000);
      });
      
      const result = await Promise.race([fn(), timeoutPromise]);
      console.log(`   ✅ Llamada exitosa en intento ${i + 1}`);
      return result;
    } catch (error) {
      lastError = error;
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLastAttempt) {
        throw error;
      }
      
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
    message: '🚀 Parking Backend API - Sistema de Suscripciones',
    environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox',
    version: '2.0.0',
    subscriptionBased: true,
    endpoints: {
      health: 'GET /api/health',
      config: 'GET /api/config',
      token: 'POST /api/token',
      subscribe: 'POST /api/subscribe',
      subscriptionStatus: 'GET /api/subscription/status',
      cancelSubscription: 'POST /api/subscription/cancel',
      updateSubscription: 'PUT /api/subscription/update',
      parkingPayment: 'POST /api/parking-payment',
      plans: 'GET /api/plans'
    },
    urls: {
      localhost: `http://localhost:${PORT}`,
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

app.get('/api/config', (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({
    success: true,
    backendUrl: `http://${localIp}:${PORT}`,
    environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox',
    port: PORT
  });
});

// ============================================
// GENERAR CLIENT TOKEN
// ============================================

app.post('/api/token', async (req, res) => {
  try {
    const { customerId } = req.body;
    console.log('🔧 Generando client token...');

    const tokenOptions = {};
    if (customerId) {
      tokenOptions.customerId = customerId;
    }

    const response = await retryBraintreeCall(async () => {
      return await gateway.clientToken.generate(tokenOptions);
    });

    console.log('✅ Client token generado exitosamente');

    res.json({
      success: true,
      clientToken: response.clientToken
    });
  } catch (error) {
    console.error('❌ Error generando token:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando token',
      message: error.message
    });
  }
});
// ============================================
// TOKENIZAR TARJETA
// ============================================

app.post('/api/tokenize', async (req, res) => {
  try {
    const { cardNumber, expirationMonth, expirationYear, cvv, cardholderName, email } = req.body;

    console.log('🔐 Tokenizando tarjeta...');
    console.log('   Número:', cardNumber.substring(0, 4) + '****' + cardNumber.substring(cardNumber.length - 4));
    console.log('   Expiración:', expirationMonth + '/' + expirationYear);
    console.log('   Titular:', cardholderName);

    // Validar datos requeridos
    if (!cardNumber || !expirationMonth || !expirationYear || !cvv) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos de la tarjeta',
        required: ['cardNumber', 'expirationMonth', 'expirationYear', 'cvv']
      });
    }

    // Tokenizar usando Braintree
    const result = await retryBraintreeCall(async () => {
      // Crear un cliente temporal para tokenizar
      const clientTokenResponse = await gateway.clientToken.generate();
      
      // Nota: En producción real, el cliente debe tokenizar usando braintree-web
      // Este es un workaround para desarrollo
      return await gateway.paymentMethod.create({
        customerId: null,
        paymentMethodNonce: 'fake-valid-nonce', // Braintree SDK genera el nonce real
        creditCard: {
          number: cardNumber,
          expirationMonth: expirationMonth,
          expirationYear: expirationYear,
          cvv: cvv,
          cardholderName: cardholderName || 'Usuario'
        }
      });
    });

    if (!result.success) {
      console.error('❌ Error tokenizando:', result.message);
      return res.status(400).json({
        success: false,
        error: result.message || 'Error tokenizando tarjeta'
      });
    }

    const nonce = result.paymentMethod.nonce;
    console.log('✅ Tarjeta tokenizada - Nonce:', nonce.substring(0, 10) + '...');

    res.json({
      success: true,
      nonce: nonce,
      message: 'Tarjeta tokenizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error tokenizando tarjeta:', error);
    res.status(500).json({
      success: false,
      error: 'Error tokenizando tarjeta',
      message: error.message
    });
  }
});
// ============================================
// OBTENER PLANES
// ============================================

app.get('/api/plans', async (req, res) => {
  try {
    console.log('📋 Obteniendo planes...');

    const result = await retryBraintreeCall(async () => {
      return await gateway.plan.all();
    });

    console.log(`✅ ${result.length} planes obtenidos`);

    res.json({
      success: true,
      plans: result.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currencyIsoCode: plan.currencyIsoCode,
        billingFrequency: plan.billingFrequency,
        numberOfBillingCycles: plan.numberOfBillingCycles,
        trialPeriod: plan.trialPeriod || false,
        trialDuration: plan.trialDuration || null,
        trialDurationUnit: plan.trialDurationUnit || null
      }))
    });
  } catch (error) {
    console.error('❌ Error obteniendo planes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo planes',
      message: error.message
    });
  }
});

// ============================================
// CREAR SUSCRIPCIÓN
// ============================================

app.post('/api/subscribe', async (req, res) => {
  try {
    const { paymentMethodNonce, planId, userId, email } = req.body;

    console.log('💳 Creando suscripción...', { planId, userId, email });

    if (!paymentMethodNonce || !planId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos',
        required: ['paymentMethodNonce', 'planId', 'userId']
      });
    }

    // Paso 1: Verificar/crear cliente
    let customer;
    try {
      customer = await gateway.customer.find(userId);
      console.log('✅ Cliente encontrado:', userId);
    } catch (error) {
      if (error.type === 'notFoundError') {
        console.log('🔧 Creando nuevo cliente...');
        const customerResult = await gateway.customer.create({
          id: userId,
          email: email,
          paymentMethodNonce: paymentMethodNonce
        });

        if (!customerResult.success) {
          throw new Error('Error creando cliente: ' + customerResult.message);
        }

        customer = customerResult.customer;
        console.log('✅ Cliente creado');
      } else {
        throw error;
      }
    }

    // Paso 2: Obtener/crear método de pago
    let paymentMethodToken;
    if (customer.paymentMethods && customer.paymentMethods.length > 0) {
      paymentMethodToken = customer.paymentMethods[0].token;
      console.log('✅ Usando método de pago existente');
    } else {
      console.log('🔧 Creando método de pago...');
      const paymentMethodResult = await gateway.paymentMethod.create({
        customerId: userId,
        paymentMethodNonce: paymentMethodNonce
      });

      if (!paymentMethodResult.success) {
        throw new Error('Error creando método de pago');
      }

      paymentMethodToken = paymentMethodResult.paymentMethod.token;
      console.log('✅ Método de pago creado');
    }

    // Paso 3: Crear suscripción
    console.log('🔧 Creando suscripción en Braintree...');
    const subscriptionResult = await gateway.subscription.create({
      paymentMethodToken: paymentMethodToken,
      planId: planId
    });

    if (!subscriptionResult.success) {
      console.error('❌ Error creando suscripción:', subscriptionResult.message);
      return res.status(400).json({
        success: false,
        error: 'Error creando suscripción',
        message: subscriptionResult.message
      });
    }

    const subscription = subscriptionResult.subscription;
    console.log('✅ Suscripción creada:', subscription.id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.planId,
        price: subscription.price,
        nextBillingDate: subscription.nextBillingDate,
        firstBillingDate: subscription.firstBillingDate
      },
      message: 'Suscripción creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando suscripción',
      message: error.message
    });
  }
});

// ============================================
// CONSULTAR ESTADO DE SUSCRIPCIÓN
// ============================================

app.get('/api/subscription/status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId es requerido'
      });
    }

    console.log(`🔍 Consultando suscripción: ${userId}`);

    try {
      const customer = await gateway.customer.find(userId);
      
      const subscriptions = customer.paymentMethods
        .flatMap(pm => pm.subscriptions || [])
        .filter(sub => ['Active', 'Pending'].includes(sub.status));

      if (subscriptions.length > 0) {
        const sub = subscriptions[0];
        console.log('✅ Suscripción activa:', sub.id);
        
        return res.json({
          success: true,
          subscription: {
            id: sub.id,
            status: sub.status,
            planId: sub.planId,
            price: sub.price,
            nextBillingDate: sub.nextBillingDate,
            isPremium: true
          }
        });
      }
      
      console.log('ℹ️  Sin suscripción activa');
      return res.json({
        success: true,
        subscription: {
          status: 'free',
          plan: 'free',
          isPremium: false
        }
      });
      
    } catch (error) {
      if (error.type === 'notFoundError') {
        return res.json({
          success: true,
          subscription: {
            status: 'new_user',
            plan: 'free',
            isPremium: false
          }
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Error consultando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error consultando suscripción',
      message: error.message
    });
  }
});

// ============================================
// ACTUALIZAR SUSCRIPCIÓN
// ============================================

app.put('/api/subscription/update', async (req, res) => {
  try {
    const { subscriptionId, newPlanId } = req.body;

    if (!subscriptionId || !newPlanId) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId y newPlanId son requeridos'
      });
    }

    console.log(`🔄 Actualizando suscripción ${subscriptionId} a ${newPlanId}`);

    const result = await gateway.subscription.update(subscriptionId, {
      planId: newPlanId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Error actualizando suscripción',
        message: result.message
      });
    }

    console.log('✅ Suscripción actualizada');

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente',
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status,
        planId: result.subscription.planId,
        price: result.subscription.price,
        nextBillingDate: result.subscription.nextBillingDate
      }
    });
  } catch (error) {
    console.error('❌ Error actualizando suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando suscripción',
      message: error.message
    });
  }
});

// ============================================
// CANCELAR SUSCRIPCIÓN
// ============================================

app.post('/api/subscription/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId es requerido'
      });
    }

    console.log(`❌ Cancelando suscripción: ${subscriptionId}`);

    const result = await gateway.subscription.cancel(subscriptionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Error cancelando suscripción',
        message: result.message
      });
    }

    console.log('✅ Suscripción cancelada');

    res.json({
      success: true,
      message: 'Suscripción cancelada exitosamente',
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status
      }
    });
  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    
    if (error.type === 'notFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Suscripción no encontrada',
        subscriptionId: req.body.subscriptionId
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error cancelando suscripción',
      message: error.message
    });
  }
});

// ============================================
// PAGO ÚNICO DE PARQUEO
// ============================================

app.post('/api/parking-payment', async (req, res) => {
  try {
    const { nonce, amount, userId, entryId } = req.body;

    console.log('🅿️  Procesando pago de parqueo...', { amount, userId, entryId });

    if (!nonce || !amount || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }

    let customerId = userId;
    try {
      await gateway.customer.find(customerId);
    } catch (error) {
      if (error.type === 'notFoundError') {
        const customerResult = await gateway.customer.create({ id: customerId });
        if (!customerResult.success) {
          throw new Error('Error creando cliente');
        }
      } else {
        throw error;
      }
    }

    const result = await gateway.transaction.sale({
      amount: amount.toString(),
      paymentMethodNonce: nonce,
      customerId: customerId,
      options: {
        submitForSettlement: true
      }
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Pago rechazado',
        message: result.message
      });
    }

    console.log('✅ Pago de parqueo procesado:', result.transaction.id);

    res.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        status: result.transaction.status
      },
      message: 'Pago procesado exitosamente'
    });
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
// 404
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: {
      health: 'GET /',
      config: 'GET /api/config',
      token: 'POST /api/token',
      subscribe: 'POST /api/subscribe',
      subscriptionStatus: 'GET /api/subscription/status',
      cancelSubscription: 'POST /api/subscription/cancel',
      updateSubscription: 'PUT /api/subscription/update',
      parkingPayment: 'POST /api/parking-payment',
      plans: 'GET /api/plans'
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
  console.log('📋 Endpoints de Suscripciones:');
  console.log('   GET  /              → Health check + URLs');
  console.log('   GET  /api/config    → Configuración de URLs');
  console.log('   GET  /api/health    → Health check simple');
  console.log('   POST /api/token     → Generar client token');
  console.log('   POST /api/subscribe → Crear suscripción');
  console.log('   GET  /api/subscription/status → Consultar suscripción');
  console.log('   PUT  /api/subscription/update → Actualizar suscripción');
  console.log('   POST /api/subscription/cancel → Cancelar suscripción');
  console.log('   POST /api/parking-payment → Pago único de parqueo');
  console.log('   GET  /api/plans     → Listar planes');
  console.log('');
  console.log('🔐 Braintree configurado:');
  console.log(`   Merchant ID: ${process.env.BRAINTREE_MERCHANT_ID || '(no configurado)'}`);
  console.log(`   Environment: ${process.env.BRAINTREE_ENVIRONMENT || 'sandbox'}`);
  console.log('');
});
