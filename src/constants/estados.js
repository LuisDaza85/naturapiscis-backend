// ============================================
// src/constants/estados.js
// Estados de los pedidos en NaturaPiscis
// ============================================

const ESTADOS_PEDIDO = {
  PENDIENTE:          'pendiente',
  CONFIRMADO:         'confirmado',
  PREPARANDO:         'preparando',
  LISTO_PARA_RECOGER: 'listo_para_recoger',
  EN_CAMINO:          'en_camino',
  ENTREGADO:          'entregado',
  CANCELADO:          'cancelado',
};

// Flujo válido de transición: pendiente → confirmado → preparando → listo_para_recoger → en_camino → entregado
const ESTADOS_PEDIDO_LISTA = Object.values(ESTADOS_PEDIDO);

// Estados que permiten ver el tracking en tiempo real
const ESTADOS_TRACKING = [
  'confirmado',
  'preparando',
  'listo_para_recoger',
  'en_camino',
];

const ESTADOS_PRODUCTO = {
  DISPONIBLE:     'disponible',
  NO_DISPONIBLE:  'no_disponible',
  AGOTADO:        'agotado',
};

module.exports = {
  ESTADOS_PEDIDO,
  ESTADOS_PEDIDO_LISTA,
  ESTADOS_TRACKING,
  ESTADOS_PRODUCTO,
};