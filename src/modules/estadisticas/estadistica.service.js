// estadistica.service.js - Lógica de negocio para Estadísticas
const estadisticaRepository = require('./estadistica.repository');
const { AppError } = require('../../utils/errors');

class EstadisticaService {
  async obtenerEstadisticasProductor(productorId) {
    try {
      const [ventasTotales, produccionTotal, clientesActivos, ventasMensuales, distribucionProductos] = await Promise.all([
        estadisticaRepository.obtenerVentasTotales(productorId),
        estadisticaRepository.obtenerProduccionTotal(productorId),
        estadisticaRepository.obtenerClientesActivos(productorId),
        estadisticaRepository.obtenerVentasMensuales(productorId),
        estadisticaRepository.obtenerDistribucionProductos(productorId)
      ]);
      return {
        ventasTotales,
        produccionTotal,
        clientesActivos,
        ventasMensuales: this.formatearVentasMensuales(ventasMensuales),
        distribucionProductos: distribucionProductos.map(d => ({
          producto: d.producto,
          porcentaje: parseFloat(d.porcentaje)
        }))
      };
    } catch (error) {
      throw new AppError('Error al obtener estadísticas del productor', 500);
    }
  }

  async obtenerEstadisticasVentas(productorId) {
    try {
      const [ventasTotales, ventasMensuales, pedidosPorEstado, tasaConversion] = await Promise.all([
        estadisticaRepository.obtenerVentasTotales(productorId),
        estadisticaRepository.obtenerVentasMensuales(productorId),
        estadisticaRepository.obtenerPedidosPorEstado(productorId),
        estadisticaRepository.obtenerTasaConversion(productorId)
      ]);
      const tasaConversionPorcentaje = tasaConversion.total > 0
        ? ((tasaConversion.completados / tasaConversion.total) * 100).toFixed(2) : 0;
      return {
        ventasTotales,
        ventasMensuales: this.formatearVentasMensuales(ventasMensuales),
        pedidosPorEstado,
        tasaConversion: {
          completados: parseInt(tasaConversion.completados),
          cancelados: parseInt(tasaConversion.cancelados),
          total: parseInt(tasaConversion.total),
          porcentaje: parseFloat(tasaConversionPorcentaje)
        }
      };
    } catch (error) {
      throw new AppError('Error al obtener estadísticas de ventas', 500);
    }
  }

  async obtenerEstadisticasProductos(productorId) {
    try {
      const [distribucionProductos, productosMasVendidos, produccionTotal] = await Promise.all([
        estadisticaRepository.obtenerDistribucionProductos(productorId),
        estadisticaRepository.obtenerProductosMasVendidos(productorId, 10),
        estadisticaRepository.obtenerProduccionTotal(productorId)
      ]);
      return {
        produccionTotal,
        distribucionProductos: distribucionProductos.map(d => ({
          producto: d.producto,
          porcentaje: parseFloat(d.porcentaje)
        })),
        productosMasVendidos: productosMasVendidos.map(p => ({
          id: p.id,
          nombre: p.nombre,
          precio: parseFloat(p.precio),
          total_vendido: parseInt(p.total_vendido),
          unidades_vendidas: parseInt(p.unidades_vendidas),
          ingresos_generados: parseFloat(p.ingresos_generados)
        }))
      };
    } catch (error) {
      throw new AppError('Error al obtener estadísticas de productos', 500);
    }
  }

  // NUEVO: para admin
  async obtenerVentasPorProductor() {
    try {
      const data = await estadisticaRepository.obtenerVentasPorProductor();
      return data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        nombre_empresa: p.nombre_empresa,
        total_ventas: parseFloat(p.total_ventas),
        total_pedidos: parseInt(p.total_pedidos),
        total_productos: parseInt(p.total_productos),
        total_clientes: parseInt(p.total_clientes),
      }));
    } catch (error) {
      throw new AppError('Error al obtener ventas por productor', 500);
    }
  }

  async obtenerResumenGlobal() {
    try {
      const data = await estadisticaRepository.obtenerResumenGlobal();
      return {
        totalProductos:    parseInt(data.total_productos),
        totalPedidos:      parseInt(data.total_pedidos),
        pedidosPendientes: parseInt(data.pedidos_pendientes),
        pedidosEntregados: parseInt(data.pedidos_entregados),
        ingresoTotal:      parseFloat(data.ingreso_total),
      };
    } catch (error) {
      throw new AppError('Error al obtener resumen global', 500);
    }
  }


  formatearVentasMensuales(ventasMensuales) {
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
      .map(mes => ({ mes, valor: 0 }));
    ventasMensuales.forEach(venta => {
      const idx = parseInt(venta.mes_numero) - 1;
      if (idx >= 0 && idx < 12) meses[idx].valor = parseFloat(venta.valor);
    });
    return meses;
  }
}

module.exports = new EstadisticaService();
