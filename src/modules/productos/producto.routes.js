// src/modules/productos/producto.routes.js
const express = require('express');
const router = express.Router();
const productoController = require('./producto.controller');
const { validateProducto, validateId, validateQuery, validateSearch } = require('./producto.validator');
const { isAuthenticated, optionalAuth, isProductor, isAdmin } = require('../../middlewares/auth.middleware');
const { validateRequest } = require('../../middlewares/error.middleware');
const { searchLimiter, createLimiter } = require('../../middlewares/rateLimiter.middleware');

// ============================================
// RUTAS PÚBLICAS
// ============================================

router.get('/', validateQuery, validateRequest, productoController.getAll);
router.get('/destacados', validateQuery, validateRequest, productoController.getDestacados);
router.get('/buscar', searchLimiter, validateSearch, validateRequest, productoController.search);
router.get('/:id', validateId, validateRequest, productoController.getById);

// ============================================
// RUTAS PROTEGIDAS - PRODUCTOR
// ============================================

router.get('/productor/mis-productos', isAuthenticated, isProductor, validateQuery, validateRequest, productoController.getMisProductos);
router.post('/', isAuthenticated, isProductor, createLimiter, validateProducto, validateRequest, productoController.create);

// PUT - productor dueño O admin
router.put(
  '/:id',
  isAuthenticated,
  (req, res, next) => {
    if (req.user?.rol === 'admin') return next();
    return isProductor(req, res, next);
  },
  validateId,
  validateProducto,
  validateRequest,
  productoController.update
);

// DELETE - productor dueño O admin
router.delete(
  '/:id',
  isAuthenticated,
  (req, res, next) => {
    if (req.user?.rol === 'admin') return next();
    return isProductor(req, res, next);
  },
  validateId,
  validateRequest,
  productoController.delete
);

router.patch('/:id/disponibilidad', isAuthenticated, isProductor, validateId, validateRequest, productoController.toggleDisponibilidad);

// PATCH destacar - solo admin
router.patch('/:id/destacar', isAuthenticated, isAdmin, validateId, validateRequest, productoController.toggleDestacado);

module.exports = router;