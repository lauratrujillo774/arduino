const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email y contraseña son requeridos' 
        });
    }

    // Primero buscar en la tabla docente
    const queryDocente = 'SELECT * FROM docente WHERE correo_electronico = ? AND contrasena = ?';
    
    db.query(queryDocente, [email, password], (err, docenteResults) => {
        if (err) {
            console.error('Error al consultar docente:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }

        if (docenteResults.length > 0) {
            // Es un docente
            const docente = docenteResults[0];
            return res.json({
                success: true,
                userType: 'docente',
                user: {
                    id: docente.id_docente,
                    nombre: docente.nombre,
                    email: docente.correo_electronico
                },
                redirect: '/frontend/docente/principal.html'
            });
        }

        // Si no es docente, buscar en la tabla estudiante
        const queryEstudiante = 'SELECT * FROM estudiante WHERE correo = ? AND contrasena = ?';
        
        db.query(queryEstudiante, [email, password], (err, estudianteResults) => {
            if (err) {
                console.error('Error al consultar estudiante:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error interno del servidor' 
                });
            }

            if (estudianteResults.length > 0) {
                // Es un estudiante
                const estudiante = estudianteResults[0];
                return res.json({
                    success: true,
                    userType: 'estudiante',
                    user: {
                        id: estudiante.id_estudiante,
                        nombre: estudiante.nombre,
                        email: estudiante.correo,
                        grado: estudiante.grado
                    },
                    redirect: '/frontend/estudiante/dashboard.html'
                });
            }

            // No se encontró el usuario
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        });
    });
});

module.exports = router;