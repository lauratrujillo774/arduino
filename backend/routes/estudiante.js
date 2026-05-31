const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/fotos-estudiantes');
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para la imagen
        const uniqueName = `estudiante_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtro para solo permitir imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

// Función para generar contraseña automática
function generarContrasenaAutomatica(nombreCompleto, documento) {
    try {
        console.log('Generando contraseña para:', nombreCompleto, 'Documento:', documento);
        
        // Limpiar y dividir el nombre
        const partesNombre = nombreCompleto.trim().split(' ').filter(parte => parte.length > 0);
        console.log('Partes del nombre:', partesNombre);
        
        if (partesNombre.length === 0) {
            throw new Error('Nombre vacío');
        }
        
        if (partesNombre.length === 1) {
            // Solo un nombre
            const primerNombre = partesNombre[0].toLowerCase().replace(/[^a-z]/g, '');
            return `${documento}${primerNombre}`;
        }
        
        // Extraer primer nombre y primer apellido
        const primerNombre = partesNombre[0].toLowerCase().replace(/[^a-z]/g, '');
        
        // Buscar el primer apellido (usualmente está en la segunda mitad)
        let primerApellido = '';
        if (partesNombre.length >= 2) {
            // Si hay 2 partes: primer nombre + primer apellido
            // Si hay 3 partes: primer nombre + segundo nombre + primer apellido
            // Si hay 4+ partes: primeros nombres + primeros apellidos
            const mitad = Math.ceil(partesNombre.length / 2);
            primerApellido = partesNombre[mitad].toLowerCase().replace(/[^a-z]/g, '');
        }
        
        const contrasena = `${documento}${primerNombre}${primerApellido}`;
        console.log('Contraseña generada:', contrasena);
        return contrasena;
        
    } catch (error) {
        console.error('Error generando contraseña:', error);
        // Fallback básico
        const nombreLimpio = nombreCompleto.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        return `${documento}${nombreLimpio}123`;
    }
}

// GET - Obtener todos los estudiantes
router.get('/', (req, res) => {
    const query = `
        SELECT 
            id_estudiante,
            nombre,
            grado,
            correo,
            foto,
            contrasena
        FROM estudiante 
        ORDER BY nombre ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener estudiantes:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener los estudiantes',
                error: err.message
            });
        }
        
        // Formatear los datos
        const estudiantesFormateados = results.map(estudiante => {
            let fotoUrl = null;
            
            if (estudiante.foto) {
                if (estudiante.foto.startsWith('http')) {
                    fotoUrl = estudiante.foto;
                } else {
                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    fotoUrl = `${baseUrl}/uploads/fotos-estudiantes/${path.basename(estudiante.foto)}`;
                }
            }
            
            return {
                id: estudiante.id_estudiante,
                nombre: estudiante.nombre,
                documento: estudiante.id_estudiante.toString(),
                grado: estudiante.grado,
                email: estudiante.correo,
                foto: fotoUrl,
                contrasena: estudiante.contrasena
            };
        });
        
        res.json({
            success: true,
            estudiantes: estudiantesFormateados,
            total: results.length
        });
    });
});

