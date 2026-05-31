const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Importar la conexión a la base de datos para verificar que funcione
const db = require('./config/db');

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para logs de peticiones
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Ruta de prueba simple
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 8000
    });
});

// Ruta principal
app.get('/', (req, res) => {
    console.log('Accediendo a la ruta principal');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ← AGREGAR LAS RUTAS DE INICIO (LOGIN)
try {
    const inicioRoutes = require('./routes/inicio');
    app.use('/api', inicioRoutes);
    console.log('✅ Rutas de login cargadas');
} catch (error) {
    console.log('⚠️ Error cargando rutas de login:', error.message);
}

// ← AGREGAR LAS RUTAS DE PRINCIPAL (SENSORES)
try {
    const principalRoutes = require('./routes/principal');
    app.use('/api', principalRoutes);
    console.log('✅ Rutas de sensores cargadas');
} catch (error) {
    console.log('⚠️ Error cargando rutas de sensores:', error.message);
}

// Cargar rutas de estudiantes
try {
    const estudianteRoutes = require('./routes/estudiante');
    app.use('/api/estudiantes', estudianteRoutes);
    console.log('✅ Rutas de estudiantes cargadas');
} catch (error) {
    console.log('⚠️ Error cargando rutas de estudiantes:', error.message);
}

// En tu archivo principal del servidor
app.use('/api', require('./routes/principal')); // O la ruta donde esté tu archivo principal.js
// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📱 Página principal: http://localhost:${PORT}/`);
    console.log(`🧪 Prueba servidor: http://localhost:${PORT}/test`);
    console.log(`🔐 API Login: http://localhost:${PORT}/api/login`);
    console.log(`📊 API Sensores: http://localhost:${PORT}/api/datos-sensores`);
    console.log(`👥 API Estudiantes: http://localhost:${PORT}/api/estudiantes`);
});