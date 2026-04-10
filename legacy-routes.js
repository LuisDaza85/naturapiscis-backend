// ============================================================================
// LEGACY ROUTES - RUTAS TEMPORALES
// ============================================================================
// Este archivo contiene rutas que aún NO están implementadas en módulos
// TODO: Migrar gradualmente estas rutas a módulos individuales
//
// Módulos pendientes:
// - [ ] modules/pedidos/
// - [ ] modules/carrito/
// - [ ] modules/productores/
// - [ ] modules/estadisticas/
// - [ ] modules/reservas/
// - [ ] modules/categorias/
// ============================================================================

const express = require("express");
const router = express.Router();
const db = require("./db-connection");
const { isAuthenticated, hasRole } = require("./auth-middleware");

// Middleware para manejar errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================================
// CATEGORÍAS
// ============================================================================

router.get("/categorias", asyncHandler(async (req, res) => {
  const categorias = await db.query("SELECT * FROM categorias");
  res.json(categorias);
}));

// ============================================================================
// PERFIL USUARIO GENERAL
// ============================================================================

router.get("/perfil", isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.user;
  const usuarios = await db.query(`
    SELECT id, rol_id, nombre, email, telefono, direccion, fecha_registro, foto_perfil
    FROM usuarios
    WHERE id = $1
  `, [id]);

  if (!usuarios.length) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }

  res.json(usuarios[0]);
}));

// ============================================================================
// GESTIÓN DE PRODUCTOS DEL PRODUCTOR (MIS-PRODUCTOS)
// ============================================================================

router.get(
  "/mis-productos",
  isAuthenticated,
  hasRole(["productor"]),
  asyncHandler(async (req, res) => {
    const { id } = req.user;

    const productos = await db.query(
      `
      SELECT p.*, c.nombre as categoria
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.productor_id = $1
      ORDER BY p.fecha_creacion DESC
      `,
      [id]
    );

    res.json(productos);
  })
);

router.post(
  "/mis-productos",
  isAuthenticated,
  hasRole(["productor"]),
  asyncHandler(async (req, res) => {
    const { nombre, descripcion, precio, stock, categoria_id, imagen } = req.body;
    const { id: productor_id } = req.user;

    if (!nombre || !precio || !stock || !categoria_id) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const nuevoProducto = await db.query(
      `
      INSERT INTO productos (productor_id, categoria_id, nombre, descripcion, precio, stock, imagen, unidad, disponible, destacado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'kg', TRUE, FALSE)
      RETURNING *
      `,
      [productor_id, categoria_id, nombre, descripcion, precio, stock, imagen]
    );

    res.status(201).json({ message: "Producto creado exitosamente", producto: nuevoProducto[0] });
  })
);

