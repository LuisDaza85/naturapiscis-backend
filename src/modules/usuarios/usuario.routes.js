const express = require('express');
const router = express.Router();
const usuarioController = require('./usuario.controller');
const { isAuthenticated, hasRole } = require('../../middlewares/auth.middleware');

// Perfil del usuario autenticado
router.get('/perfil', isAuthenticated, usuarioController.obtenerPerfil);
router.put('/perfil', isAuthenticated, usuarioController.actualizarPerfil);

// Rutas admin
router.get('/admin/todos', isAuthenticated, hasRole('admin'), usuarioController.obtenerTodosUsuarios);
router.patch('/admin/:id/estado', isAuthenticated, hasRole('admin'), usuarioController.cambiarEstadoUsuario);
router.put('/admin/:id', isAuthenticated, hasRole('admin'), usuarioController.editarUsuario);
router.delete('/admin/:id', isAuthenticated, hasRole('admin'), usuarioController.eliminarUsuario);

module.exports = router;
