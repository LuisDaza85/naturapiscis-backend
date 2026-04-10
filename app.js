// Servidor principal para NaturaPiscis (PostgreSQL)
// ============================================================================
// ARQUITECTURA HÍBRIDA:
// - Módulos implementados: auth, productos (Clean Architecture)
// - Rutas legacy: pedidos, carrito, productores, etc. (temporal)
// ============================================================================

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

// ============================================================================
// IMPORTAR RUTAS
// ============================================================================

// Módulos implementados (Clean Architecture)
const authRoutes = require("./src/modules/auth/auth.routes");
const productosRoutes = require("./src/modules/productos/producto.routes");

// Rutas legacy (temporal - migrar a módulos)
const legacyRoutes = require("./legacy-routes");

// Base de datos
const db = require("./db-connection");

require("dotenv").config();

// Crear la aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE GLOBAL
// ============================================================================

// Servir archivos subidos
app.use('/uploads', express.static('uploads'));

// Middleware CORS
app.use(cors({
  origin: "http://localhost:5173", // Frontend
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware para parsear JSON y URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging HTTP
app.use(morgan("dev"));

// Middleware para depuración de peticiones
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log("Body:", req.body);
  next();
});

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, "public")));

// ============================================================================
// RUTAS DE LA API
// ============================================================================

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.json({ 
    message: "API de NaturaPiscis funcionando correctamente",
    version: "1.0.0",
    arquitectura: "Clean Architecture + Legacy Routes",
    modulosImplementados: ["auth", "productos"],
    modulosPendientes: ["pedidos", "carrito", "productores", "estadisticas", "reservas"]
  });
});

// ============================================================================
// MÓDULOS IMPLEMENTADOS (Clean Architecture)
// ============================================================================

// Autenticación (módulo completo)
app.use("/api/auth", authRoutes);

// Productos (módulo completo)
app.use("/api/productos", productosRoutes);

// ============================================================================
// RUTAS LEGACY (Temporal - hasta implementar módulos)
// ============================================================================

// IMPORTANTE: Este archivo contiene rutas que aún NO están en módulos
// TODO: Migrar gradualmente a módulos individuales
app.use("/api", legacyRoutes);

// ============================================================================
// MIDDLEWARE DE ERRORES
// ============================================================================

// Middleware para manejar errores generales
app.use((err, req, res, next) => {
  console.error("Error en la aplicación:", err.stack);
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

async function startServer() {
  try {
    const connected = await db.testConnection();
    if (connected) {
      app.listen(PORT, () => {
        console.log("====================================================");
        console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
        console.log(`📦 Entorno: ${process.env.NODE_ENV || "development"}`);
        console.log(`🏗️  Arquitectura: Clean Architecture + Legacy Routes`);
        console.log("====================================================");
        console.log("✅ Módulos implementados:");
        console.log("   - /api/auth/*        (Clean Architecture)");
        console.log("   - /api/productos/*   (Clean Architecture)");
        console.log("⚠️  Rutas legacy (temporal):");
        console.log("   - /api/pedidos/*");
        console.log("   - /api/carrito/*");
        console.log("   - /api/productores/*");
        console.log("   - /api/estadisticas/*");
        console.log("   - /api/reservas/*");
        console.log("====================================================");
      });
    } else {
      console.error("No se pudo iniciar el servidor debido a problemas con la base de datos");
    }
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
}

startServer();