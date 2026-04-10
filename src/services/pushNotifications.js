// backend/src/services/pushNotifications.js
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// ✅ Enviar notificación genérica
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log('⚠️ Push token inválido o ausente:', pushToken);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'orders',
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log('📬 Push enviado:', tickets);
    }
  } catch (error) {
    console.error('❌ Error enviando push:', error.message);
  }
};

// ✅ Notificar que el pedido está en camino
const notificarEnCamino = async (pushToken, pedidoId, nombreConductor) => {
  await sendPushNotification(
    pushToken,
    '🚴 Tu pedido está en camino',
    `${nombreConductor || 'El conductor'} está llevando tu pedido #${pedidoId}`,
    { type: 'en_camino', pedidoId, screen: 'TrackingPedido' }
  );
};

// ✅ Notificar que el pedido fue entregado
const notificarEntregado = async (pushToken, pedidoId) => {
  await sendPushNotification(
    pushToken,
    '✅ ¡Pedido entregado!',
    `Tu pedido #${pedidoId} fue entregado exitosamente`,
    { type: 'entregado', pedidoId, screen: 'MisPedidos' }
  );
};

// ✅ Notificar nuevo pedido al productor
const notificarNuevoPedido = async (pushToken, pedidoId, clienteNombre, total) => {
  await sendPushNotification(
    pushToken,
    '🛒 ¡Nuevo Pedido!',
    `${clienteNombre} realizó un pedido de Bs. ${total}`,
    { type: 'nuevo_pedido', pedidoId, screen: 'Orders' }
  );
};

// ✅ Notificar que el pedido fue confirmado
const notificarConfirmado = async (pushToken, pedidoId) => {
  await sendPushNotification(
    pushToken,
    '✅ Pedido confirmado',
    `Tu pedido #${pedidoId} fue confirmado por el productor`,
    { type: 'confirmado', pedidoId, screen: 'MisPedidos' }
  );
};

module.exports = {
  sendPushNotification,
  notificarEnCamino,
  notificarEntregado,
  notificarNuevoPedido,
  notificarConfirmado,
};