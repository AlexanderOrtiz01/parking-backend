/**
 * Script de pruebas para el backend de Braintree
 * Ejecuta: node test-endpoints.js
 */

const API_URL = 'http://localhost:3000';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  try {
    log(`\n🧪 Test: ${name}`, 'cyan');
    log(`   URL: ${url}`, 'blue');
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json();
    
    if (response.ok) {
      log(`   ✅ Status: ${response.status}`, 'green');
      log(`   📦 Respuesta:`, 'green');
      console.log(JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      log(`   ⚠️  Status: ${response.status}`, 'yellow');
      log(`   📦 Respuesta:`, 'yellow');
      console.log(JSON.stringify(data, null, 2));
      return { success: false, data };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  log('\n🚀 ================================================', 'cyan');
  log('🚀 INICIANDO PRUEBAS DEL BACKEND DE BRAINTREE', 'cyan');
  log('🚀 ================================================', 'cyan');

  const results = [];

  // Test 1: Health Check
  const health = await testEndpoint(
    'Health Check',
    `${API_URL}/`
  );
  results.push({ name: 'Health Check', ...health });

  // Test 2: Generar Client Token
  const token = await testEndpoint(
    'Generar Client Token',
    `${API_URL}/api/token`,
    { method: 'POST' }
  );
  results.push({ name: 'Generar Client Token', ...token });

  // Test 3: Procesar Pago con fake-valid-nonce
  const payment1 = await testEndpoint(
    'Procesar Pago (fake-valid-nonce)',
    `${API_URL}/api/payment`,
    {
      method: 'POST',
      body: {
        nonce: 'fake-valid-nonce',
        amount: 19.99,
        userId: 'test-user-123',
        planId: 'premium'
      }
    }
  );
  results.push({ name: 'Procesar Pago (fake-valid-nonce)', ...payment1 });

  // Test 4: Procesar Pago con fake-valid-visa-nonce
  const payment2 = await testEndpoint(
    'Procesar Pago (fake-valid-visa-nonce)',
    `${API_URL}/api/payment`,
    {
      method: 'POST',
      body: {
        nonce: 'fake-valid-visa-nonce',
        amount: 29.99,
        userId: 'test-user-456',
        planId: 'enterprise'
      }
    }
  );
  results.push({ name: 'Procesar Pago (fake-valid-visa-nonce)', ...payment2 });

  // Test 5: Procesar Pago de Parking
  const parkingPayment = await testEndpoint(
    'Procesar Pago de Parking',
    `${API_URL}/api/parking-payment`,
    {
      method: 'POST',
      body: {
        nonce: 'fake-valid-nonce',
        amount: 5.50,
        userId: 'test-user-789',
        entryId: 'entry-123'
      }
    }
  );
  results.push({ name: 'Procesar Pago de Parking', ...parkingPayment });

  // Test 6: Probar nonce declinado
  const declined = await testEndpoint(
    'Procesar Pago Declinado (fake-processor-declined-visa-nonce)',
    `${API_URL}/api/payment`,
    {
      method: 'POST',
      body: {
        nonce: 'fake-processor-declined-visa-nonce',
        amount: 10.00,
        userId: 'test-declined',
        planId: 'basic'
      }
    }
  );
  results.push({ name: 'Procesar Pago Declinado', ...declined });

  // Resumen
  log('\n🚀 ================================================', 'cyan');
  log('🚀 RESUMEN DE PRUEBAS', 'cyan');
  log('🚀 ================================================', 'cyan');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });

  log('\n📊 Estadísticas:', 'cyan');
  log(`   ✅ Exitosos: ${passed}`, 'green');
  log(`   ❌ Fallidos: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`   📈 Total: ${results.length}`, 'blue');

  if (failed === 0) {
    log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!', 'green');
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los logs arriba.', 'yellow');
  }

  log('\n🚀 ================================================\n', 'cyan');
}

// Ejecutar pruebas
log('\n⏳ Esperando que el servidor esté disponible...', 'yellow');
log('   Asegúrate de que el servidor esté corriendo en el puerto 3000', 'yellow');
log('   Ejecuta en otra terminal: node index.js\n', 'yellow');

setTimeout(() => {
  runAllTests().catch(error => {
    log(`\n❌ Error ejecutando pruebas: ${error.message}`, 'red');
    log('   Asegúrate de que el servidor esté corriendo.', 'red');
  });
}, 2000);
