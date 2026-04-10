// ============================================
// src/middlewares/auth.middleware.js - AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================
// Este middleware maneja:
// - Verificación de tokens JWT
// - Verificación de roles
// - Verificación de permisos
// - Verificación de ownership (recursos propios)

const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES, hasPermission, canAccess, isAdmin } = require('../constants/roles');
const { ERROR_MESSAGES } = require('../constants/messages');

// ============================================
// MIDDLEWARE: isAuthenticated
// ============================================

/**
 * Verifica que el usuario esté autenticado
 * Extrae el token del header Authorization
 * Verifica el token JWT
 * Añade los datos del usuario a req.user
 * 
 * Uso: router.get('/ruta-protegida', isAuthenticated, controller);
 * 
 * @param {Request} req - Request de Express
 * @param {Response} res - Response de Express
 * @param {Function} next - Siguiente middleware
 */
const isAuthenticated = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH] ========== INICIANDO AUTENTICACIÓN ==========');
    console.log('🔐 [AUTH] URL:', req.originalUrl);
    console.log('🔐 [AUTH] Método:', req.method);
    
    // ===== PASO 1: Extraer token del header =====
    const authHeader = req.headers.authorization;
    console.log('🔐 [AUTH] Header Authorization:', authHeader ? '✅ Presente' : '❌ Ausente');
    
    if (!authHeader) {
      console.log('❌ [AUTH] ERROR: No hay token de autorización');
      logger.warn('Intento de acceso sin token de autorización', {
        ip: req.ip,
        url: req.originalUrl
      });
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_REQUIRED);
    }
    
    // El header debe ser: "Bearer TOKEN_AQUI"
    const parts = authHeader.split(' ');
    console.log('🔐 [AUTH] Partes del header:', parts.length, '- Primera parte:', parts[0]);
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('❌ [AUTH] ERROR: Formato de token incorrecto');
      logger.warn('Formato de token incorrecto', {
        ip: req.ip,
        authHeader: authHeader.substring(0, 20) + '...'
      });
      throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_INVALID);
    }
    
    const token = parts[1];
    console.log('🔐 [AUTH] Token extraído:', token.substring(0, 30) + '...');
    
    // ===== PASO 2: Verificar y decodificar el token =====
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
      console.log('✅ [AUTH] Token verificado correctamente');
      console.log('🔐 [AUTH] Payload decodificado:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.log('❌ [AUTH] ERROR al verificar token:', error.name, '-', error.message);
      
      if (error.name === 'TokenExpiredError') {
        logger.info('Token expirado', {
          ip: req.ip,
          expiredAt: error.expiredAt
        });
        throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_EXPIRED);
      }
      
      if (error.name === 'JsonWebTokenError') {
        logger.warn('Token inválido o manipulado', {
          ip: req.ip,
          error: error.message
        });
        throw new UnauthorizedError(ERROR_MESSAGES.TOKEN_INVALID);
      }
      
      throw error;
    }
    
    // ===== PASO 3: Añadir datos del usuario al request =====
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
      role_id: decoded.role_id,
      productor_id: decoded.productor_id || null  // Si es productor
    };
    
    console.log('✅ [AUTH] req.user creado:', JSON.stringify(req.user, null, 2));
    
    logger.debug('Usuario autenticado correctamente', {
      userId: req.user.id,
      rol: req.user.rol,
      url: req.originalUrl
    });
    
    console.log('✅ [AUTH] ========== AUTENTICACIÓN EXITOSA ==========');
    next();
    
  } catch (error) {
    console.log('❌ [AUTH] ========== ERROR EN AUTENTICACIÓN ==========');
    console.log('❌ [AUTH] Error:', error.message);
    console.log('❌ [AUTH] Stack:', error.stack);
    next(error);
  }
};

// ============================================
// MIDDLEWARE: optionalAuth
// ============================================

