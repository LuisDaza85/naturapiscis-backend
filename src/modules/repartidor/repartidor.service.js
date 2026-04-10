// src/modules/repartidor/repartidor.service.js
const repartidorRepository = require('./repartidor.repository');
const { notificarEnCamino, notificarEntregado } = require('../../services/pushNotifications');
const { AppError } = require('../../utils/errors');

class RepartidorService {

  async guardarPushToken(usuarioId, token) {
    await repartidorRepository.savePushToken(usuarioId, token);
    return { success: true };
  }

  async getPedidosDisponibles(repartidorId) {
    return await repartidorRepository.findPedidosDisponibles(repartidorId);
  }

  async confirmarRecogida(pedidoId, codigoIngresado, repartidor) {
    const pedido = await repartidorRepository.findPedidoConConsumidor(pedidoId);
    if (!pedido) throw new AppError('Pedido no encontrado', 404);

    const codigoLimpio = codigoIngresado.toUpperCase().trim();
    if (pedido.codigo_retiro !== codigoLimpio)
      throw new AppError('Código de retiro incorrecto ❌', 400);

    if (pedido.repartidor_id && pedido.repartidor_id !== repartidor.id)
      throw new AppError('Este pedido ya fue tomado por otro conductor', 409);

    await repartidorRepository.asignarRepartidor(pedidoId, repartidor.id);

    notificarEnCamino(pedido.consumidor_push_token, pedidoId, repartidor.nombre)
      .catch(err => console.error('Push error:', err.message));

    return {
      success: true,
      message: '¡Código correcto! El consumidor fue notificado.',
      consumidor: pedido.consumidor_nombre,
    };
  }

  async confirmarEntrega(pedidoId, repartidorId) {
    const datos = await repartidorRepository.findPushTokenConsumidor(pedidoId);
    if (!datos) throw new AppError('Pedido no encontrado', 404);
    if (datos.repartidor_id !== repartidorId)
      throw new AppError('No eres el conductor asignado a este pedido', 403);

    await repartidorRepository.marcarEntregado(pedidoId);

    notificarEntregado(datos.expo_push_token, pedidoId)
      .catch(err => console.error('Push error:', err.message));

    return { success: true, message: 'Pedido marcado como entregado ✅' };
  }

  async getMisPedidos(repartidorId) {
    return await repartidorRepository.findMisPedidos(repartidorId);
  }

  async getTracking(pedidoId, consumidorId) {
    const pedido = await repartidorRepository.findTracking(pedidoId, consumidorId);
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    return pedido;
  }

  // ✅ NUEVO: guarda la ubicación GPS del conductor
  async actualizarUbicacion(pedidoId, lat, lng) {
    await repartidorRepository.actualizarUbicacion(pedidoId, lat, lng);
  }
}

module.exports = new RepartidorService();