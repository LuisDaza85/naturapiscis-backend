// src/modules/pedidos/pedido.service.js
const pedidoRepository = require('./pedido.repository');
const { AppError }     = require('../../utils/errors');
const ESTADOS          = require('../../constants/estados');
const {
  sendPushNotification,
  notificarPesado,
  notificarPrecioExpirado,
} = require('../../services/pushNotifications');

class PedidoService {

  async obtenerPedidosUsuario(usuarioId) {
    try {
      // ✅ Cancelar expirados antes de devolver
      await pedidoRepository.cancelarExpirados();
      return await pedidoRepository.findByUsuario(usuarioId);
    } catch (error) {
      throw new AppError('Error al obtener pedidos', 500);
    }
  }

  async obtenerPedidosRecientes(usuarioId) {
    try {
      await pedidoRepository.cancelarExpirados();
      return await pedidoRepository.findRecientesByUsuario(usuarioId);
    } catch (error) {
      throw new AppError('Error al obtener pedidos recientes', 500);
    }
  }

  async obtenerPedidosRecibidos(productorId) {
    try {
      await pedidoRepository.cancelarExpirados();
      return await pedidoRepository.findRecibidosByProductor(productorId);
    } catch (error) {
      throw new AppError('Error al obtener pedidos recibidos', 500);
    }
  }

  async obtenerPedidoPorId(pedidoId, usuarioId, rol) {
    try {
      const pedido = await pedidoRepository.findById(pedidoId);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);
      if (rol === 'admin') return pedido;
      if (pedido.consumidor_id !== usuarioId)
        throw new AppError('No tienes permiso para ver este pedido', 403);
      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener pedido', 500);
    }
  }

  async crearPedido(pedidoData) {
    try {
      if (!pedidoData.items || pedidoData.items.length === 0)
        throw new AppError('El pedido debe contener al menos un producto', 400);
      return await pedidoRepository.create(pedidoData);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear pedido', 500);
    }
  }

  async actualizarEstado(pedidoId, nuevoEstado, usuarioId, rol) {
    try {
      const estadoNormalizado = this.normalizarEstado(nuevoEstado);

      if (!ESTADOS.ESTADOS_PEDIDO_LISTA.includes(estadoNormalizado))
        throw new AppError(
          `Estado no válido: "${estadoNormalizado}". Permitidos: ${ESTADOS.ESTADOS_PEDIDO_LISTA.join(', ')}`,
          400
        );

      if (rol !== 'productor')
        throw new AppError('Solo los productores pueden actualizar el estado de los pedidos', 403);

      const pedido = await pedidoRepository.updateEstado(pedidoId, estadoNormalizado);
      if (!pedido) throw new AppError('Pedido no encontrado', 404);
      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar estado del pedido', 500);
    }
  }

  // ✅ NUEVO: Productor registra el peso real de los pescados
  // - Valida que el pedido esté en 'preparando'
  // - Calcula precio_final = peso_real_kg × Bs. 35
  // - Avanza a 'esperando_confirmacion' con timer de 115 min
  // - Notifica al consumidor por push
  async registrarPeso(pedidoId, cantidadPescados, pesoRealKg, rol) {
    try {
      if (rol !== 'productor')
        throw new AppError('Solo el productor puede registrar el peso', 403);

      if (!cantidadPescados || cantidadPescados < 1)
        throw new AppError('La cantidad de pescados debe ser al menos 1', 400);

      if (!pesoRealKg || pesoRealKg <= 0)
        throw new AppError('El peso debe ser mayor a 0 kg', 400);

      // Validar peso mínimo promedio: cada pescado debe pesar al menos 800g
      const pesoPromedio = (pesoRealKg * 1000) / cantidadPescados;
      if (pesoPromedio < ESTADOS.PESO_MINIMO_GRAMOS) {
        throw new AppError(
          `El peso promedio por pescado (${pesoPromedio.toFixed(0)}g) es menor al mínimo permitido (${ESTADOS.PESO_MINIMO_GRAMOS}g)`,
          400
        );
      }

      const pedido = await pedidoRepository.registrarPeso(
        pedidoId, cantidadPescados, pesoRealKg
      );

      if (!pedido)
        throw new AppError(
          'No se pudo registrar el peso. El pedido no existe o no está en estado "preparando"',
          400
        );

      // ✅ Notificar al consumidor
      if (pedido.consumidor_push_token) {
        const precioFinal = parseFloat(pedido.precio_final).toFixed(2);
        await sendPushNotification(
          pedido.consumidor_push_token,
          '⚖️ ¡Tu pedido fue pesado!',
          `${cantidadPescados} pescado(s) pesaron ${pesoRealKg} kg — Total: Bs. ${precioFinal}. Tienes ${ESTADOS.MINUTOS_CONFIRMACION} min para confirmar.`,
          {
            type:        'pesado',
            pedidoId,
            precioFinal,
            pesoRealKg,
            cantidadPescados,
            screen:      'MisPedidos',
          }
        );
      }

      return {
        ...pedido,
        precio_por_kg:    ESTADOS.PRECIO_KG,
        minutos_para_confirmar: ESTADOS.MINUTOS_CONFIRMACION,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al registrar el peso', 500);
    }
  }

  // ✅ NUEVO: Consumidor acepta el precio pesado
  async confirmarPrecio(pedidoId, consumidorId) {
    try {
      const pedido = await pedidoRepository.confirmarPrecio(pedidoId, consumidorId);

      if (!pedido)
        throw new AppError(
          'No se pudo confirmar. El pedido no existe, no te pertenece, ya expiró o no está esperando confirmación.',
          400
        );

      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al confirmar el precio', 500);
    }
  }

  // ✅ NUEVO: Consumidor rechaza el precio pesado → cancela
  async rechazarPrecio(pedidoId, consumidorId) {
    try {
      const pedido = await pedidoRepository.rechazarPrecio(pedidoId, consumidorId);

      if (!pedido)
        throw new AppError(
          'No se pudo rechazar. El pedido no existe, no te pertenece o no está esperando confirmación.',
          400
        );

      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al rechazar el precio', 500);
    }
  }

  async obtenerHistorial(usuarioId, filtros) {
    try {
      await pedidoRepository.cancelarExpirados();
      return await pedidoRepository.findHistorial(usuarioId, filtros);
    } catch (error) {
      throw new AppError('Error al obtener historial de pedidos', 500);
    }
  }

  async obtenerTodosPedidos() {
    try {
      await pedidoRepository.cancelarExpirados();
      return await pedidoRepository.findAll();
    } catch (error) {
      throw new AppError('Error al obtener todos los pedidos', 500);
    }
  }

  normalizarEstado(estado) {
    return estado
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }
}

module.exports = new PedidoService();