router.put(
  "/mis-productos/:id",
  isAuthenticated,
  hasRole(["productor"]),
  asyncHandler(async (req, res) => {
    const { id: productoId } = req.params;
    const { nombre, descripcion, precio, stock, categoria_id, imagen } = req.body;
    const { id: productor_id } = req.user;

    const existente = await db.query(
      "SELECT id FROM productos WHERE id = $1 AND productor_id = $2",
      [productoId, productor_id]
    );

    if (!existente.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await db.query(
      `
      UPDATE productos
      SET nombre = $1, descripcion = $2, precio = $3, stock = $4, categoria_id = $5, imagen = $6
      WHERE id = $7 AND productor_id = $8
      `,
      [nombre, descripcion, precio, stock, categoria_id, imagen, productoId, productor_id]
    );

    res.json({ message: "Producto actualizado exitosamente" });
  })
);

router.delete(
  "/mis-productos/:id",
  isAuthenticated,
  hasRole(["productor"]),
  asyncHandler(async (req, res) => {
    const { id: productoId } = req.params;
    const { id: productor_id } = req.user;

    const existente = await db.query(
      "SELECT id FROM productos WHERE id = $1 AND productor_id = $2",
      [productoId, productor_id]
    );

    if (!existente.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await db.query(
      "DELETE FROM productos WHERE id = $1 AND productor_id = $2",
      [productoId, productor_id]
    );

    res.json({ message: "Producto eliminado exitosamente" });
  })
);

// ============================================================================
// PEDIDOS - TODO: Migrar a modules/pedidos/
// ============================================================================

// Obtener pedidos (recibidos por productor)
router.get("/pedidos/recibidos", isAuthenticated, hasRole(["productor"]), asyncHandler(async (req, res) => {
  const { id: productor_id } = req.user;

  const pedidos = await db.query(`
    SELECT 
      p.id,
      p.fecha_pedido,
      p.fecha_entrega,
      p.estado,
      p.total,
      p.metodo_envio,
      u.nombre as consumidor,
      u.email as consumidor_email
    FROM pedidos p
    JOIN usuarios u ON p.usuario_id = u.id
    JOIN detalle_pedido dp ON p.id = dp.pedido_id
    JOIN productos pr ON dp.producto_id = pr.id
    WHERE pr.productor_id = $1
    GROUP BY p.id, u.nombre, u.email
    ORDER BY p.fecha_pedido DESC
  `, [productor_id]);

  res.json(pedidos);
}));

// Obtener pedidos recientes del consumidor
router.get("/pedidos/recientes", isAuthenticated, asyncHandler(async (req, res) => {
  const { id: usuario_id } = req.user;

  const pedidos = await db.query(`
    SELECT 
      id,
      fecha_pedido as date,
      estado as status,
      total,
      (SELECT COUNT(*) FROM detalle_pedido WHERE pedido_id = pedidos.id) as items
    FROM pedidos
    WHERE usuario_id = $1
    ORDER BY fecha_pedido DESC
    LIMIT 5
  `, [usuario_id]);

  res.json(pedidos);
}));

// Obtener todos los pedidos del usuario
router.get("/pedidos", isAuthenticated, asyncHandler(async (req, res) => {
  const { id: usuario_id } = req.user;

  const pedidos = await db.query(`
    SELECT 
      p.*,
      (SELECT json_agg(json_build_object(
        'producto_id', dp.producto_id,
        'cantidad', dp.cantidad,
        'precio_unitario', dp.precio_unitario,
        'nombre', pr.nombre,
        'imagen', pr.imagen
      ))
      FROM detalle_pedido dp
      JOIN productos pr ON dp.producto_id = pr.id
      WHERE dp.pedido_id = p.id) as items
    FROM pedidos p
    WHERE p.usuario_id = $1
    ORDER BY p.fecha_pedido DESC
  `, [usuario_id]);

  res.json(pedidos);
}));

// Actualizar estado del pedido
router.put("/pedidos/:id/estado", isAuthenticated, hasRole(["productor"]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  const estadosPermitidos = ["pendiente", "confirmado", "en preparacion", "en camino", "entregado", "cancelado"];
  if (!estadosPermitidos.includes(nuevoEstado)) {
    return res.status(400).json({ error: "Estado no válido" });
  }

  await db.query(
    `UPDATE pedidos SET estado = $1 WHERE id = $2`,
    [nuevoEstado, id]
  );

  res.json({ message: "Estado del pedido actualizado correctamente" });
}));

// ============================================================================
// CARRITO - TODO: Migrar a modules/carrito/
// ============================================================================

// Obtener carrito del usuario
router.get("/carrito", isAuthenticated, asyncHandler(async (req, res) => {
  const { id: usuario_id } = req.user;

  const items = await db.query(`
    SELECT 
      c.id,
      c.producto_id,
      c.cantidad,
      p.nombre,
      p.descripcion,
      p.precio,
      p.imagen,
      p.stock,
      p.unidad,
      (p.precio * c.cantidad) as subtotal
    FROM carrito c
    JOIN productos p ON c.producto_id = p.id
    WHERE c.usuario_id = $1
  `, [usuario_id]);

  res.json({ items });
}));

// Agregar producto al carrito
router.post("/carrito", isAuthenticated, asyncHandler(async (req, res) => {
  const { producto_id, cantidad = 1 } = req.body;
  const { id: usuario_id } = req.user;

  // Verificar si el producto ya está en el carrito
  const existente = await db.query(
    "SELECT id, cantidad FROM carrito WHERE usuario_id = $1 AND producto_id = $2",
    [usuario_id, producto_id]
  );

  if (existente.length > 0) {
    // Actualizar cantidad
    const nuevaCantidad = existente[0].cantidad + cantidad;
    await db.query(
      "UPDATE carrito SET cantidad = $1 WHERE id = $2",
      [nuevaCantidad, existente[0].id]
    );
  } else {
    // Insertar nuevo
    await db.query(
      "INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3)",
      [usuario_id, producto_id, cantidad]
    );
  }

  res.json({ message: "Producto agregado al carrito" });
}));

// Actualizar cantidad en carrito
router.put("/carrito/:id", isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;
  const { id: usuario_id } = req.user;

  await db.query(
    "UPDATE carrito SET cantidad = $1 WHERE id = $2 AND usuario_id = $3",
    [cantidad, id, usuario_id]
  );

  res.json({ message: "Cantidad actualizada" });
}));

