# 🔧 Actualización del Backend para Tokenización con Datos de Tarjeta

## 📝 **Problema Identificado**

El módulo nativo `react-native-braintree-payments-drop-in` requiere:
- Compilación nativa (Android/iOS)
- Archivo `google-services.json` de Firebase
- Build con `expo prebuild` y `expo run:android`

**Solución**: Tokenizar en el backend usando el SDK oficial de Braintree.

---

## ✅ **Cambios Necesarios en index.js**

Reemplaza el endpoint `/api/subscribe` (línea ~210) con este código:

```javascript
// ============================================
// CREAR SUSCRIPCIÓN (CON TOKENIZACIÓN)
// ============================================

app.post('/api/subscribe', async (req, res) => {
  try {
    const {
      // Opción 1: Recibir nonce ya tokenizado
      paymentMethodNonce,
      // Opción 2: Recibir datos de tarjeta para tokenizar
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
      cardholderName,
      // Datos de suscripción
      planId,
      userId,
      email
    } = req.body;

    console.log('💳 Creando suscripción...', { planId, userId, email });

    // Validar datos requeridos
    if (!planId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos',
        required: ['planId', 'userId']
      });
    }

    let finalNonce = paymentMethodNonce;

    // Si no hay nonce pero sí datos de tarjeta, tokenizar en el backend
    if (!finalNonce && cardNumber && expirationMonth && expirationYear && cvv) {
      console.log('🔐 Tokenizando tarjeta en el backend...');
      console.log('   Tarjeta terminada en:', cardNumber.slice(-4));
      console.log('   Expiración:', `${expirationMonth}/${expirationYear}`);
      
      try {
        // Generar client token primero
        const clientTokenResult = await gateway.clientToken.generate({});
        const clientToken = clientTokenResult.clientToken;

        // Tokenizar con el SDK de Braintree (esto preserva la tarjeta correcta)
        const tokenizeResult = await gateway.paymentMethod.create({
          paymentMethodNonce: clientToken,
          creditCard: {
            number: cardNumber.replace(/\s/g, ''),
            expirationMonth: expirationMonth,
            expirationYear: expirationYear,
            cvv: cvv,
            cardholderName: cardholderName || 'Usuario'
          }
        });

        if (!tokenizeResult.success) {
          throw new Error('Error tokenizando tarjeta: ' + tokenizeResult.message);
        }

        finalNonce = tokenizeResult.paymentMethod.token;
        console.log('✅ Tarjeta tokenizada exitosamente');
        console.log('   Nonce:', finalNonce.substring(0, 10) + '...');
      } catch (tokenError) {
        console.error('❌ Error tokenizando tarjeta:', tokenError);
        return res.status(400).json({
          success: false,
          error: 'Error procesando tarjeta',
          message: tokenError.message
        });
      }
    }

    // Validar que tengamos un nonce
    if (!finalNonce) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere paymentMethodNonce o datos de tarjeta completos',
        required: ['paymentMethodNonce O (cardNumber, expirationMonth, expirationYear, cvv)']
      });
    }

    console.log('🔑 Payment Method Nonce:', finalNonce.substring(0, 10) + '...');

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
          paymentMethodNonce: finalNonce
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
      console.log('   → Usando nonce:', finalNonce.substring(0, 20) + '...');
      const paymentMethodResult = await gateway.paymentMethod.create({
        customerId: userId,
        paymentMethodNonce: finalNonce
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
```

---

## 🚀 **Cómo Aplicar los Cambios**

### 1. **Editar index.js**
```powershell
cd C:\Users\multi\Documents\Parking\Parking-Backend
notepad index.js
```

### 2. **Buscar** (Ctrl+F): `app.post('/api/subscribe'`

### 3. **Reemplazar** todo el bloque hasta el siguiente `// ====` con el código de arriba

### 4. **Guardar** y cerrar

### 5. **Commit y Push**
```powershell
git add index.js
git commit -m "feat: add card tokenization support in /api/subscribe endpoint"
git push origin main
```

### 6. **Verificar Deploy en Koyeb**
- Ve a https://app.koyeb.com
- Espera que el servicio se redespliegue automáticamente
- Verifica los logs

---

## ✅ **Verificación**

Una vez actualizado el backend:

1. **Volver al proyecto frontend**:
```powershell
cd C:\Users\multi\Documents\Parking-Project
```

2. **Probar el pago** con la tarjeta `5555555555554444`

3. **Verificar en Braintree Dashboard** que la tarjeta correcta aparezca

---

## 📋 **Cambios Realizados en Frontend**

✅ `services/braintreeClient.ts` - Valida datos de tarjeta localmente
✅ `services/braintreeServiceBackend.ts` - Envía datos de tarjeta al backend
✅ `app/(perfil)/pay.tsx` - Usa el nuevo flujo con datos de tarjeta

**Ahora el backend tokenizará con el SDK oficial de Braintree, que SÍ preserva la tarjeta correcta.**