/**
 * Autenticación opcional
 * Si hay token, lo verifica y añade req.user
 * Si no hay token, continúa sin error
 * 
 * Útil para rutas que funcionan diferente para usuarios autenticados
 * Ejemplo: Productos públicos pero con descuentos para usuarios registrados
 * 
 * Uso: router.get('/productos', optionalAuth, controller);
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Si no hay header, continuar sin autenticación
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }
    
    const token = parts[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        rol: decoded.rol,
        role_id: decoded.role_id,
        productor_id: decoded.productor_id || null
      };
      
      logger.debug('Usuario autenticado opcionalmente', {
        userId: req.user.id,
        rol: req.user.rol
      });
      
    } catch (error) {
      // Si el token es inválido, continuar sin autenticación
      logger.debug('Token opcional inválido, continuando sin autenticación');
    }
    
    next();
    
  } catch (error) {
    next(error);
  }
};

// ============================================
// MIDDLEWARE: hasRole
// ============================================

/**
 * Verifica que el usuario tenga un rol específico
 * Debe usarse DESPUÉS de isAuthenticated
 * 
 * @param {...string} roles - Roles permitidos (puede ser uno o varios)
 * @returns {Function} Middleware function
 * 
 * Uso: 
 * router.post('/productos', isAuthenticated, hasRole(ROLES.PRODUCTOR, ROLES.ADMIN), controller);
 * 
 * @example
 * // Solo productores y admins
 * router.post('/productos', isAuthenticated, hasRole(ROLES.PRODUCTOR, ROLES.ADMIN), createProduct);
 * 
 * // Solo admins
 * router.delete('/usuarios/:id', isAuthenticated, hasRole(ROLES.ADMIN), deleteUser);
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    try {
      console.log('🔒 [ROLE] ========== VERIFICANDO ROL ==========');
      console.log('🔒 [ROLE] req.user:', req.user ? '✅ Presente' : '❌ Ausente');
      console.log('🔒 [ROLE] Roles permitidos:', roles);
      console.log('🔒 [ROLE] Rol del usuario:', req.user?.rol);
      
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        console.log('❌ [ROLE] ERROR: req.user no existe');
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED);
      }
      
      // Verificar si el rol del usuario está en la lista de roles permitidos
      if (!roles.includes(req.user.rol)) {
        console.log('❌ [ROLE] ERROR: Rol no permitido');
        console.log('❌ [ROLE] Se requiere:', roles);
        console.log('❌ [ROLE] Usuario tiene:', req.user.rol);
        
        logger.warn('Acceso denegado por rol insuficiente', {
          userId: req.user.id,
          userRole: req.user.rol,
          requiredRoles: roles,
          url: req.originalUrl
        });
        
        throw new ForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }
      
      console.log('✅ [ROLE] Rol verificado correctamente');
      logger.debug('Verificación de rol exitosa', {
        userId: req.user.id,
        rol: req.user.rol
      });
      
      console.log('✅ [ROLE] ========== VERIFICACIÓN EXITOSA ==========');
      next();
      
    } catch (error) {
      console.log('❌ [ROLE] ========== ERROR EN VERIFICACIÓN ==========');
      console.log('❌ [ROLE] Error:', error.message);
      next(error);
    }
  };
};

// ============================================
// MIDDLEWARE: isAdmin
// ============================================

/**
 * Verifica que el usuario sea administrador
 * Shortcut para hasRole(ROLES.ADMIN)
 * 
 * Uso: router.delete('/usuarios/:id', isAuthenticated, isAdminMiddleware, controller);
 */
const isAdminMiddleware = (req, res, next) => {
  return hasRole(ROLES.ADMIN)(req, res, next);
};

// ============================================
// MIDDLEWARE: isProductor
// ============================================

/**
 * Verifica que el usuario sea productor
 * Shortcut para hasRole(ROLES.PRODUCTOR)
 * 
 * Uso: router.post('/productos', isAuthenticated, isProductorMiddleware, controller);
 */
const isProductorMiddleware = (req, res, next) => {
  return hasRole(ROLES.PRODUCTOR)(req, res, next);
};

