// src/modules/pedidos/pedido.routes.js
const express    = require('express');
const router     = express.Router();
const pedidoController  = require('./pedido.controller');
const pedidoValidator   = require('./pedido.validator');
const { isAuthenticated, hasRole } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validation.middleware');
const repartidorController = require('../repartidor/repartidor.controller');

// ── GET /api/pedidos ──────────────────────────────────────────
router.get('/',          isAuthenticated, pedidoController.obtenerPedidos);
router.get('/recientes', isAuthenticated, pedidoController.obtenerPedidosRecientes);
router.get('/recibidos', isAuthenticated, hasRole('productor'), pedidoController.obtenerPedidosRecibidos);
router.get('/historial', isAuthenticated, pedidoValidator.obtenerHistorial, validate, pedidoController.obtenerHistorial);
router.get('/admin/todos', isAuthenticated, hasRole('admin'), pedidoController.obtenerTodosPedidos);

// ── Tracking (antes de /:id para que Express no lo confunda) ──
router.get('/:id/tracking', isAuthenticated, repartidorController.getTracking);

// ── GET /api/pedidos/:id ──────────────────────────────────────
router.get('/:id', isAuthenticated, pedidoValidator.obtenerPorId, validate, pedidoController.obtenerPedidoPorId);

// ── POST /api/pedidos ─────────────────────────────────────────
router.post('/', isAuthenticated, pedidoValidator.crearPedido, validate, pedidoController.crearPedido);

// ── PUT /api/pedidos/:id/estado ───────────────────────────────
// Solo productores — cambio de estado general
router.put(
  '/:id/estado',
  isAuthenticated,
  hasRole('productor'),
  pedidoValidator.actualizarEstado,
  validate,
  pedidoController.actualizarEstado
);

// ── PUT /api/pedidos/:id/pesar ────────────────────────────────
// ✅ NUEVO: Productor registra peso real → calcula precio final → notifica consumidor
// Body: { cantidad_pescados: int, peso_real_kg: float }
router.put(
  '/:id/pesar',
  isAuthenticated,
  hasRole('productor'),
  pedidoValidator.registrarPeso,
  validate,
  pedidoController.registrarPeso
);

// ── POST /api/pedidos/:id/confirmar-precio ────────────────────
// ✅ NUEVO: Consumidor acepta el precio pesado (dentro de 115 min)
router.post(
  '/:id/confirmar-precio',
  isAuthenticated,
  hasRole('consumidor'),
  pedidoController.confirmarPrecio
);

// ── POST /api/pedidos/:id/rechazar-precio ─────────────────────
// ✅ NUEVO: Consumidor rechaza el precio pesado → cancela el pedido
router.post(
  '/:id/rechazar-precio',
  isAuthenticated,
  hasRole('consumidor'),
  pedidoController.rechazarPrecio
);

module.exports = router;