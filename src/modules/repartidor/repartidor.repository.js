// src/modules/repartidor/repartidor.repository.js
const db = require('../../config/database');

class RepartidorRepository {

  async findPedidosDisponibles(repartidorId) {
    return await db.query(`
      SELECT
        p.id, p.estado, p.codigo_retiro, p.total, p.fecha_pedido,
        d.direccion AS entrega_direccion, d.ciudad AS entrega_ciudad,
        uc.nombre AS consumidor_nombre, uc.telefono AS consumidor_telefono,
        COUNT(dp.id) AS total_items
      FROM pedidos p
      JOIN direcciones d      ON d.id = p.direccion_id
      JOIN usuarios uc        ON uc.id = p.consumidor_id
      JOIN detalles_pedido dp ON dp.pedido_id = p.id
      WHERE p.estado IN ('confirmado','preparando','listo_para_recoger','en_camino')
        AND (p.repartidor_id IS NULL OR p.repartidor_id = $1)
      GROUP BY p.id, d.direccion, d.ciudad, uc.nombre, uc.telefono
      ORDER BY p.fecha_pedido ASC
    `, [repartidorId]);
  }

  async findPedidoConConsumidor(pedidoId) {
    const result = await db.query(`
      SELECT p.id, p.estado, p.codigo_retiro, p.repartidor_id,
             u.expo_push_token AS consumidor_push_token,
             u.nombre          AS consumidor_nombre
      FROM pedidos p
      JOIN usuarios u ON u.id = p.consumidor_id
      WHERE p.id = $1
    `, [pedidoId]);
    return result[0] || null;
  }

  async asignarRepartidor(pedidoId, repartidorId) {
    const result = await db.query(`
      UPDATE pedidos
      SET estado = 'en_camino', repartidor_id = $1, fecha_recogida = NOW()
      WHERE id = $2
      RETURNING id, estado, codigo_retiro
    `, [repartidorId, pedidoId]);
    return result[0] || null;
  }

  async marcarEntregado(pedidoId) {
    const result = await db.query(`
      UPDATE pedidos SET estado = 'entregado', fecha_entrega_real = NOW()
      WHERE id = $1 RETURNING id, estado
    `, [pedidoId]);
    return result[0] || null;
  }

  async findMisPedidos(repartidorId) {
    return await db.query(`
      SELECT p.id, p.estado, p.codigo_retiro, p.total,
             p.fecha_pedido, p.fecha_recogida, p.fecha_entrega_real,
             d.direccion AS entrega_direccion, d.ciudad AS entrega_ciudad,
             uc.nombre AS consumidor_nombre, uc.telefono AS consumidor_telefono
      FROM pedidos p
      JOIN direcciones d ON d.id = p.direccion_id
      JOIN usuarios uc   ON uc.id = p.consumidor_id
      WHERE p.repartidor_id = $1
      ORDER BY p.fecha_pedido DESC LIMIT 50
    `, [repartidorId]);
  }

  // ✅ Devuelve las 3 ubicaciones: conductor, productor y consumidor
    async findTracking(pedidoId, consumidorId) {
    const result = await db.query(`
      SELECT
        p.id, p.estado, p.codigo_retiro, p.total,
        p.fecha_pedido, p.fecha_recogida, p.fecha_entrega_real,
        p.conductor_lat, p.conductor_lng,
        -- Conductor
        ur.nombre   AS repartidor_nombre,
        ur.telefono AS repartidor_telefono,
        -- Productor (origen)
        up.lat AS productor_lat,
        up.lng AS productor_lng,
        up.nombre AS productor_nombre,
        -- ✅ Destino: dirección si existe, si no la parada
        COALESCE(d.lat,  pa.lat)           AS consumidor_lat,
        COALESCE(d.lng,  pa.lng)           AS consumidor_lng,
        COALESCE(d.direccion, pa.nombre)   AS consumidor_direccion
      FROM pedidos p
      LEFT JOIN usuarios ur  ON ur.id = p.repartidor_id
      LEFT JOIN detalles_pedido dp ON dp.pedido_id = p.id
      LEFT JOIN productos pr ON pr.id = dp.producto_id
      LEFT JOIN usuarios up  ON up.id = pr.productor_id
      LEFT JOIN direcciones d  ON d.id  = p.direccion_id
      LEFT JOIN paradas     pa ON pa.id = p.parada_id
      WHERE p.id = $1 AND p.consumidor_id = $2
      LIMIT 1
    `, [pedidoId, consumidorId]);
    return result[0] || null;
  }

  async savePushToken(usuarioId, token) {
    await db.query(
      'UPDATE usuarios SET expo_push_token = $1 WHERE id = $2',
      [token, usuarioId]
    );
  }

  async findPushTokenConsumidor(pedidoId) {
    const result = await db.query(`
      SELECT u.expo_push_token, u.nombre, p.repartidor_id
      FROM pedidos p JOIN usuarios u ON u.id = p.consumidor_id
      WHERE p.id = $1
    `, [pedidoId]);
    return result[0] || null;
  }

  async actualizarUbicacion(pedidoId, lat, lng) {
    await db.query(
      `UPDATE pedidos SET conductor_lat = $1, conductor_lng = $2 WHERE id = $3`,
      [lat, lng, pedidoId]
    );
  }

  // ✅ Guardar ubicación del productor
  async guardarUbicacionProductor(usuarioId, lat, lng) {
    await db.query(
      'UPDATE usuarios SET lat = $1, lng = $2 WHERE id = $3',
      [lat, lng, usuarioId]
    );
  }

  // ✅ Guardar coordenadas de la dirección del consumidor
  async guardarUbicacionDireccion(direccionId, usuarioId, lat, lng) {
    await db.query(
      'UPDATE direcciones SET lat = $1, lng = $2 WHERE id = $3 AND usuario_id = $4',
      [lat, lng, direccionId, usuarioId]
    );
  }
}

module.exports = new RepartidorRepository();