// GET - Obtener un estudiante por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    console.log('=== OBTENIENDO ESTUDIANTE POR ID ===');
    console.log('ID solicitado:', id);
    
    const query = `
        SELECT 
            id_estudiante,
            nombre,
            grado,
            correo,
            foto,
            contrasena
        FROM estudiante 
        WHERE id_estudiante = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener estudiante:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el estudiante',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estudiante no encontrado'
            });
        }
        
        const estudiante = results[0];
        let fotoUrl = null;
        
        if (estudiante.foto) {
            if (estudiante.foto.startsWith('http')) {
                fotoUrl = estudiante.foto;
            } else {
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                fotoUrl = `${baseUrl}/uploads/fotos-estudiantes/${path.basename(estudiante.foto)}`;
            }
        }
        
        const estudianteFormateado = {
            id: estudiante.id_estudiante,
            nombre: estudiante.nombre,
            documento: estudiante.id_estudiante.toString(),
            grado: estudiante.grado,
            email: estudiante.correo,
            foto: fotoUrl,
            contrasena: estudiante.contrasena
        };
        
        console.log('Estudiante encontrado:', estudianteFormateado);
        
        res.json({
            success: true,
            estudiante: estudianteFormateado
        });
    });
});

// POST - Crear nuevo estudiante con foto
router.post('/', upload.single('foto'), (req, res) => {
    console.log('=== CREANDO NUEVO ESTUDIANTE ===');
    console.log('Datos recibidos:', req.body);
    console.log('Archivo recibido:', req.file ? req.file.filename : 'Sin archivo');
    
    const { nombre, documento, grado, email, contrasena } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !documento || !grado || !email) {
        console.log('Error: Campos requeridos faltantes');
        
        // Eliminar archivo si hay error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error al eliminar archivo:', err);
            });
        }
        
        return res.status(400).json({
            success: false,
            message: 'Los campos nombre, documento, grado y email son requeridos'
        });
    }
    
    // Verificar si el documento ya existe
    const checkQuery = 'SELECT id_estudiante FROM estudiante WHERE id_estudiante = ?';
    console.log('Verificando documento:', documento);
    
    db.query(checkQuery, [documento], (err, results) => {
        if (err) {
            console.error('Error al verificar documento:', err);
            
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error al verificar el documento en la base de datos',
                error: err.message
            });
        }
        
        if (results.length > 0) {
            console.log('Error: Documento ya existe');
            
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'Ya existe un estudiante con este número de documento'
            });
        }
        
        // Verificar si el email ya existe
        const checkEmailQuery = 'SELECT id_estudiante FROM estudiante WHERE correo = ?';
        console.log('Verificando email:', email);
        
        db.query(checkEmailQuery, [email], (err, results) => {
            if (err) {
                console.error('Error al verificar email:', err);
                
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Error al verificar el email en la base de datos',
                    error: err.message
                });
            }
            
            if (results.length > 0) {
                console.log('Error: Email ya existe');
                
                if (req.file) {
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                    });
                }
                
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe un estudiante con este email'
                });
            }
            
            // Procesar foto
            let fotoUrl = null;
            if (req.file) {
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                fotoUrl = `${baseUrl}/uploads/fotos-estudiantes/${req.file.filename}`;
                console.log('URL de foto generada:', fotoUrl);
            }
            
            // Generar contraseña
            const passwordDefault = contrasena || generarContrasenaAutomatica(nombre, documento);
            console.log('Contraseña final:', passwordDefault);
            
            // Insertar estudiante
            const insertQuery = `
                INSERT INTO estudiante (
                    id_estudiante,
                    nombre, 
                    grado, 
                    correo, 
                    foto,
                    contrasena
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                parseInt(documento),
                nombre,
                grado,
                email,
                fotoUrl,
                passwordDefault
            ];
            
            console.log('Insertando en BD:', values);
            
            db.query(insertQuery, values, (err, result) => {
                if (err) {
                    console.error('Error al insertar estudiante:', err);
                    
                    if (req.file) {
                        fs.unlink(req.file.path, (unlinkErr) => {
                            if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                        });
                    }
                    
                    return res.status(500).json({
                        success: false,
                        message: 'Error al crear el estudiante en la base de datos',
                        error: err.message
                    });
                }
                
                console.log('✅ Estudiante creado exitosamente con ID:', documento);
                
                // Respuesta exitosa
                const estudianteCreado = {
                    id: parseInt(documento),
                    nombre: nombre,
                    documento: documento,
                    grado: grado,
                    email: email,
                    foto: fotoUrl,
                    contrasena: passwordDefault
                };
                
                res.status(201).json({
                    success: true,
                    message: `Estudiante creado exitosamente`,
                    estudiante: estudianteCreado
                });
            });
        });
    });
});

