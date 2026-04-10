// productor.repository.js - Capa de acceso a datos para Productores
const db = require("../../config/database");

class ProductorRepository {
  /**
   * Obtener todos los productores públicos
   */
  async findAll() {
    const query = `
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
        email,
        perfil_publico
      FROM usuarios
      WHERE rol_id = 2 AND perfil_publico = TRUE
      ORDER BY fecha_registro DESC
    `;
    
    return await db.query(query);
  }

  /**
   * Obtener productor por ID
   */
  async findById(productorId) {
    const query = `
      SELECT *
      FROM usuarios
      WHERE id = $1 AND rol_id = 2
    `;
    
    const result = await db.query(query, [productorId]);
    return result[0] || null;
  }

  /**
   * Obtener perfil del productor autenticado
   */
  async findPerfil(productorId) {
    console.log('📊 [REPOSITORY] ========== BUSCANDO PERFIL ==========');
    console.log('📊 [REPOSITORY] productorId:', productorId);
    console.log('📊 [REPOSITORY] Tipo:', typeof productorId);
    
    const query = `
      SELECT *
      FROM usuarios
      WHERE id = $1 AND rol_id = 2
    `;
    
    console.log('📊 [REPOSITORY] Query:', query);
    console.log('📊 [REPOSITORY] Parámetros:', [productorId]);
    console.log('📊 [REPOSITORY] Ejecutando query...');
    
    try {
      const result = await db.query(query, [productorId]);
      console.log('✅ [REPOSITORY] Query ejecutada correctamente');
      console.log('📊 [REPOSITORY] Número de resultados:', result.length);
      console.log('📊 [REPOSITORY] Datos:', result[0] ? 'Productor encontrado ✅' : 'No encontrado ❌');
      
      if (result[0]) {
        console.log('📊 [REPOSITORY] ID del productor:', result[0].id);
        console.log('📊 [REPOSITORY] Nombre:', result[0].nombre);
        console.log('📊 [REPOSITORY] Rol ID:', result[0].rol_id);
      }
      
      return result[0] || null;
    } catch (error) {
      console.log('❌ [REPOSITORY] Error en query:', error.message);
      console.log('❌ [REPOSITORY] Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Obtener productos de un productor
   */
  async findProductos(productorId) {
    const query = `
      SELECT p.*, c.nombre as categoria
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.productor_id = $1 AND p.disponible = TRUE
      ORDER BY p.fecha_creacion DESC
    `;
    
    return await db.query(query, [productorId]);
  }

  /**
   * Actualizar perfil del productor
   */
  async updatePerfil(productorId, data) {
    const query = `
      UPDATE usuarios SET 
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
      RETURNING id, nombre, email, updated_at
    `;
    
    const result = await db.query(query, [
      data.nombre,
      data.email,
      data.telefono,
      data.ubicacion,
      data.direccion,
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
      JSON.stringify(data.especialidad || []),
      data.perfil_publico,
      data.mostrar_telefono,
      data.mostrar_email,
      data.mostrar_direccion,
      productorId
    ]);
    
    return result[0] || null;
  }

  /**
   * Verificar si el usuario es productor
   */
  async esProductor(usuarioId) {
    const query = `SELECT id FROM usuarios WHERE id = $1 AND rol_id = 2`;
    const result = await db.query(query, [usuarioId]);
    return result.length > 0;
  }

  /**
   * Buscar productores por nombre o especialidad
   */
  async buscar(termino) {
    const query = `
      SELECT 
        id,
        nombre,
        nombre_empresa,
        descripcion,
        ubicacion,
        foto_perfil,
        especialidad,
        years_experience
      FROM usuarios
      WHERE rol_id = 2 
        AND perfil_publico = TRUE
        AND (
          nombre ILIKE $1 
          OR nombre_empresa ILIKE $1
          OR ubicacion ILIKE $1
        )
      ORDER BY nombre
    `;
    
    return await db.query(query, [`%${termino}%`]);
  }
}

module.exports = new ProductorRepository();