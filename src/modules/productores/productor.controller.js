// productor.controller.js - Controlador para Productores
const productorService = require('./productor.service');
const { successResponse, errorResponse } = require('../../utils/response');

class ProductorController {
  /**
   * Obtener todos los productores
   * GET /api/productores
   */
  async obtenerProductores(req, res) {
    try {
      const productores = await productorService.obtenerProductores();
      return successResponse(res, { productores }, 'Productores obtenidos correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Obtener productor por ID
   * GET /api/productores/:id
   */
  async obtenerProductorPorId(req, res) {
    try {
      const { id } = req.params;
      const productor = await productorService.obtenerProductorPorId(id);
      return successResponse(res, productor, 'Productor obtenido correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Obtener productos de un productor
   * GET /api/productores/:id/productos
   */
  async obtenerProductos(req, res) {
    try {
      const { id } = req.params;
      const productos = await productorService.obtenerProductosDeProductor(id);
      return successResponse(res, productos, 'Productos obtenidos correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Obtener perfil del productor autenticado
   * GET /api/productor/perfil
   */
  async obtenerPerfil(req, res) {
    try {
      const { id } = req.user;
      const productor = await productorService.obtenerPerfil(id);
      return successResponse(res, productor, 'Perfil obtenido correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar perfil del productor autenticado
   * PUT /api/productor/perfil
   */
  async actualizarPerfil(req, res) {
    try {
      const { id } = req.user;
      const data = req.body;

      const productor = await productorService.actualizarPerfil(id, data);
      return successResponse(res, productor, 'Perfil actualizado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Actualizar productor por ID (público o admin)
   * PUT /api/productores/:id
   */
  async actualizarProductorPorId(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const productor = await productorService.actualizarPerfil(id, data);
      return successResponse(res, productor, 'Productor actualizado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  /**
   * Buscar productores
   * GET /api/productores/buscar
   */
  async buscarProductores(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return errorResponse(res, 'Término de búsqueda requerido', 400);
      }

      const productores = await productorService.buscarProductores(q);
      return successResponse(res, { productores }, 'Búsqueda completada');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new ProductorController();