// backend/src/services/pushNotifications.js
let Expo = null;

const getExpo = async () => {
  if (!Expo) {
    const mod = await import('expo-server-sdk');
    Expo = mod.Expo;
  }
  return new Expo();
};

// ✅ Enviar notificación genérica
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) {
    console.log('⚠️ Push token ausente');
    return;
  }
  try {
    const expo = await getExpo();
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log('⚠️ Push token inválido:', pushToken);
      return;
    }
    const message = {
      to: pushToken, sound: 'default',
      title, body, data, priority: 'high', channelId: 'orders',
    };
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log('📬 Push enviado:', tickets);
    }
  } catch (error) {
    console.error('❌ Error enviando push:', error.message);
  }
};

// ── Notificaciones específicas ────────────────────────────────

const notificarEnCamino = async (pushToken, pedidoId, nombreConductor) => {
  await sendPushNotification(
    pushToken,
    '🚴 Tu pedido está en camino',
    `${nombreConductor || 'El conductor'} está llevando tu pedido #${pedidoId}`,
    { type: 'en_camino', pedidoId, screen: 'TrackingPedido' }
  );
};

const notificarEntregado = async (pushToken, pedidoId) => {
  await sendPushNotification(
    pushToken,
    '✅ ¡Pedido entregado!',
    `Tu pedido #${pedidoId} fue entregado exitosamente`,
    { type: 'entregado', pedidoId, screen: 'MisPedidos' }
  );
};

const notificarNuevoPedido = async (pushToken, pedidoId, clienteNombre, total) => {
  await sendPushNotification(
    pushToken,
    '🛒 ¡Nuevo Pedido!',
    `${clienteNombre} realizó un pedido de Bs. ${total}`,
    { type: 'nuevo_pedido', pedidoId, screen: 'Orders' }
  );
};

const notificarConfirmado = async (pushToken, pedidoId) => {
  await sendPushNotification(
    pushToken,
    '✅ Pedido confirmado',
    `Tu pedido #${pedidoId} fue confirmado por el productor`,
    { type: 'confirmado', pedidoId, screen: 'MisPedidos' }
  );
};

// ✅ NUEVO: Notificar al consumidor que el productor pesó su pedido
const notificarPesado = async (pushToken, pedidoId, cantidadPescados, pesoKg, precioFinal, minutosConfirmacion) => {
  await sendPushNotification(
    pushToken,
    '⚖️ ¡Tu pedido fue pesado!',
    `${cantidadPescados} pescado(s) → ${pesoKg} kg → Bs. ${precioFinal}. Tienes ${minutosConfirmacion} min para confirmar.`,
    {
      type: 'pesado',
      pedidoId,
      cantidadPescados,
      pesoKg,
      precioFinal,
      screen: 'MisPedidos',
    }
  );
};

// ✅ NUEVO: Notificar al consumidor que su confirmación expiró
const notificarPrecioExpirado = async (pushToken, pedidoId) => {
  await sendPushNotification(
    pushToken,
    '⏰ Pedido cancelado por tiempo',
    `Tu pedido #${pedidoId} fue cancelado porque no confirmaste el precio a tiempo.`,
    { type: 'expirado', pedidoId, screen: 'MisPedidos' }
  );
};

module.exports = {
  sendPushNotification,
  notificarEnCamino,
  notificarEntregado,
  notificarNuevoPedido,
  notificarConfirmado,
  notificarPesado,
  notificarPrecioExpirado,
};