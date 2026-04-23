// src/modules/pedidos/pedido.validator.js
const { body, param, query } = require('express-validator');
const { PESO_MINIMO_GRAMOS } = require('../../constants/estados');

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
      .isIn(['domicilio', 'retiro', 'pickup', 'parada'])
      .withMessage('Método de envío no válido'),

    body('items')
      .isArray({ min: 1 })
      .withMessage('Debe incluir al menos un producto'),

    body('items.*.producto_id')
      .isInt({ min: 1 })
      .withMessage('ID de producto inválido'),

    // ✅ cantidad = número de pescados (mínimo 1)
    body('items.*.cantidad')
      .isInt({ min: 1 })
      .withMessage('La cantidad debe ser al menos 1 pescado'),

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

    body('nuevoEstado')
      .notEmpty()
      .withMessage('El nuevo estado es obligatorio')
      .isString()
      .withMessage('El estado debe ser un texto'),
  ],

  // ✅ NUEVO: validar registro de peso
  registrarPeso: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de pedido inválido'),

    body('cantidad_pescados')
      .notEmpty()
      .withMessage('La cantidad de pescados es obligatoria')
      .isInt({ min: 1 })
      .withMessage('La cantidad de pescados debe ser al menos 1'),

    body('peso_real_kg')
      .notEmpty()
      .withMessage('El peso real en kg es obligatorio')
      .isFloat({ min: 0.001 })
      .withMessage('El peso debe ser mayor a 0 kg')
      .custom((value, { req }) => {
        // Validar peso mínimo promedio por pescado
        const cantidad   = parseInt(req.body.cantidad_pescados);
        const pesoGramos = parseFloat(value) * 1000;
        if (cantidad > 0 && pesoGramos / cantidad < PESO_MINIMO_GRAMOS) {
          throw new Error(
            `El peso promedio por pescado (${(pesoGramos / cantidad).toFixed(0)}g) ` +
            `es menor al mínimo permitido (${PESO_MINIMO_GRAMOS}g)`
          );
        }
        return true;
      }),
  ],

  obtenerPorId: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID de pedido inválido'),
  ],

  obtenerHistorial: [
    query('estado')
      .optional()
      .isIn([
        'pendiente', 'confirmado', 'preparando', 'pesado',
        'esperando_confirmacion', 'listo_para_recoger',
        'en_camino', 'entregado', 'cancelado',
      ])
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