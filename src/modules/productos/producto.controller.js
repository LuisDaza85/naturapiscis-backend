// ============================================
// src/modules/productos/producto.controller.js - CONTROLADORES DE PRODUCTOS
// ============================================
// Este archivo maneja las peticiones HTTP
// Extrae datos, llama al service, y retorna respuestas

const productoService = require('./producto.service');
const { asyncHandler } = require('../../middlewares/error.middleware');
const {
  successResponse,
  paginatedResponse,
  createdResponse,
  deletedResponse
} = require('../../utils/response');
const { extractPaginationParams } = require('../../utils/pagination');
const { SUCCESS_MESSAGES } = require('../../constants/messages');
const logger = require('../../utils/logger');

// ============================================
// CONTROLADORES PÚBLICOS
// ============================================

/**
 * GET /api/productos
 * Obtener lista de productos con filtros y paginación
 */
const getAll = asyncHandler(async (req, res) => {
  // Extraer parámetros de paginación
  const { page, limit } = extractPaginationParams(req);
  
  // Extraer filtros de query params
  const filters = {
    categoria_id: req.query.categoria_id,
    productor_id: req.query.productor_id,
    precio_min: req.query.precio_min,
    precio_max: req.query.precio_max,
    disponible: req.query.disponible,
    destacado: req.query.destacado,
    order: req.query.order || 'fecha_desc'
  };
  
  logger.info('Obteniendo lista de productos', {
    page,
    limit,
    filters
  });
  
  // Llamar al service
  const result = await productoService.findAll(page, limit, filters);
  
  // Retornar respuesta paginada
  return paginatedResponse(
    res,
    result.data,
    result.pagination,
    'Productos obtenidos exitosamente'
  );
});

/**
 * GET /api/productos/destacados
 * Obtener productos destacados
 */
const getDestacados = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  
  logger.info('Obteniendo productos destacados', { limit });
  
  const productos = await productoService.findDestacados(limit);
  
  return successResponse(
    res,
    productos,
    'Productos destacados obtenidos exitosamente'
  );
});

/**
 * GET /api/productos/buscar?q=termino
 * Buscar productos por nombre o descripción
 */
const search = asyncHandler(async (req, res) => {
  const { q: searchTerm } = req.query;
  const { page, limit } = extractPaginationParams(req);
  
  logger.info('Buscando productos', {
    searchTerm,
    page,
    limit
  });
  
  const result = await productoService.search(searchTerm, page, limit);
  
  return paginatedResponse(
    res,
    result.data,
    result.pagination,
    `Resultados de búsqueda para "${searchTerm}"`
  );
});

/**
 * GET /api/productos/:id
 * Obtener detalle de un producto
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  logger.info('Obteniendo producto por ID', { productId: id });
  
  const producto = await productoService.findById(id);
  
  return successResponse(
    res,
    producto,
    'Producto obtenido exitosamente'
  );
});

// ============================================
// CONTROLADORES PROTEGIDOS (PRODUCTORES)
// ============================================

/**
 * GET /api/productos/productor/mis-productos
 * Obtener productos del productor autenticado
 */
const getMisProductos = asyncHandler(async (req, res) => {
  const { page, limit } = extractPaginationParams(req);
  const productorId = req.user.id;  // ✅ CORREGIDO
  
  const filters = {
    disponible: req.query.disponible
  };
  
  logger.info('Obteniendo productos del productor', {
    productorId,
    page,
    limit,
    filters
  });
  
  const result = await productoService.findByProductor(
    productorId,
    page,
    limit,
    filters
  );
  
  return paginatedResponse(
    res,
    result.data,
    result.pagination,
    'Tus productos obtenidos exitosamente'
  );
});

/**
 * POST /api/productos
 * Crear un nuevo producto
 */
const create = asyncHandler(async (req, res) => {
  const productorId = req.user.id;  // ✅ CORREGIDO
  const productData = {
    ...req.body,
    productor_id: productorId
  };
  
  logger.info('Creando nuevo producto', {
    productorId,
    nombre: productData.nombre
  });
  
  const producto = await productoService.create(productData);
  
  logger.logEvent('producto_creado', {
    productId: producto.id,
    productorId,
    nombre: producto.nombre
  });
  
  return createdResponse(
    res,
    producto,
    SUCCESS_MESSAGES.PRODUCT_CREATED
  );
});

/**
 * PUT /api/productos/:id
 * Actualizar un producto existente
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productorId = req.user.id;  // ✅ CORREGIDO
  const isAdmin = req.user.rol === 'admin';
  
  logger.info('Actualizando producto', {
    productId: id,
    productorId,
    isAdmin
  });
  
  const producto = await productoService.update(
    id,
    req.body,
    productorId,
    isAdmin
  );
  
  logger.logEvent('producto_actualizado', {
    productId: id,
    productorId
  });
  
  return successResponse(
    res,
    producto,
    SUCCESS_MESSAGES.PRODUCT_UPDATED
  );
});

/**
 * DELETE /api/productos/:id
 * Eliminar un producto
 */
const deleteProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const productorId = req.user.id;  // ✅ CORREGIDO
  const isAdmin = req.user.rol === 'admin';
  
  logger.info('Eliminando producto', {
    productId: id,
    productorId,
    isAdmin
  });
  
  await productoService.delete(id, productorId, isAdmin);
  
  logger.logEvent('producto_eliminado', {
    productId: id,
    productorId
  });
  
  return deletedResponse(
    res,
    SUCCESS_MESSAGES.PRODUCT_DELETED
  );
});

/**
 * PATCH /api/productos/:id/disponibilidad
 * Cambiar disponibilidad de un producto
 */
const toggleDisponibilidad = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { disponible } = req.body;
  const productorId = req.user.id;  // ✅ CORREGIDO
  const isAdmin = req.user.rol === 'admin';
  
  logger.info('Cambiando disponibilidad de producto', {
    productId: id,
    disponible,
    productorId
  });
  
  const producto = await productoService.toggleDisponibilidad(
    id,
    disponible,
    productorId,
    isAdmin
  );
  
  const message = disponible
    ? 'Producto activado exitosamente'
    : 'Producto desactivado exitosamente';
  
  return successResponse(res, producto, message);
});

/**
 * PATCH /api/productos/:id/destacar
 * Marcar/desmarcar producto como destacado
 */
const toggleDestacado = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { destacado } = req.body;
  
  logger.info('Cambiando estado destacado de producto', {
    productId: id,
    destacado,
    userId: req.user.id
  });
  
  const producto = await productoService.toggleDestacado(id, destacado);
  
  const message = destacado
    ? 'Producto marcado como destacado'
    : 'Producto desmarcado como destacado';
  
  return successResponse(res, producto, message);
});

// ============================================
// EXPORTAR CONTROLADORES
// ============================================

module.exports = {
  // Públicos
  getAll,
  getDestacados,
  search,
  getById,
  
  // Protegidos
  getMisProductos,
  create,
  update,
  delete: deleteProducto,
  toggleDisponibilidad,
  toggleDestacado
};