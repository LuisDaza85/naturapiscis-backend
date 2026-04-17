const db = require("../../config/database");

// ✅ Generar código de retiro único NP-YYYY-XXXX
const generarCodigoRetiro = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NP-${year}-${random}`;
};

class PedidoRepository {
  async findByUsuario(usuarioId) {
    const query = `
      SELECT 
        p.*,
        (SELECT json_agg(json_build_object(
          'producto_id', dp.producto_id,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'nombre', pr.nombre,
          'imagen', pr.imagen,
          'preferencia_corte', dp.preferencia_corte
        ))
        FROM detalles_pedido dp
        JOIN productos pr ON dp.producto_id = pr.id
        WHERE dp.pedido_id = p.id) as items
      FROM pedidos p
      WHERE p.consumidor_id = $1
      ORDER BY p.fecha_pedido DESC
    `;
    return await db.query(query, [usuarioId]);
  }

  async findRecientesByUsuario(usuarioId) {
    const query = `
      SELECT 
        id, fecha_pedido, estado, total,
        (SELECT COUNT(*) FROM detalles_pedido WHERE pedido_id = pedidos.id) as items
      FROM pedidos
      WHERE consumidor_id = $1
      ORDER BY fecha_pedido DESC
      LIMIT 5
    `;
    return await db.query(query, [usuarioId]);
  }

  async findRecibidosByProductor(productorId) {
    const query = `
      SELECT 
        p.id, p.fecha_pedido, p.fecha_entrega, p.estado, p.total, p.metodo_envio,
        p.codigo_retiro, p.notas,
        u.nombre as consumidor, u.email as consumidor_email,
        u.telefono as telefono,
        (SELECT json_agg(json_build_object(
          'producto_id', dp.producto_id,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'nombre', pr2.nombre,
          'preferencia_corte', dp.preferencia_corte
        ))
        FROM detalles_pedido dp
        JOIN productos pr2 ON dp.producto_id = pr2.id
        WHERE dp.pedido_id = p.id) as items
      FROM pedidos p
      JOIN usuarios u ON p.consumidor_id = u.id
      JOIN detalles_pedido dp ON p.id = dp.pedido_id
      JOIN productos pr ON dp.producto_id = pr.id
      WHERE pr.productor_id = $1
      GROUP BY p.id, u.nombre, u.email, u.telefono
      ORDER BY p.fecha_pedido DESC
    `;
    return await db.query(query, [productorId]);
  }

  async findById(pedidoId) {
    const query = `
      SELECT 
        p.*,
        u.nombre as consumidor,
        u.email as consumidor_email,
        (SELECT json_agg(json_build_object(
          'producto_id', dp.producto_id,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'nombre', pr.nombre,
          'imagen', pr.imagen,
          'preferencia_corte', dp.preferencia_corte,
          'productor_id', pr.productor_id,
          'productor_nombre', prod.nombre,
          'productor_empresa', prod.nombre_empresa
        ))
        FROM detalles_pedido dp
        JOIN productos pr ON dp.producto_id = pr.id
        JOIN usuarios prod ON pr.productor_id = prod.id
        WHERE dp.pedido_id = p.id) as items
      FROM pedidos p
      JOIN usuarios u ON p.consumidor_id = u.id
      WHERE p.id = $1
    `;
    const result = await db.query(query, [pedidoId]);
    return result[0] || null;
  }

  async create(pedidoData) {
    return await db.transaction(async (tx) => {
      const { usuario_id, direccion, metodo_envio, items, notas, parada_id } = pedidoData;

      let direccion_id = pedidoData.direccion_id;
      if (!direccion_id && direccion) {
        const dirRes = await tx.query(
          `INSERT INTO direcciones (usuario_id, nombre, direccion, ciudad, codigo_postal, telefono, predeterminada)
           VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id`,
          [usuario_id,
           direccion.nombre || 'Sin nombre',
           direccion.direccion || 'Sin dirección',
           direccion.ciudad || 'Sin ciudad',
           direccion.codigo_postal || '0000',
           direccion.telefono || '']
        );
        direccion_id = dirRes[0].id;
      }

      const pagoRes = await tx.query(
        `INSERT INTO metodos_pago (usuario_id, tipo, predeterminado) VALUES ($1, 'efectivo', false) RETURNING id`,
        [usuario_id]
      );
      const metodo_pago_id_final = pagoRes[0].id;

      const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
      const costo_envio = pedidoData.costo_envio || 5.00;
      const total = subtotal + costo_envio;

      const pedido = await tx.query(
        `INSERT INTO pedidos (consumidor_id, direccion_id, parada_id, metodo_pago_id, metodo_envio, subtotal, costo_envio, total, estado, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', $9) RETURNING *`,
        [usuario_id, direccion_id, parada_id || null, metodo_pago_id_final, metodo_envio, subtotal, costo_envio, total, notas || null]
      );

      const pedido_id = pedido[0].id;

      for (const item of items) {
        await tx.query(
          `INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal, preferencia_corte)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pedido_id, item.producto_id, item.cantidad, item.precio, item.precio * item.cantidad, item.preferencia_corte || 'sin_preferencia']
        );
      }

      return pedido[0];
    });
  }

  // ✅ Genera código de retiro automáticamente al confirmar
  async updateEstado(pedidoId, nuevoEstado) {
    let query;
    let params;

    if (nuevoEstado === 'confirmado') {
      let codigo = generarCodigoRetiro();
      let intentos = 0;
      while (intentos < 5) {
        const existe = await db.query(
          `SELECT id FROM pedidos WHERE codigo_retiro = $1`, [codigo]
        );
        if (existe.length === 0) break;
        codigo = generarCodigoRetiro();
        intentos++;
      }

      query = `
        UPDATE pedidos 
        SET estado = $1, codigo_retiro = $2 
        WHERE id = $3 
        RETURNING *
      `;
      params = [nuevoEstado, codigo, pedidoId];
    } else {
      query = `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *`;
      params = [nuevoEstado, pedidoId];
    }

    const result = await db.query(query, params);
    return result[0] || null;
  }

  async verificarPropietario(pedidoId, usuarioId) {
    const result = await db.query(
      `SELECT id FROM pedidos WHERE id = $1 AND consumidor_id = $2`,
      [pedidoId, usuarioId]
    );
    return result.length > 0;
  }

  async findHistorial(usuarioId, filtros = {}) {
    let query = `
      SELECT p.id, p.fecha_pedido, p.estado, p.total, p.metodo_envio,
        (SELECT COUNT(*) FROM detalles_pedido WHERE pedido_id = p.id) as items
      FROM pedidos p
      WHERE p.consumidor_id = $1
    `;
    const params = [usuarioId];
    let paramIndex = 2;

    if (filtros.estado) {
      query += ` AND p.estado = $${paramIndex}`;
      params.push(filtros.estado);
      paramIndex++;
    }
    if (filtros.fecha_desde) {
      query += ` AND p.fecha_pedido >= $${paramIndex}`;
      params.push(filtros.fecha_desde);
      paramIndex++;
    }
    if (filtros.fecha_hasta) {
      query += ` AND p.fecha_pedido <= $${paramIndex}`;
      params.push(filtros.fecha_hasta);
      paramIndex++;
    }
    query += ` ORDER BY p.fecha_pedido DESC`;
    return await db.query(query, params);
  }

  async findAll() {
    const query = `
      SELECT 
        p.id, p.fecha_pedido, p.estado, p.total, p.costo_envio, p.metodo_envio,
        u.nombre as consumidor, u.email as consumidor_email
      FROM pedidos p
      JOIN usuarios u ON p.consumidor_id = u.id
      ORDER BY p.fecha_pedido DESC
    `;
    return await db.query(query);
  }
}

module.exports = new PedidoRepository();