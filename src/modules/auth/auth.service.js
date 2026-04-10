// ============================================
// src/modules/auth/auth.service.js - LÓGICA DE NEGOCIO
// ============================================
// Este archivo contiene la lógica de negocio del módulo Auth
// Basado en api-auth-routes.js viejo

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const config = require('../../config/environment');
const { ROLE_ID_TO_NAME } = require('../../constants/roles');
const {
  ValidationError,
  UnauthorizedError,
  ConflictError
} = require('../../utils/errors');
const { ERROR_MESSAGES } = require('../../constants/messages');
const logger = require('../../utils/logger');

// ============================================
// REGISTRO DE USUARIOS
// ============================================

/**
 * Registrar un nuevo usuario
 * 
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.nombre - Nombre completo
 * @param {string} userData.email - Email
 * @param {string} userData.password - Contraseña
 * @param {string} userData.telefono - Teléfono (opcional)
 * @param {number} userData.rol_id - ID del rol (default: 3 = consumidor)
 * @returns {Promise<Object>} { token, usuario, message }
 */
const registrarUsuario = async (userData) => {
  const { nombre, email, password, telefono, rol_id } = userData;
  
  logger.debug('Service: Registrando usuario', { email, rol_id });
  
  // ===== VALIDACIONES DE NEGOCIO =====
  
  // Verificar si el email ya existe
  const existente = await authRepository.findByEmail(email);
  
  if (existente) {
    throw new ConflictError('El email ya está registrado');
  }
  
  // Validar contraseña
  if (password.length < 6) {
    throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
  }
  
  // ===== ENCRIPTAR CONTRASEÑA =====
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  logger.debug('Contraseña encriptada correctamente');
  
  // ===== CREAR USUARIO =====
  
  const nuevoUsuario = await authRepository.create({
    nombre,
    email,
    password: hashedPassword,
    telefono,
    rol_id
  });
  
  logger.info('Usuario creado en BD', { userId: nuevoUsuario.id });
  
  // ===== CREAR PREFERENCIAS POR DEFECTO =====
  
  await authRepository.createPreferencias(nuevoUsuario.id);
  
  logger.debug('Preferencias creadas para usuario', { userId: nuevoUsuario.id });
  
  // ===== OBTENER NOMBRE DEL ROL =====
  
  const rolNombre = ROLE_ID_TO_NAME[nuevoUsuario.rol_id] || 'consumidor';
  
  // ===== GENERAR TOKEN JWT =====
  
  const token = generarToken({
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    email: nuevoUsuario.email,
    rol_id: nuevoUsuario.rol_id,
    rol: rolNombre  // ✅ AGREGADO: nombre del rol
  });
  
  // ===== RETORNAR RESULTADO =====
  
  return {
    token,
    usuario: {
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
      rol_id: nuevoUsuario.rol_id,
      rol: rolNombre
    },
    message: 'Usuario registrado correctamente'
  };
};

// ============================================
// INICIAR SESIÓN
// ============================================

/**
 * Iniciar sesión de usuario
 * 
 * @param {Object} credentials - Credenciales
 * @param {string} credentials.email - Email
 * @param {string} credentials.password - Contraseña
 * @param {string} credentials.userAgent - User agent del navegador
 * @returns {Promise<Object>} { token, usuario, message }
 */
const iniciarSesion = async (credentials) => {
  const { email, password, userAgent } = credentials;
  
  logger.debug('Service: Intentando login', { email });
  
  // ===== BUSCAR USUARIO =====
  
  const usuario = await authRepository.findByEmail(email);
  
  if (!usuario) {
    logger.warn('Login fallido: usuario no encontrado', { email });
    throw new UnauthorizedError('Credenciales inválidas');
  }
  
  // ===== VERIFICAR CONTRASEÑA =====
  
  const isMatch = await bcrypt.compare(password, usuario.password);
  
  if (!isMatch) {
    logger.warn('Login fallido: contraseña incorrecta', { email });
    throw new UnauthorizedError('Credenciales inválidas');
  }
  
  logger.info('Credenciales válidas', { userId: usuario.id });
  
  // ===== OBTENER NOMBRE DEL ROL =====
  
  const rolNombre = ROLE_ID_TO_NAME[usuario.rol_id] || 'consumidor';
  
  logger.debug('Rol obtenido', { rol_id: usuario.rol_id, rol: rolNombre });
  
  // ===== GENERAR TOKEN JWT =====
  
  const token = generarToken({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol_id: usuario.rol_id,
    rol: rolNombre  // ✅ AGREGADO: nombre del rol
  });
  
  // ===== REGISTRAR DISPOSITIVO CONECTADO =====
  
  try {
    await authRepository.registrarDispositivo({
      usuario_id: usuario.id,
      nombre: userAgent,
      ubicacion: 'Ubicación desconocida'
    });
    
    logger.debug('Dispositivo registrado', { userId: usuario.id });
  } catch (error) {
    // No bloquear el login si falla el registro del dispositivo
    logger.warn('Error al registrar dispositivo (ignorado)', { error: error.message });
  }
  
  // ===== RETORNAR RESULTADO =====
  
  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol_id: usuario.rol_id,
      rol: rolNombre,
      foto_perfil: usuario.foto_perfil
    },
    message: 'Inicio de sesión exitoso'
  };
};