// Eliminar del carrito
router.delete("/carrito/:id", isAuthenticated, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: usuario_id } = req.user;

  await db.query(
    "DELETE FROM carrito WHERE id = $1 AND usuario_id = $2",
    [id, usuario_id]
  );

  res.json({ message: "Producto eliminado del carrito" });
}));

// Crear pedido desde carrito
router.post("/pedidos", isAuthenticated, asyncHandler(async (req, res) => {
  const { direccion_id, metodo_pago_id, metodo_envio, notas } = req.body;
  const { id: usuario_id } = req.user;

  await db.transaction(async (tx) => {
    // Obtener items del carrito
    const items = await tx.query(`
      SELECT c.producto_id, c.cantidad, p.precio
      FROM carrito c
      JOIN productos p ON c.producto_id = p.id
      WHERE c.usuario_id = $1
    `, [usuario_id]);

    if (items.length === 0) {
      throw new Error("El carrito está vacío");
    }

    // Calcular total
    const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const costo_envio = 5.00; // Fijo por ahora
    const total = subtotal + costo_envio;

    // Crear pedido
    const pedido = await tx.query(`
      INSERT INTO pedidos (usuario_id, direccion_id, metodo_pago_id, metodo_envio, subtotal, costo_envio, total, estado, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8)
      RETURNING id
    `, [usuario_id, direccion_id, metodo_pago_id, metodo_envio, subtotal, costo_envio, total, notas]);

    const pedido_id = pedido[0].id;

    // Insertar detalles
    for (const item of items) {
      await tx.query(`
        INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
        VALUES ($1, $2, $3, $4)
      `, [pedido_id, item.producto_id, item.cantidad, item.precio]);
    }

    // Limpiar carrito
    await tx.query("DELETE FROM carrito WHERE usuario_id = $1", [usuario_id]);

    return { pedido_id, total };
  });

  res.status(201).json({ message: "Pedido creado exitosamente" });
}));

// ============================================================================
// PRODUCTORES - TODO: Migrar a modules/productores/
// ============================================================================

// Obtener todos los productores
router.get("/productores", asyncHandler(async (req, res) => {
  const productores = await db.query(`
    SELECT 
      id,
      nombre,
      nombre_empresa,
      descripcion,
      ubicacion,
      foto_perfil,
      years_experience,
      especialidad,
      certificaciones,
      sitio_web,
      telefono,
      email
    FROM usuarios
    WHERE rol_id = 2 AND perfil_publico = TRUE
    ORDER BY fecha_registro DESC
  `);

  // Parse JSON fields
  for (const productor of productores) {
    try {
      productor.especialidad = typeof productor.especialidad === "string" 
        ? JSON.parse(productor.especialidad) 
        : productor.especialidad || [];
      productor.certificaciones = typeof productor.certificaciones === "string" 
        ? JSON.parse(productor.certificaciones) 
        : productor.certificaciones || [];
    } catch (e) {
      productor.especialidad = [];
      productor.certificaciones = [];
    }
  }

  res.json({ productores });
}));

