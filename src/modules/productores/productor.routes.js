// productor.routes.js - Rutas para Productores
const express = require('express');
const router = express.Router();
const productorController = require('./productor.controller');
const productorValidator = require('./productor.validator');
const { isAuthenticated, hasRole } = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validation.middleware');

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

/**
 * @route   GET /api/productores
 * @desc    Obtener todos los productores públicos
 * @access  Public
 */
router.get(
  '/',
  productorController.obtenerProductores
);

/**
 * @route   GET /api/productores/buscar
 * @desc    Buscar productores por nombre, empresa o ubicación
 * @access  Public
 */
router.get(
  '/buscar',
  productorValidator.buscar,
  validate,
  productorController.buscarProductores
);

// ============================================================================
// RUTAS PROTEGIDAS - Requieren autenticación
// ============================================================================
// ⚠️ IMPORTANTE: Estas rutas deben ir ANTES de las rutas con parámetros (:id)
// porque Express matchea rutas en orden. Si /:id va primero, capturará /perfil

/**
 * @route   GET /api/productor/perfil
 * @desc    Obtener perfil del productor autenticado
 * @access  Private (Productor)
 */
router.get(
  '/perfil',
  isAuthenticated,
  hasRole('productor'),
  productorController.obtenerPerfil
);

/**
 * @route   PUT /api/productor/perfil
 * @desc    Actualizar perfil del productor autenticado
 * @access  Private (Productor)
 */
router.put(
  '/perfil',
  isAuthenticated,
  hasRole('productor'),
  productorValidator.actualizarPerfil,
  validate,
  productorController.actualizarPerfil
);

// ============================================================================
// RUTAS PÚBLICAS CON PARÁMETROS
// ============================================================================
// ⚠️ IMPORTANTE: Estas rutas van DESPUÉS de las rutas específicas (/perfil)

/**
 * @route   GET /api/productores/:id
 * @desc    Obtener un productor por ID
 * @access  Public
 */
router.get(
  '/:id',
  productorValidator.obtenerPorId,
  validate,
  productorController.obtenerProductorPorId
);

/**
 * @route   GET /api/productores/:id/productos
 * @desc    Obtener productos de un productor
 * @access  Public
 */
router.get(
  '/:id/productos',
  productorValidator.obtenerPorId,
  validate,
  productorController.obtenerProductos
);

/**
 * @route   PUT /api/productores/:id
 * @desc    Actualizar productor por ID (admin o público)
 * @access  Public (temporal - debería ser admin)
 */
router.put(
  '/:id',
  productorValidator.obtenerPorId,
  productorValidator.actualizarPerfil,
  validate,
  productorController.actualizarProductorPorId
);

module.exports = router;