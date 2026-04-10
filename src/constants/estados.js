// ============================================
// src/constants/estados.js
// Estados de los pedidos en NaturaPiscis
// ============================================

const ESTADOS_PEDIDO = {
  PENDIENTE:  'pendiente',
  CONFIRMADO: 'confirmado',
  ENVIADO:    'enviado',
  ENTREGADO:  'entregado',
  CANCELADO:  'cancelado',
};

const ESTADOS_PEDIDO_LISTA = Object.values(ESTADOS_PEDIDO);

const ESTADOS_PRODUCTO = {
  DISPONIBLE:     'disponible',
  NO_DISPONIBLE:  'no_disponible',
  AGOTADO:        'agotado',
};

module.exports = {
  ESTADOS_PEDIDO,
  ESTADOS_PEDIDO_LISTA,
  ESTADOS_PRODUCTO,
};