// Obtener productor por ID
router.get("/productores/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT *
    FROM usuarios
    WHERE id = $1 AND rol_id = 2
  `, [id]);

  if (!result.length) {
    return res.status(404).json({ error: "Productor no encontrado" });
  }

  const productor = result[0];

  // Parse JSON fields
  const tryParse = (val) => {
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return [];
    }
  };

  productor.dias_venta = tryParse(productor.dias_venta);
  productor.dias_envio = tryParse(productor.dias_envio);
  productor.galeria_criadero = tryParse(productor.galeria_criadero);
  productor.certificaciones = tryParse(productor.certificaciones);
  productor.metodos_envio = tryParse(productor.metodos_envio);
  productor.especialidades = tryParse(productor.especialidad);

  res.json(productor);
}));

// Obtener productos de un productor
router.get("/productores/:id/productos", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const productos = await db.query(`
    SELECT p.*, c.nombre as categoria
    FROM productos p
    JOIN categorias c ON p.categoria_id = c.id
    WHERE p.productor_id = $1 AND p.disponible = TRUE
    ORDER BY p.fecha_creacion DESC
  `, [id]);

  res.json(productos);
}));

// Obtener perfil del productor autenticado
router.get("/productor/perfil", isAuthenticated, hasRole(["productor"]), asyncHandler(async (req, res) => {
  const { id } = req.user;

  const result = await db.query(`
    SELECT *
    FROM usuarios
    WHERE id = $1 AND rol_id = 2
  `, [id]);

  if (!result.length) {
    return res.status(404).json({ error: "Perfil del productor no encontrado" });
  }

  const productor = result[0];

  const tryParse = (val) => {
    try {
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch {
      return [];
    }
  };

  productor.dias_venta = tryParse(productor.dias_venta);
  productor.dias_envio = tryParse(productor.dias_envio);
  productor.galeria_criadero = tryParse(productor.galeria_criadero);
  productor.certificaciones = tryParse(productor.certificaciones);
  productor.metodos_envio = tryParse(productor.metodos_envio);
  productor.especialidades = tryParse(productor.especialidad);

  res.json(productor);
}));

// Actualizar perfil del productor autenticado
router.put("/productor/perfil", isAuthenticated, hasRole(["productor"]), asyncHandler(async (req, res) => {
  const { id } = req.user;
  const data = req.body;

  const result = await db.query(
    `UPDATE usuarios SET 
      nombre = $1, 
      email = $2, 
      telefono = $3, 
      ubicacion = $4, 
      direccion = $5,
      descripcion = $6, 
      foto_perfil = $7, 
      years_experience = $8, 
      nombre_empresa = $9,
      rfc = $10, 
      tipo_empresa = $11, 
      num_empleados = $12, 
      sitio_web = $13,
      facebook = $14, 
      instagram = $15, 
      twitter = $16, 
      horario_atencion_inicio = $17,
      horario_atencion_fin = $18, 
      zona_horaria = $19, 
      dias_venta = $20, 
      dias_envio = $21,
      galeria_criadero = $22, 
      certificaciones = $23, 
      metodos_envio = $24, 
      especialidad = $25,
      perfil_publico = $26, 
      mostrar_telefono = $27, 
      mostrar_email = $28, 
      mostrar_direccion = $29,
      updated_at = NOW()
    WHERE id = $30 AND rol_id = 2
    RETURNING id, nombre, email, updated_at`,
    [
      data.nombre,
      data.email,
      data.telefono,
      data.ciudad,
      data.direccion_completa,
      data.descripcion,
      data.foto_perfil,
      data.years_experience,
      data.nombre_empresa,
      data.rfc,
      data.tipo_empresa,
      data.num_empleados,
      data.sitio_web,
      data.facebook,
      data.instagram,
      data.twitter,
      data.horario_atencion_inicio,
      data.horario_atencion_fin,
      data.zona_horaria,
      JSON.stringify(data.dias_venta || []),
      JSON.stringify(data.dias_envio || []),
      JSON.stringify(data.galeria_criadero || []),
      JSON.stringify(data.certificaciones || []),
      JSON.stringify(data.metodos_envio || []),
      JSON.stringify(data.especialidades || []),
      data.perfil_publico,
      data.mostrar_telefono,
      data.mostrar_email,
      data.mostrar_direccion,
      id
    ]
  );

  if (!result.length) {
    return res.status(404).json({ error: "Productor no encontrado o no autorizado" });
  }

  res.status(200).json({ 
    success: true,
    message: "Perfil actualizado correctamente",
    data: result[0]
  });
}));

// Actualizar productor por ID (público)
router.put('/productores/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const result = await db.query(
    `UPDATE usuarios SET 
      nombre = $1, email = $2, telefono = $3, ubicacion = $4, direccion = $5,
      descripcion = $6, foto_perfil = $7, years_experience = $8, nombre_empresa = $9,
      rfc = $10, tipo_empresa = $11, num_empleados = $12, sitio_web = $13,
      facebook = $14, instagram = $15, twitter = $16, horario_atencion_inicio = $17,
      horario_atencion_fin = $18, zona_horaria = $19, dias_venta = $20, dias_envio = $21,
      galeria_criadero = $22, certificaciones = $23, metodos_envio = $24, especialidad = $25,
      perfil_publico = $26, mostrar_telefono = $27, mostrar_email = $28, mostrar_direccion = $29,
      updated_at = NOW()
    WHERE id = $30 AND rol_id = 2
    RETURNING id, nombre, email`,
    [
      data.nombre, data.email, data.telefono, data.ciudad, data.direccion_completa,
      data.descripcion, data.foto_perfil, data.years_experience, data.nombre_empresa,
      data.rfc, data.tipo_empresa, data.num_empleados, data.sitio_web,
      data.facebook, data.instagram, data.twitter, data.horario_atencion_inicio,
      data.horario_atencion_fin, data.zona_horaria,
      JSON.stringify(data.dias_venta), JSON.stringify(data.dias_envio),
      JSON.stringify(data.galeria_criadero), JSON.stringify(data.certificaciones),
      JSON.stringify(data.metodos_envio), JSON.stringify(data.especialidades),
      data.perfil_publico, data.mostrar_telefono, data.mostrar_email, data.mostrar_direccion,
      id
    ]
  );
  
  res.status(200).json({ 
    success: true, 
    message: "Perfil actualizado correctamente",
    data: result[0] 
  });
}));

// ============================================================================
// RESERVAS - TODO: Migrar a modules/reservas/
// ============================================================================

router.post("/reservas", isAuthenticated, asyncHandler(async (req, res) => {
  const { productor_id, producto_id, cantidad, fecha_reserva, hora_reserva, es_cocinado, notas } = req.body;

  const result = await db.query(
    `INSERT INTO reservas (consumidor_id, productor_id, producto_id, cantidad, fecha_reserva, hora_reserva, es_cocinado, notas, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente')
     RETURNING id`,
    [req.user.id, productor_id, producto_id, cantidad, fecha_reserva, hora_reserva, es_cocinado, notas]
  );

  res.status(201).json({ id: result[0].id, mensaje: "Reserva creada exitosamente" });
}));

// ============================================================================
// ESTADÍSTICAS - TODO: Migrar a modules/estadisticas/
// ============================================================================

router.get("/estadisticas/productor", isAuthenticated, hasRole(["productor"]), asyncHandler(async (req, res) => {
  const { id: productor_id } = req.user;

  // Ventas totales
  const ventasTotales = await db.query(`
    SELECT COALESCE(SUM(p.total), 0) as total
    FROM pedidos p
    JOIN detalle_pedido dp ON p.id = dp.pedido_id
    JOIN productos pr ON dp.producto_id = pr.id
    WHERE pr.productor_id = $1 AND p.estado != 'cancelado'
  `, [productor_id]);

  // Producción total (suma de stock de productos)
  const produccionTotal = await db.query(`
    SELECT COALESCE(SUM(stock), 0) as total
    FROM productos
    WHERE productor_id = $1
  `, [productor_id]);

  // Clientes activos
  const clientesActivos = await db.query(`
    SELECT COUNT(DISTINCT p.usuario_id) as total
    FROM pedidos p
    JOIN detalle_pedido dp ON p.id = dp.pedido_id
    JOIN productos pr ON dp.producto_id = pr.id
    WHERE pr.productor_id = $1
  `, [productor_id]);

  // Ventas mensuales (últimos 12 meses)
  const ventasMensuales = await db.query(`
    SELECT 
      TO_CHAR(p.fecha_pedido, 'Mon') as mes,
      COALESCE(SUM(p.total), 0) as valor
    FROM pedidos p
    JOIN detalle_pedido dp ON p.id = dp.pedido_id
    JOIN productos pr ON dp.producto_id = pr.id
    WHERE pr.productor_id = $1 
      AND p.fecha_pedido >= NOW() - INTERVAL '12 months'
      AND p.estado != 'cancelado'
    GROUP BY mes, EXTRACT(MONTH FROM p.fecha_pedido)
    ORDER BY EXTRACT(MONTH FROM p.fecha_pedido)
  `, [productor_id]);

  // Distribución de productos (top 5)
  const distribucionProductos = await db.query(`
    SELECT 
      pr.nombre as producto,
      COUNT(dp.id) as cantidad,
      ROUND(COUNT(dp.id) * 100.0 / NULLIF(SUM(COUNT(dp.id)) OVER (), 0), 1) as porcentaje
    FROM detalle_pedido dp
    JOIN productos pr ON dp.producto_id = pr.id
    WHERE pr.productor_id = $1
    GROUP BY pr.id, pr.nombre
    ORDER BY cantidad DESC
    LIMIT 5
  `, [productor_id]);

  res.json({
    ventasTotales: parseFloat(ventasTotales[0].total),
    produccionTotal: parseInt(produccionTotal[0].total),
    clientesActivos: parseInt(clientesActivos[0].total),
    ventasMensuales: ventasMensuales.length > 0 ? ventasMensuales : [
      { mes: "Ene", valor: 0 }, { mes: "Feb", valor: 0 }, { mes: "Mar", valor: 0 },
      { mes: "Abr", valor: 0 }, { mes: "May", valor: 0 }, { mes: "Jun", valor: 0 },
      { mes: "Jul", valor: 0 }, { mes: "Ago", valor: 0 }, { mes: "Sep", valor: 0 },
      { mes: "Oct", valor: 0 }, { mes: "Nov", valor: 0 }, { mes: "Dic", valor: 0 }
    ],
    distribucionProductos: distribucionProductos.map(d => ({
      producto: d.producto,
      porcentaje: parseFloat(d.porcentaje)
    }))
  });
}));

// ============================================================================
// MIDDLEWARE DE ERROR - Debe ir al final
// ============================================================================

// Middleware para manejar rutas no encontradas (404)
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;