// ============================================
// src/server.js - ENTRY POINT DEL SERVIDOR
// ============================================

const app = require('./app');
const config = require('./config/environment');
const logger = require('./utils/logger');
const db = require('./config/database');

process.on('uncaughtException', (error) => {
  logger.error('💥 UNCAUGHT EXCEPTION - El servidor se cerrará', {
    error: error.message,
    stack: error.stack
  });
  setTimeout(() => { process.exit(1); }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 UNHANDLED REJECTION - El servidor se cerrará', {
    reason,
    promise
  });
  setTimeout(() => { process.exit(1); }, 1000);
});

async function startServer() {
  try {
    logger.info('🔌 Verificando conexión a PostgreSQL...');
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    
    logger.info('✅ Conexión a PostgreSQL establecida correctamente');

    // ✅ '0.0.0.0' para aceptar conexiones desde el emulador y dispositivos en la red
    const server = app.listen(config.app.port, '0.0.0.0', () => {
      logger.info(`
╔════════════════════════════════════════════════╗
║   🐟 NATURAPISCIS API - SERVIDOR INICIADO 🐟   ║
╠════════════════════════════════════════════════╣
║  Entorno: ${config.app.env.padEnd(37)} ║
║  Puerto: ${config.app.port.toString().padEnd(38)} ║
║  URL: http://0.0.0.0:${config.app.port.toString().padEnd(27)} ║
║  API Prefix: ${config.app.apiPrefix.padEnd(31)} ║
╠════════════════════════════════════════════════╣
║  📚 Documentación: /api                        ║
║  ❤️  Health Check: /health                     ║
╚════════════════════════════════════════════════╝
      `);
      
      logger.info('🚀 Servidor listo para recibir peticiones');
    });

    server.timeout = 30000;
    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('❌ Error crítico al iniciar el servidor:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

function setupGracefulShutdown(server) {
  const gracefulShutdown = (signal) => {
    logger.info(`\n📡 ${signal} recibido. Iniciando cierre ordenado del servidor...`);
    
    server.close(async () => {
      logger.info('✅ Servidor HTTP cerrado - No se aceptan más peticiones');
      
      try {
        await db.end();
        logger.info('✅ Conexión a PostgreSQL cerrada correctamente');
        logger.info('👋 Servidor cerrado exitosamente. ¡Hasta pronto!');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error al cerrar conexión a la base de datos:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('⚠️  No se pudo cerrar el servidor ordenadamente. Forzando cierre...');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => {
    logger.info('🔄 Nodemon reiniciando...');
    gracefulShutdown('SIGUSR2');
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };