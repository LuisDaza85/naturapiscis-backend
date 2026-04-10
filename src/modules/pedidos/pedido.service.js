// pedido.service.js - Lógica de negocio para Pedidos
const pedidoRepository = require('./pedido.repository');
const { AppError } = require('../../utils/errors');
const ESTADOS = require('../../constants/estados');

class PedidoService {
  /**
   * Obtener pedidos del usuario
   */
  async obtenerPedidosUsuario(usuarioId) {
    try {
      const pedidos = await pedidoRepository.findByUsuario(usuarioId);
      return pedidos;
    } catch (error) {
      throw new AppError('Error al obtener pedidos', 500);
    }
  }

  /**
   * Obtener pedidos recientes
   */
  async obtenerPedidosRecientes(usuarioId) {
    try {
      const pedidos = await pedidoRepository.findRecientesByUsuario(usuarioId);
      return pedidos;
    } catch (error) {
      throw new AppError('Error al obtener pedidos recientes', 500);
    }
  }

  /**
   * Obtener pedidos recibidos por productor
   */
  async obtenerPedidosRecibidos(productorId) {
    try {
      const pedidos = await pedidoRepository.findRecibidosByProductor(productorId);
      return pedidos;
    } catch (error) {
      throw new AppError('Error al obtener pedidos recibidos', 500);
    }
  }

  /**
   * Obtener un pedido por ID
   */
  async obtenerPedidoPorId(pedidoId, usuarioId, rol) {
    try {
      const pedido = await pedidoRepository.findById(pedidoId);
      
      if (!pedido) {
        throw new AppError('Pedido no encontrado', 404);
      }

      // Admin puede ver cualquier pedido
      if (rol === 'admin') return pedido;

      // Verificar que el pedido pertenece al usuario
      if (pedido.consumidor_id !== usuarioId) {
        throw new AppError('No tienes permiso para ver este pedido', 403);
      }

      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al obtener pedido', 500);
    }
  }

  /**
   * Crear un nuevo pedido
   */
  async crearPedido(pedidoData) {
    try {
      // Validar que hay items
      if (!pedidoData.items || pedidoData.items.length === 0) {
        throw new AppError('El pedido debe contener al menos un producto', 400);
      }

      const pedido = await pedidoRepository.create(pedidoData);
      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al crear pedido', 500);
    }
  }

  /**
   * Actualizar estado del pedido
   */
  async actualizarEstado(pedidoId, nuevoEstado, usuarioId, rol) {
    try {
      // Normalizar estado
      const estadoNormalizado = this.normalizarEstado(nuevoEstado);

      // Validar que el estado es permitido
      const estadosPermitidos = ['pendiente', 'confirmado', 'en preparacion', 'en camino', 'entregado', 'cancelado'];
      if (!estadosPermitidos.includes(estadoNormalizado)) {
        throw new AppError('Estado no válido', 400);
      }

      // Solo productores pueden actualizar estado
      if (rol !== 'productor') {
        throw new AppError('Solo los productores pueden actualizar el estado de los pedidos', 403);
      }

      const pedido = await pedidoRepository.updateEstado(pedidoId, estadoNormalizado);
      
      if (!pedido) {
        throw new AppError('Pedido no encontrado', 404);
      }

      return pedido;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error al actualizar estado del pedido', 500);
    }
  }

  /**
   * Obtener historial de pedidos con filtros
   */
  async obtenerHistorial(usuarioId, filtros) {
    try {
      const pedidos = await pedidoRepository.findHistorial(usuarioId, filtros);
      return pedidos;
    } catch (error) {
      throw new AppError('Error al obtener historial de pedidos', 500);
    }
  }


  /**
   * Obtener todos los pedidos (admin)
   */
  async obtenerTodosPedidos() {
    try {
      return await pedidoRepository.findAll()
    } catch (error) {
      throw new AppError('Error al obtener todos los pedidos', 500)
    }
  }

  /**
   * Normalizar estado (quitar tildes y convertir a minúsculas)
   */
  normalizarEstado(estado) {
    return estado
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
}

module.exports = new PedidoService();