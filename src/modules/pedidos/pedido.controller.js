// pedido.controller.js - Controlador para Pedidos
const pedidoService = require('./pedido.service');
const { successResponse, errorResponse } = require('../../utils/response');

class PedidoController {
  async obtenerPedidos(req, res) {
    try {
      const { id: usuarioId } = req.user;
      const pedidos = await pedidoService.obtenerPedidosUsuario(usuarioId);
      return successResponse(res, pedidos, 'Pedidos obtenidos correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerPedidosRecientes(req, res) {
    try {
      const { id: usuarioId } = req.user;
      const pedidos = await pedidoService.obtenerPedidosRecientes(usuarioId);
      return successResponse(res, pedidos, 'Pedidos recientes obtenidos');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerPedidosRecibidos(req, res) {
    try {
      const { id: productorId } = req.user;
      const pedidos = await pedidoService.obtenerPedidosRecibidos(productorId);
      return successResponse(res, pedidos, 'Pedidos recibidos obtenidos');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerPedidoPorId(req, res) {
    try {
      const { id } = req.params;
      const { id: usuarioId, rol } = req.user;
      const pedido = await pedidoService.obtenerPedidoPorId(id, usuarioId, rol);
      return successResponse(res, pedido, 'Pedido obtenido correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async crearPedido(req, res) {
    try {
      // ✅ Log para debug
      console.log('📦 Body recibido:', JSON.stringify(req.body));

      const { id: usuario_id } = req.user;
      const {
        direccion_id, direccion, metodo_pago_id, metodo_envio,
        items, notas, subtotal, costo_envio, total,
        parada_id, metodo_pago, comprobante_pago,
      } = req.body;

      const pedidoData = {
        usuario_id,
        direccion_id,
        direccion,
        metodo_pago_id,
        metodo_pago,
        metodo_envio,
        items,
        notas,
        subtotal,
        costo_envio,
        total,
        parada_id,
        comprobante_pago,
      };

      const pedido = await pedidoService.crearPedido(pedidoData);
      return successResponse(res, pedido, 'Pedido creado exitosamente', 201);
    } catch (error) {
      console.error('❌ Error crearPedido:', error.message);
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async actualizarEstado(req, res) {
    try {
      const { id } = req.params;
      const { nuevoEstado } = req.body;
      const { id: usuarioId, rol } = req.user;
      const pedido = await pedidoService.actualizarEstado(id, nuevoEstado, usuarioId, rol);
      return successResponse(res, pedido, 'Estado del pedido actualizado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerHistorial(req, res) {
    try {
      const { id: usuarioId } = req.user;
      const { estado, fecha_desde, fecha_hasta } = req.query;
      const filtros = { estado, fecha_desde, fecha_hasta };
      const pedidos = await pedidoService.obtenerHistorial(usuarioId, filtros);
      return successResponse(res, pedidos, 'Historial de pedidos obtenido');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerTodosPedidos(req, res) {
    try {
      const pedidos = await pedidoService.obtenerTodosPedidos();
      return successResponse(res, pedidos, 'Todos los pedidos obtenidos');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new PedidoController();