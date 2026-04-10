// pedido.routes.js - Rutas para Pedidos
const express = require('express');
const router = express.Router();
const pedidoController = require('./pedido.controller');
const pedidoValidator = require('./pedido.validator');
const { isAuthenticated, hasRole } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validation.middleware');

// ✅ Importar controller de repartidor para el tracking
const repartidorController = require('../repartidor/repartidor.controller');

// ============================================================================
// RUTAS PROTEGIDAS - Requieren autenticación
// ============================================================================

/**
 * @route   GET /api/pedidos
 * @desc    Obtener todos los pedidos del usuario
 * @access  Private (Consumidor/Productor)
 */
router.get(
  '/',
  isAuthenticated,
  pedidoController.obtenerPedidos
);

/**
 * @route   GET /api/pedidos/recientes
 * @desc    Obtener últimos 5 pedidos del usuario
 * @access  Private (Consumidor)
 */
router.get(
  '/recientes',
  isAuthenticated,
  pedidoController.obtenerPedidosRecientes
);

/**
 * @route   GET /api/pedidos/recibidos
 * @desc    Obtener pedidos recibidos por el productor
 * @access  Private (Productor)
 */
router.get(
  '/recibidos',
  isAuthenticated,
  hasRole('productor'),
  pedidoController.obtenerPedidosRecibidos
);

/**
 * @route   GET /api/pedidos/historial
 * @desc    Obtener historial de pedidos con filtros
 * @access  Private (Consumidor)
 */
router.get(
  '/historial',
  isAuthenticated,
  pedidoValidator.obtenerHistorial,
  validate,
  pedidoController.obtenerHistorial
);

/**
 * @route   GET /api/pedidos/admin/todos
 * @desc    Obtener TODOS los pedidos (solo admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/todos',
  isAuthenticated,
  hasRole('admin'),
  pedidoController.obtenerTodosPedidos
);

/**
 * @route   GET /api/pedidos/:id/tracking
 * @desc    Seguimiento en tiempo real del pedido (consumidor)
 * @access  Private (Consumidor dueño del pedido)
 * IMPORTANTE: debe ir ANTES de /:id para que Express no lo confunda
 */
router.get(
  '/:id/tracking',
  isAuthenticated,
  repartidorController.getTracking
);

/**
 * @route   GET /api/pedidos/:id
 * @desc    Obtener un pedido por ID
 * @access  Private (Usuario dueño del pedido)
 */
router.get(
  '/:id',
  isAuthenticated,
  pedidoValidator.obtenerPorId,
  validate,
  pedidoController.obtenerPedidoPorId
);

/**
 * @route   POST /api/pedidos
 * @desc    Crear un nuevo pedido
 * @access  Private (Consumidor)
 */
router.post(
  '/',
  isAuthenticated,
  pedidoValidator.crearPedido,
  validate,
  pedidoController.crearPedido
);

/**
 * @route   PUT /api/pedidos/:id/estado
 * @desc    Actualizar estado del pedido
 * @access  Private (Productor)
 */
router.put(
  '/:id/estado',
  isAuthenticated,
  hasRole('productor'),
  pedidoValidator.actualizarEstado,
  validate,
  pedidoController.actualizarEstado
);

module.exports = router;