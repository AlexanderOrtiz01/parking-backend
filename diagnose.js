/**
 * Script de diagnóstico para verificar conexión con Braintree
 */

require('dotenv').config();
const braintree = require('braintree');

console.log('🔍 ======================================');
console.log('🔍 DIAGNÓSTICO DE BRAINTREE');
console.log('🔍 ======================================\n');

// Verificar credenciales
console.log('📋 1. Verificando credenciales en .env...');
console.log(`   MERCHANT_ID: ${process.env.BRAINTREE_MERCHANT_ID ? '✅ Configurado' : '❌ Falta'}`);
console.log(`   PUBLIC_KEY: ${process.env.BRAINTREE_PUBLIC_KEY ? '✅ Configurado' : '❌ Falta'}`);
console.log(`   PRIVATE_KEY: ${process.env.BRAINTREE_PRIVATE_KEY ? '✅ Configurado' : '❌ Falta'}`);
console.log(`   ENVIRONMENT: ${process.env.BRAINTREE_ENVIRONMENT || 'sandbox'}`);
console.log('');

if (!process.env.BRAINTREE_MERCHANT_ID || !process.env.BRAINTREE_PUBLIC_KEY || !process.env.BRAINTREE_PRIVATE_KEY) {
  console.error('❌ ERROR: Faltan credenciales. Verifica tu archivo .env');
  process.exit(1);
}

// Crear gateway con timeout más largo
console.log('🔧 2. Creando conexión con Braintree...');
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
  timeout: 60000 // 60 segundos
});
console.log('   ✅ Gateway creado\n');

// Probar conexión
console.log('🌐 3. Probando conexión con Braintree Sandbox...');
console.log('   (Esto puede tardar unos segundos)');

const testConnection = async () => {
  try {
    const startTime = Date.now();
    
    const response = await gateway.clientToken.generate({});
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`   ✅ Conexión exitosa! (${duration} segundos)`);
    console.log(`   ✅ Client token generado:`);
    console.log(`      ${response.clientToken.substring(0, 50)}...`);
    console.log('');
    console.log('🎉 ======================================');
    console.log('🎉 TODO ESTÁ FUNCIONANDO CORRECTAMENTE');
    console.log('🎉 ======================================');
    
  } catch (error) {
    console.log('   ❌ Error en conexión\n');
    console.error('❌ ======================================');
    console.error('❌ ERROR AL CONECTAR CON BRAINTREE');
    console.error('❌ ======================================');
    console.error('');
    console.error('Tipo de error:', error.type || 'desconocido');
    console.error('Mensaje:', error.message);
    console.error('');
    
    if (error.message.includes('timeout')) {
      console.error('💡 POSIBLES SOLUCIONES:');
      console.error('');
      console.error('1. VERIFICA TU CONEXIÓN A INTERNET:');
      console.error('   - ¿Puedes abrir https://sandbox.braintreegateway.com?');
      console.error('   - Intenta con otra red WiFi');
      console.error('');
      console.error('2. FIREWALL/ANTIVIRUS:');
      console.error('   - Desactiva temporalmente el antivirus');
      console.error('   - Permite conexiones de Node.js en el firewall');
      console.error('');
      console.error('3. PROXY/VPN:');
      console.error('   - Si usas VPN, desactívala');
      console.error('   - Si hay proxy corporativo, configúralo');
      console.error('');
      console.error('4. CREDENCIALES:');
      console.error('   - Verifica que sean las correctas');
      console.error('   - Regenera las API Keys en Braintree Dashboard');
      console.error('');
      console.error('5. ESTADO DE BRAINTREE:');
      console.error('   - Revisa https://status.braintreepayments.com');
      console.error('');
    } else {
      console.error('💡 POSIBLES CAUSAS:');
      console.error('   - Credenciales incorrectas');
      console.error('   - Cuenta de Braintree suspendida');
      console.error('   - API Keys revocadas');
      console.error('');
      console.error('🔗 Verifica tus credenciales en:');
      console.error('   https://sandbox.braintreegateway.com');
      console.error('');
    }
    
    console.error('Stack trace completo:');
    console.error(error);
  }
};

testConnection();