// ============================================
// MIDDLEWARE: isConsumidor
// ============================================

/**
 * Verifica que el usuario sea consumidor
 * Shortcut para hasRole(ROLES.CONSUMIDOR)
 * 
 * Uso: router.post('/pedidos', isAuthenticated, isConsumidorMiddleware, controller);
 */
const isConsumidorMiddleware = (req, res, next) => {
  return hasRole(ROLES.CONSUMIDOR)(req, res, next);
};

// ============================================
// MIDDLEWARE: isOwner
// ============================================

/**
 * Verifica que el usuario sea el dueño del recurso
 * Compara req.user.id con el ID del recurso
 * Los admins siempre pueden acceder (bypass)
 * 
 * @param {string} paramName - Nombre del parámetro que contiene el user_id (default: 'userId')
 * @returns {Function} Middleware function
 * 
 * Uso:
 * router.put('/usuarios/:userId', isAuthenticated, isOwner('userId'), controller);
 * 
 * @example
 * // Verificar que el usuario edite su propio perfil
 * router.put('/perfil/:userId', isAuthenticated, isOwner('userId'), updateProfile);
 * 
 * // Los admins pueden editar cualquier perfil (bypass automático)
 */
const isOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED);
      }
      
      // Admins pueden acceder a cualquier recurso
      if (isAdmin(req.user.rol)) {
        logger.debug('Admin bypass en verificación de ownership', {
          userId: req.user.id
        });
        return next();
      }
      
      // Obtener el ID del recurso desde los parámetros
      const resourceUserId = parseInt(req.params[paramName], 10);
      
      if (!resourceUserId) {
        throw new ForbiddenError('ID de usuario no proporcionado');
      }
      
      // Verificar que el usuario sea el dueño
      if (req.user.id !== resourceUserId) {
        logger.warn('Intento de acceso a recurso ajeno', {
          userId: req.user.id,
          resourceUserId,
          url: req.originalUrl
        });
        
        throw new ForbiddenError(ERROR_MESSAGES.NOT_OWNER);
      }
      
      logger.debug('Verificación de ownership exitosa', {
        userId: req.user.id,
        resourceUserId
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// ============================================
// MIDDLEWARE: hasPermission
// ============================================

/**
 * Verifica que el usuario tenga un permiso específico
 * Usa el sistema de permisos definido en constants/roles.js
 * 
 * @param {string} permission - Permiso requerido (ej: 'products:create')
 * @returns {Function} Middleware function
 * 
 * Uso:
 * router.post('/productos', isAuthenticated, hasPermissionMiddleware('products:create_own'), controller);
 * 
 * @example
 * // Verificar permiso para crear productos
 * router.post('/productos', 
 *   isAuthenticated, 
 *   hasPermissionMiddleware('products:create_own'), 
 *   createProduct
 * );
 */
const hasPermissionMiddleware = (permission) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED);
      }
      
      // Verificar si el usuario tiene el permiso
      if (!hasPermission(req.user.rol, permission)) {
        logger.warn('Acceso denegado por falta de permiso', {
          userId: req.user.id,
          rol: req.user.rol,
          permissionRequired: permission,
          url: req.originalUrl
        });
        
        throw new ForbiddenError(ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }
      
      logger.debug('Verificación de permiso exitosa', {
        userId: req.user.id,
        permission
      });
      
      next();
      
    } catch (error) {
      next(error);
    }
  };
};

// ============================================
// EXPORTAR MIDDLEWARES
// ============================================

module.exports = {
  // Autenticación básica
  isAuthenticated,
  optionalAuth,
  
  // Verificación de roles
  hasRole,
  isAdmin: isAdminMiddleware,
  isProductor: isProductorMiddleware,
  isConsumidor: isConsumidorMiddleware,
  
  // Verificación de ownership
  isOwner,
  
  // Verificación de permisos
  hasPermission: hasPermissionMiddleware
};