// ============================================
// src/modules/auth/auth.controller.js - CONTROLADORES DE AUTENTICACIÓN
// ============================================
// Este archivo maneja las peticiones HTTP de autenticación

const authService = require('./auth.service');
const { asyncHandler } = require('../../middlewares/error.middleware');
const {
  successResponse,
  createdResponse
} = require('../../utils/response');
const logger = require('../../utils/logger');

// ============================================
// CONTROLADORES
// ============================================

/**
 * POST /api/auth/registro
 * Registrar un nuevo usuario
 */
const registro = asyncHandler(async (req, res) => {
  const { nombre, email, password, telefono, rol_id } = req.body;
  
  logger.info('Intento de registro', {
    email,
    rol_id: rol_id || 3
  });
  
  // Llamar al service
  const resultado = await authService.registrarUsuario({
    nombre,
    email,
    password,
    telefono,
    rol_id: rol_id || 3  // Default: consumidor
  });
  
  logger.logAuth('registro', { email }, true);
  logger.logEvent('usuario_registrado', {
    userId: resultado.usuario.id,
    email,
    rol_id: resultado.usuario.rol_id
  });
  
  return createdResponse(
    res,
    resultado,
    'Usuario registrado correctamente'
  );
});

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || 'Navegador desconocido';
  
  logger.info('Intento de login', { email });
  
  // Llamar al service
  const resultado = await authService.iniciarSesion({
    email,
    password,
    userAgent
  });
  
  logger.logAuth('login', { email }, true);
  logger.logEvent('login_exitoso', {
    userId: resultado.usuario.id,
    email
  });
  
  return successResponse(
    res,
    resultado,
    'Inicio de sesión exitoso'
  );
});

/**
 * GET /api/auth/verificar
 * Verificar token JWT
 */
const verificar = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    logger.warn('Intento de verificación sin token');
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  logger.debug('Verificando token');
  
  // Llamar al service
  const usuario = await authService.verificarToken(token);
  
  return successResponse(
    res,
    { usuario },
    'Token válido'
  );
});

/**
 * POST /api/auth/logout
 * Cerrar sesión (registrar actividad)
 */
const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userAgent = req.headers['user-agent'] || 'Navegador desconocido';
  
  if (token) {
    try {
      // Intentar registrar el logout
      await authService.cerrarSesion(token, userAgent);
      
      logger.info('Logout exitoso');
    } catch (error) {
      // Ignorar errores de token inválido en logout
      logger.debug('Error en logout (ignorado)', { error: error.message });
    }
  }
  
  return successResponse(
    res,
    null,
    'Sesión cerrada correctamente'
  );
});

// ============================================
// EXPORTAR CONTROLADORES
// ============================================

module.exports = {
  registro,
  login,
  verificar,
  logout
};