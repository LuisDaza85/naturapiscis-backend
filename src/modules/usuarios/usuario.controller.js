// usuario.controller.js
const usuarioService = require('./usuario.service');
const { successResponse, errorResponse } = require('../../utils/response');

class UsuarioController {
  async obtenerPerfil(req, res) {
    try {
      const { id } = req.user;
      const usuario = await usuarioService.obtenerPerfil(id);
      return successResponse(res, usuario, 'Perfil obtenido correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async actualizarPerfil(req, res) {
    try {
      const { id } = req.user;
      const usuario = await usuarioService.actualizarPerfil(id, req.body);
      return successResponse(res, usuario, 'Perfil actualizado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async obtenerTodosUsuarios(req, res) {
    try {
      const usuarios = await usuarioService.obtenerTodosUsuarios();
      return successResponse(res, usuarios, 'Usuarios obtenidos correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async cambiarEstadoUsuario(req, res) {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      const usuario = await usuarioService.cambiarEstadoUsuario(id, activo);
      const msg = activo ? 'Usuario reactivado correctamente' : 'Usuario dado de baja correctamente';
      return successResponse(res, usuario, msg);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async editarUsuario(req, res) {
    try {
      const { id } = req.params;
      const usuario = await usuarioService.editarUsuario(id, req.body);
      return successResponse(res, usuario, 'Usuario actualizado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async eliminarUsuario(req, res) {
    try {
      const { id } = req.params;
      await usuarioService.eliminarUsuario(id);
      return successResponse(res, null, 'Usuario eliminado correctamente');
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new UsuarioController();