// ============================================
// VERIFICAR TOKEN
// ============================================

/**
 * Verificar token JWT
 * 
 * @param {string} token - Token JWT
 * @returns {Promise<Object>} Datos del usuario
 */
const verificarToken = async (token) => {
  logger.debug('Service: Verificando token');
  
  // ===== VERIFICAR Y DECODIFICAR TOKEN =====
  
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      config.jwt.secret || 'naturapiscis_secret_key'
    );
  } catch (error) {
    logger.warn('Token inválido o expirado');
    throw new UnauthorizedError('Token inválido');
  }
  
  logger.debug('Token decodificado', { userId: decoded.id });
  
  // ===== VERIFICAR QUE EL USUARIO SIGA EXISTIENDO =====
  
  const usuario = await authRepository.findById(decoded.id);
  
  if (!usuario) {
    logger.warn('Usuario no encontrado para token válido', { userId: decoded.id });
    throw new UnauthorizedError('Usuario no encontrado');
  }
  
  // ===== OBTENER NOMBRE DEL ROL =====
  
  const rolNombre = ROLE_ID_TO_NAME[usuario.rol_id] || 'consumidor';
  
  // ===== RETORNAR DATOS DEL USUARIO =====
  
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol_id: usuario.rol_id,
    rol: rolNombre,
    foto_perfil: usuario.foto_perfil
  };
};

// ============================================
// CERRAR SESIÓN
// ============================================

/**
 * Cerrar sesión (registrar actividad)
 * 
 * @param {string} token - Token JWT
 * @param {string} userAgent - User agent del navegador
 * @returns {Promise<void>}
 */
const cerrarSesion = async (token, userAgent) => {
  logger.debug('Service: Cerrando sesión');
  
  try {
    // Decodificar token
    const decoded = jwt.verify(
      token,
      config.jwt.secret || 'naturapiscis_secret_key'
    );
    
    // Actualizar último acceso del dispositivo
    await authRepository.actualizarUltimoAcceso(decoded.id, userAgent);
    
    logger.info('Sesión cerrada', { userId: decoded.id });
  } catch (error) {
    // Ignorar errores de token en logout
    logger.debug('Error al cerrar sesión (ignorado)', { error: error.message });
  }
};

// ============================================
// HELPERS
// ============================================

/**
 * Generar token JWT
 * 
 * @param {Object} payload - Datos a incluir en el token
 * @returns {string} Token JWT
 */
const generarToken = (payload) => {
  const token = jwt.sign(
    payload,
    config.jwt.secret || 'naturapiscis_secret_key',
    { expiresIn: '7d' }  // 7 días
  );
  
  logger.debug('Token JWT generado', { userId: payload.id, rol: payload.rol });
  
  return token;
};

/**
 * Verificar contraseña
 * 
 * @param {string} passwordPlain - Contraseña en texto plano
 * @param {string} passwordHash - Hash de la contraseña
 * @returns {Promise<boolean>}
 */
const verificarPassword = async (passwordPlain, passwordHash) => {
  return await bcrypt.compare(passwordPlain, passwordHash);
};

// ============================================
// EXPORTAR SERVICIOS
// ============================================

module.exports = {
  registrarUsuario,
  iniciarSesion,
  verificarToken,
  cerrarSesion,
  
  // Helpers
  generarToken,
  verificarPassword
};