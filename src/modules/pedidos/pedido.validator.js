// pedido.validator.js - Validaciones para Pedidos
const { body, param, query } = require('express-validator');

const pedidoValidator = {
  crearPedido: [
    body('direccion_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La dirección debe ser un ID válido'),

    body('metodo_pago_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El método de pago debe ser un ID válido'),

    body('metodo_envio')
      .notEmpty()
      .withMessage('El método de envío es obligatorio')
      .isIn(['domicilio', 'retiro', 'pickup', 'parada']) // ✅ agregado 'parada'
      .withMessage('Método de envío no válido'),

    body('items')
      .isArray({ min: 1 })
      .withMessage('Debe incluir al menos un producto'),

    body('items.*.producto_id')
      .isInt({ min: 1 })
      .withMessage('ID de producto inválido'),

    body('items.*.cantidad')
      .isInt({ min: 1 })
      .withMessage('La cantidad debe ser al menos 1'),

    body('items.*.precio')
      .isFloat({ min: 0 })
      .withMessage('El precio debe ser un número positivo'),

    body('notas')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Las notas no pueden exceder 500 caracteres'),
  ],

  actualizarEstado: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de pedido inválido'),

    // Aceptamos cualquier variante — el service la normaliza antes de validar
    body('nuevoEstado')
      .notEmpty()
      .withMessage('El nuevo estado es obligatorio')
      .isString()
      .withMessage('El estado debe ser un texto'),
  ],

  obtenerPorId: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de pedido inválido'),
  ],

  obtenerHistorial: [
    query('estado')
      .optional()
      .isIn(['pendiente', 'confirmado', 'en preparacion', 'en camino', 'entregado', 'cancelado'])
      .withMessage('Estado no válido'),

    query('fecha_desde')
      .optional()
      .isISO8601()
      .withMessage('Fecha desde debe ser una fecha válida'),

    query('fecha_hasta')
      .optional()
      .isISO8601()
      .withMessage('Fecha hasta debe ser una fecha válida'),
  ],
};

module.exports = pedidoValidator;