// PUT - Actualizar estudiante
router.put('/:id', upload.single('foto'), (req, res) => {
    const { id } = req.params;
    const { nombre, documento, grado, email, contrasena } = req.body;
    
    console.log('=== ACTUALIZANDO ESTUDIANTE ===');
    console.log('ID a actualizar:', id);
    console.log('Datos recibidos:', req.body);
    console.log('Nueva foto:', req.file ? req.file.filename : 'Sin cambio de foto');
    
    // Validar campos requeridos
    if (!nombre || !documento || !grado || !email) {
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error al eliminar archivo:', err);
            });
        }
        
        return res.status(400).json({
            success: false,
            message: 'Los campos nombre, documento, grado y email son requeridos'
        });
    }
    
    // Obtener datos actuales del estudiante
    const getCurrentQuery = 'SELECT * FROM estudiante WHERE id_estudiante = ?';
    db.query(getCurrentQuery, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener estudiante actual:', err);
            
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el estudiante',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            if (req.file) {
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                });
            }
            
            return res.status(404).json({
                success: false,
                message: 'Estudiante no encontrado'
            });
        }
        
        const estudianteActual = results[0];
        
        // Si cambió el documento, verificar que el nuevo no exista
        if (documento != id) {
            const checkNewDocQuery = 'SELECT id_estudiante FROM estudiante WHERE id_estudiante = ?';
            db.query(checkNewDocQuery, [documento], (err, results) => {
                if (err) {
                    console.error('Error al verificar nuevo documento:', err);
                    
                    if (req.file) {
                        fs.unlink(req.file.path, (unlinkErr) => {
                            if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                        });
                    }
                    
                    return res.status(500).json({
                        success: false,
                        message: 'Error al verificar el nuevo documento',
                        error: err.message
                    });
                }
                
                if (results.length > 0) {
                    if (req.file) {
                        fs.unlink(req.file.path, (unlinkErr) => {
                            if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                        });
                    }
                    
                    return res.status(400).json({
                        success: false,
                        message: 'Ya existe un estudiante con el nuevo número de documento'
                    });
                }
                
                // Continuar con la actualización
                actualizarEstudiante();
            });
        } else {
            // Si no cambió el documento, continuar directamente
            actualizarEstudiante();
        }
        
        function actualizarEstudiante() {
            // Manejar la foto
            let fotoUrl = estudianteActual.foto; // Mantener la foto actual por defecto
            
            if (req.file) {
                // Se subió una nueva foto
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                fotoUrl = `${baseUrl}/uploads/fotos-estudiantes/${req.file.filename}`;
                
                // Eliminar la foto anterior si existe y no es una URL externa
                if (estudianteActual.foto && estudianteActual.foto.includes('/uploads/fotos-estudiantes/')) {
                    const filename = estudianteActual.foto.split('/uploads/fotos-estudiantes/')[1];
                    const fotoAnterior = path.join(__dirname, '../uploads/fotos-estudiantes', filename);
                    fs.unlink(fotoAnterior, (unlinkErr) => {
                        if (unlinkErr) console.error('Error al eliminar foto anterior:', unlinkErr);
                        else console.log('Foto anterior eliminada:', filename);
                    });
                }
            }
            
            // Generar nueva contraseña si cambió el nombre o documento, o si se proporcionó una
            let nuevaContrasena = estudianteActual.contrasena; // Mantener actual por defecto
            
            if (contrasena) {
                // Se proporcionó una contraseña específica
                nuevaContrasena = contrasena;
            } else if (nombre !== estudianteActual.nombre || documento !== estudianteActual.id_estudiante.toString()) {
                // Cambió el nombre o documento, regenerar contraseña
                nuevaContrasena = generarContrasenaAutomatica(nombre, documento);
                console.log('Nueva contraseña generada por cambio de datos:', nuevaContrasena);
            }
            
            // Si cambió el documento, necesitamos recrear el registro
            if (documento != id) {
                console.log('Cambiando documento de', id, 'a', documento);
                
                // Insertar con nuevo ID
                const insertQuery = `
                    INSERT INTO estudiante (
                        id_estudiante,
                        nombre, 
                        grado, 
                        correo, 
                        foto,
                        contrasena
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                const values = [
                    parseInt(documento),
                    nombre,
                    grado,
                    email,
                    fotoUrl,
                    nuevaContrasena
                ];
                
                db.query(insertQuery, values, (err, result) => {
                    if (err) {
                        console.error('Error al crear estudiante con nuevo documento:', err);
                        
                        if (req.file) {
                            fs.unlink(req.file.path, (unlinkErr) => {
                                if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                            });
                        }
                        
                        return res.status(500).json({
                            success: false,
                            message: 'Error al actualizar el estudiante',
                            error: err.message
                        });
                    }
                    
                    // Eliminar el registro anterior
                    const deleteQuery = 'DELETE FROM estudiante WHERE id_estudiante = ?';
                    db.query(deleteQuery, [id], (err, result) => {
                        if (err) {
                            console.error('Error al eliminar estudiante anterior:', err);
                        }
                        
                        console.log('✅ Estudiante actualizado exitosamente (documento cambiado)');
                        
                        res.json({
                            success: true,
                            message: 'Estudiante actualizado exitosamente',
                            estudiante: {
                                id: parseInt(documento),
                                nombre: nombre,
                                documento: documento,
                                grado: grado,
                                email: email,
                                foto: fotoUrl,
                                contrasena: nuevaContrasena
                            }
                        });
                    });
                });
            } else {
                // Solo actualizar campos sin cambiar ID
                const updateQuery = `
                    UPDATE estudiante 
                    SET nombre = ?, 
                        grado = ?, 
                        correo = ?, 
                        foto = ?,
                        contrasena = ?
                    WHERE id_estudiante = ?
                `;
                
                const values = [
                    nombre,
                    grado,
                    email,
                    fotoUrl,
                    nuevaContrasena,
                    id
                ];
                
                console.log('Actualizando estudiante con valores:', values);
                
                db.query(updateQuery, values, (err, result) => {
                    if (err) {
                        console.error('Error al actualizar estudiante:', err);
                        
                        if (req.file) {
                            fs.unlink(req.file.path, (unlinkErr) => {
                                if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr);
                            });
                        }
                        
                        return res.status(500).json({
                            success: false,
                            message: 'Error al actualizar el estudiante',
                            error: err.message
                        });
                    }
                    
                    console.log('✅ Estudiante actualizado exitosamente');
                    
                    res.json({
                        success: true,
                        message: 'Estudiante actualizado exitosamente',
                        estudiante: {
                            id: parseInt(id),
                            nombre: nombre,
                            documento: documento,
                            grado: grado,
                            email: email,
                            foto: fotoUrl,
                            contrasena: nuevaContrasena
                        }
                    });
                });
            }
        }
    });
});

// DELETE - Eliminar estudiante
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    
    console.log('=== ELIMINANDO ESTUDIANTE ===');
    console.log('ID a eliminar:', id);
    
    // Obtener datos del estudiante antes de eliminarlo
    const getQuery = 'SELECT * FROM estudiante WHERE id_estudiante = ?';
    db.query(getQuery, [id], (err, results) => {
        if (err) {
            console.error('Error al obtener estudiante a eliminar:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al obtener el estudiante',
                error: err.message
            });
        }
        
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estudiante no encontrado'
            });
        }
        
        const estudiante = results[0];
        console.log('Estudiante a eliminar:', estudiante.nombre);
        
        // Eliminar estudiante de la base de datos
        const deleteQuery = 'DELETE FROM estudiante WHERE id_estudiante = ?';
        db.query(deleteQuery, [id], (err, result) => {
            if (err) {
                console.error('Error al eliminar estudiante de BD:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error al eliminar el estudiante',
                    error: err.message
                });
            }
            
            console.log('✅ Estudiante eliminado de la base de datos');
            
            // Eliminar foto del servidor si existe y no es URL externa
            if (estudiante.foto && estudiante.foto.includes('/uploads/fotos-estudiantes/')) {
                const filename = estudiante.foto.split('/uploads/fotos-estudiantes/')[1];
                const fotoPath = path.join(__dirname, '../uploads/fotos-estudiantes', filename);
                fs.unlink(fotoPath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error al eliminar foto del servidor:', unlinkErr);
                    } else {
                        console.log('✅ Foto eliminada del servidor:', filename);
                    }
                });
            }
            
            res.json({
                success: true,
                message: `Estudiante "${estudiante.nombre}" eliminado exitosamente`,
                estudiante: {
                    id: estudiante.id_estudiante,
                    nombre: estudiante.nombre
                }
            });
        });
    });
});

// GET - Obtener estadísticas
router.get('/stats/resumen', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as total FROM estudiante',
        grado10: 'SELECT COUNT(*) as total FROM estudiante WHERE grado = "10"',
        grado11: 'SELECT COUNT(*) as total FROM estudiante WHERE grado = "11"'
    };
    
    const stats = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;
    
    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, results) => {
            if (err) {
                console.error(`Error en consulta ${key}:`, err);
                stats[key] = 0;
            } else {
                stats[key] = results[0].total;
            }
            
            completed++;
            if (completed === totalQueries) {
                res.json({
                    success: true,
                    estadisticas: stats
                });
            }
        });
    });
});

module.exports = router;