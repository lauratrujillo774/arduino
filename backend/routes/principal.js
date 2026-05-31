const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Función para evaluar rangos de sensores con valores específicos
const evaluarRango = (valor, tipo) => {
    const val = parseFloat(valor) || 0;
    
    switch(tipo) {
        case 'ph_agua':
            if (val < 5.5) return { 
                estado: 'Ácido', 
                clase: 'bg-red-100 text-red-800',
                descripcion: 'pH muy bajo, necesita corrección alcalina',
                color: 'red'
            };
            if (val >= 5.5 && val <= 7.5) return { 
                estado: 'Neutro', 
                clase: 'bg-green-100 text-green-800',
                descripcion: 'pH óptimo para cultivos hidropónicos',
                color: 'green'
            };
            if (val > 7.5) return { 
                estado: 'Alcalino', 
                clase: 'bg-orange-100 text-orange-800',
                descripcion: 'pH alto, necesita corrección ácida',
                color: 'orange'
            };
            break;

        case 'ph_suelo':
            if (val < 5.5) return { 
                estado: 'Ácido', 
                clase: 'bg-red-100 text-red-800',
                descripcion: 'Suelo muy ácido, dificulta absorción de nutrientes',
                color: 'red'
            };
            if (val >= 5.5 && val <= 7.5) return { 
                estado: 'Neutro', 
                clase: 'bg-green-100 text-green-800',
                descripcion: 'pH del suelo ideal para la mayoría de plantas',
                color: 'green'
            };
            if (val > 7.5) return { 
                estado: 'Alcalino', 
                clase: 'bg-orange-100 text-orange-800',
                descripcion: 'Suelo alcalino, puede requerir enmiendas',
                color: 'orange'
            };
            break;

        case 'tds':
            if (val < 300) return { 
                estado: 'Bajo', 
                clase: 'bg-blue-100 text-blue-800',
                descripcion: 'Concentración de nutrientes insuficiente',
                color: 'blue'
            };
            if (val >= 300 && val <= 800) return { 
                estado: 'Óptimo', 
                clase: 'bg-green-100 text-green-800',
                descripcion: 'Nivel ideal de nutrientes disueltos',
                color: 'green'
            };
            if (val > 800 && val <= 1200) return { 
                estado: 'Alto', 
                clase: 'bg-yellow-100 text-yellow-800',
                descripcion: 'Concentración elevada, monitorear plantas',
                color: 'yellow'
            };
            if (val > 1200) return { 
                estado: 'Crítico', 
                clase: 'bg-red-100 text-red-800',
                descripcion: 'Nivel peligroso, puede dañar las raíces',
                color: 'red'
            };
            break;

        case 'temperatura':
            if (val < 15) return { 
                estado: 'Muy Baja', 
                clase: 'bg-blue-100 text-blue-800',
                descripcion: 'Temperatura demasiado fría para crecimiento',
                color: 'blue'
            };
            if (val >= 15 && val < 20) return { 
                estado: 'Baja', 
                clase: 'bg-cyan-100 text-cyan-800',
                descripcion: 'Temperatura subóptima, crecimiento lento',
                color: 'cyan'
            };
            if (val >= 20 && val <= 28) return { 
                estado: 'Óptima', 
                clase: 'bg-green-100 text-green-800',
                descripcion: 'Temperatura ideal para cultivos hidropónicos',
                color: 'green'
            };
            if (val > 28 && val <= 32) return { 
                estado: 'Alta', 
                clase: 'bg-orange-100 text-orange-800',
                descripcion: 'Temperatura elevada, puede causar estrés',
                color: 'orange'
            };
            if (val > 32) return { 
                estado: 'Crítica', 
                clase: 'bg-red-100 text-red-800',
                descripcion: 'Temperatura peligrosa, riesgo de daño celular',
                color: 'red'
            };
            break;
    }
    
    return { 
        estado: 'Sin datos', 
        clase: 'bg-gray-100 text-gray-800',
        descripcion: 'No hay datos disponibles',
        color: 'gray'
    };
};

// Función para formatear fecha legible
const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    
    const date = new Date(fecha);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Hace menos de 1 minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} hora${Math.floor(diffMinutes / 60) > 1 ? 's' : ''}`;
    
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Ruta principal para obtener los últimos datos de sensores
router.get('/datos-sensores', (req, res) => {
    console.log('📊 Solicitando últimos datos de sensores...');
    
    // CAMBIAR ESTAS LÍNEAS (aproximadamente líneas 108-125):
const queries = {
    phAgua: `
        SELECT medida as valor, fecha, id_agua 
        FROM nivel_ph_agua 
        ORDER BY fecha DESC, id_agua DESC 
        LIMIT 1
    `,
    phSuelo: `
        SELECT medida as valor, fecha, id_suelo 
        FROM nivel_ph_suelo 
        ORDER BY fecha DESC, id_suelo DESC 
        LIMIT 1
    `,
    tds: `
        SELECT medida as valor, fecha, id_tds 
        FROM tds 
        ORDER BY fecha DESC, id_tds DESC 
        LIMIT 1
    `,
    temperatura: `
        SELECT medida as valor, fecha, id_temperatura 
        FROM temperatura 
        ORDER BY fecha DESC, id_temperatura DESC 
        LIMIT 1
    `
};

    let resultados = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    // Función para procesar cada consulta
    const procesarConsulta = (key, query) => {
        db.query(query, (err, results) => {
            if (err) {
                console.error(`❌ Error en consulta ${key}:`, err);
                const tipoSensor = key === 'phAgua' ? 'ph_agua' : 
                                 key === 'phSuelo' ? 'ph_suelo' : 
                                 key === 'tds' ? 'tds' : 'temperatura';
                
                resultados[key] = { 
                    valor: 0, 
                    fecha: null,
                    fechaFormateada: 'Error de conexión',
                    evaluacion: evaluarRango(0, tipoSensor),
                    unidad: tipoSensor === 'tds' ? 'ppm' : tipoSensor === 'temperatura' ? '°C' : ''
                };
            } else {
                console.log(`✅ Consulta ${key} exitosa, resultados encontrados:`, results.length);
                
                if (results.length > 0) {
                    const data = results[0];
                    const valor = parseFloat(data.valor) || 0;
                    const tipoSensor = key === 'phAgua' ? 'ph_agua' : 
                                     key === 'phSuelo' ? 'ph_suelo' : 
                                     key === 'tds' ? 'tds' : 'temperatura';
                    
                    const evaluacion = evaluarRango(valor, tipoSensor);
                    const fechaFormateada = formatearFecha(data.fecha);
                    
                    resultados[key] = {
                        valor: valor,
                        fecha: data.fecha,
                        fechaFormateada: fechaFormateada,
                        evaluacion: evaluacion,
                        unidad: tipoSensor === 'tds' ? 'ppm' : tipoSensor === 'temperatura' ? '°C' : '',
                        id: data[`id_${tipoSensor.replace('ph_', '').replace('temperatura', 'temperatura')}`] || data[Object.keys(data).find(k => k.includes('id'))]
                    };
                    
                    console.log(`📈 ${key}: ${valor} ${resultados[key].unidad} - ${evaluacion.estado} (${fechaFormateada})`);
                } else {
                    console.log(`⚠️ No hay datos disponibles para ${key}`);
                    const tipoSensor = key === 'phAgua' ? 'ph_agua' : 
                                     key === 'phSuelo' ? 'ph_suelo' : 
                                     key === 'tds' ? 'tds' : 'temperatura';
                    
                    resultados[key] = { 
                        valor: 0, 
                        fecha: null,
                        fechaFormateada: 'Sin datos disponibles',
                        evaluacion: evaluarRango(0, tipoSensor),
                        unidad: tipoSensor === 'tds' ? 'ppm' : tipoSensor === 'temperatura' ? '°C' : ''
                    };
                }
            }
            
            completedQueries++;
            
            // Cuando todas las consultas estén completas
            if (completedQueries === totalQueries) {
                console.log('📊 Enviando respuesta completa con evaluaciones:', {
                    phAgua: `${resultados.phAgua.valor} - ${resultados.phAgua.evaluacion.estado}`,
                    phSuelo: `${resultados.phSuelo.valor} - ${resultados.phSuelo.evaluacion.estado}`,
                    tds: `${resultados.tds.valor} ${resultados.tds.unidad} - ${resultados.tds.evaluacion.estado}`,
                    temperatura: `${resultados.temperatura.valor} ${resultados.temperatura.unidad} - ${resultados.temperatura.evaluacion.estado}`
                });
                
                res.json({
                    success: true,
                    datos: resultados,
                    timestamp: new Date().toISOString(),
                    mensaje: 'Datos de sensores obtenidos correctamente'
                });
            }
        });
    };

    // Ejecutar todas las consultas en paralelo
    Object.keys(queries).forEach(key => {
        procesarConsulta(key, queries[key]);
    });
});

// Ruta para obtener historial de un sensor específico
router.get('/historial/:sensor', (req, res) => {
    const { sensor } = req.params;
    const limite = parseInt(req.query.limite) || 10;
    
    // CAMBIAR EN LA FUNCIÓN DEL HISTORIAL (líneas aprox 200-210):
const tablas = {
    'ph-agua': { tabla: 'nivel_ph_agua', campo: 'medida', id: 'id_agua' },
    'ph-suelo': { tabla: 'nivel_ph_suelo', campo: 'medida', id: 'id_suelo' },
    'tds': { tabla: 'tds', campo: 'medida', id: 'id_tds' },
    'temperatura': { tabla: 'temperatura', campo: 'medida', id: 'id_temperatura' }
};
    
    const config = tablas[sensor];
    if (!config) {
        return res.status(400).json({
            success: false,
            mensaje: 'Sensor no válido. Use: ph-agua, ph-suelo, tds, temperatura'
        });
    }
    
    const query = `
        SELECT ${config.campo} as valor, fecha, ${config.id} as id
        FROM ${config.tabla}
        ORDER BY fecha DESC, ${config.id} DESC
        LIMIT ?
    `;
    
    db.query(query, [limite], (err, results) => {
        if (err) {
            console.error(`Error al obtener historial de ${sensor}:`, err);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener historial del sensor',
                error: err.message
            });
        }
        
        const tipoSensor = sensor.replace('-', '_');
        const historial = results.map(row => ({
            valor: parseFloat(row.valor),
            fecha: row.fecha,
            fechaFormateada: formatearFecha(row.fecha),
            evaluacion: evaluarRango(row.valor, tipoSensor),
            id: row.id
        }));
        
        res.json({
            success: true,
            sensor: sensor,
            historial: historial,
            total: results.length
        });
    });
});

// Ruta de prueba para verificar conexión a base de datos
router.get('/test-sensores', (req, res) => {
    console.log('🧪 Probando conexión a tablas de sensores...');
    
    const testQueries = {
        nivel_ph_agua: 'SELECT COUNT(*) as total, MAX(fecha) as ultima_actualizacion FROM nivel_ph_agua',
        nivel_ph_suelo: 'SELECT COUNT(*) as total, MAX(fecha) as ultima_actualizacion FROM nivel_ph_suelo', 
        tds: 'SELECT COUNT(*) as total, MAX(fecha) as ultima_actualizacion FROM tds',
        temperatura: 'SELECT COUNT(*) as total, MAX(fecha) as ultima_actualizacion FROM temperatura'
    };
    
    let testResults = {};
    let completed = 0;
    const total = Object.keys(testQueries).length;
    
    Object.keys(testQueries).forEach(tabla => {
        db.query(testQueries[tabla], (err, results) => {
            if (err) {
                console.error(`❌ Error probando tabla ${tabla}:`, err);
                testResults[tabla] = { 
                    error: err.message,
                    estado: 'Error de conexión'
                };
            } else {
                const data = results[0];
                console.log(`✅ Tabla ${tabla}: ${data.total} registros, última actualización: ${formatearFecha(data.ultima_actualizacion)}`);
                testResults[tabla] = { 
                    registros: data.total,
                    ultima_actualizacion: data.ultima_actualizacion,
                    fecha_formateada: formatearFecha(data.ultima_actualizacion),
                    estado: data.total > 0 ? 'Funcionando' : 'Sin datos'
                };
            }
            
            completed++;
            if (completed === total) {
                res.json({
                    success: true,
                    tablas: testResults,
                    mensaje: 'Prueba de conexión completada',
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

// Ruta para insertar datos de prueba
router.post('/insertar-datos-prueba', (req, res) => {
    console.log('🔧 Insertando datos de prueba...');
    
    // CAMBIAR EN LA FUNCIÓN DE DATOS DE PRUEBA (líneas aprox 280-290):
const datosPrueba = [
    { tabla: 'nivel_ph_agua', campo: 'medida', valor: (Math.random() * 3 + 5.5).toFixed(2) },
    { tabla: 'nivel_ph_suelo', campo: 'medida', valor: (Math.random() * 3 + 5.5).toFixed(2) },
    { tabla: 'tds', campo: 'medida', valor: Math.floor(Math.random() * 800 + 200) },
    { tabla: 'temperatura', campo: 'medida', valor: (Math.random() * 15 + 18).toFixed(1) }
];
    
    let insertados = 0;
    const resultados = [];
    
    datosPrueba.forEach(dato => {
        const query = `INSERT INTO ${dato.tabla} (${dato.campo}) VALUES (?)`;
        
        db.query(query, [dato.valor], (err, result) => {
            if (err) {
                console.error(`Error insertando en ${dato.tabla}:`, err);
                resultados.push({
                    tabla: dato.tabla,
                    error: err.message,
                    valor: dato.valor
                });
            } else {
                console.log(`✅ Insertado en ${dato.tabla}: ${dato.valor}`);
                resultados.push({
                    tabla: dato.tabla,
                    exito: true,
                    valor: dato.valor,
                    id: result.insertId
                });
            }
            
            insertados++;
            if (insertados === datosPrueba.length) {
                res.json({
                    success: true,
                    mensaje: 'Datos de prueba insertados',
                    resultados: resultados,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

// AGREGAR DESPUÉS DE LA RUTA '/historial/:sensor' (línea aprox 250):

// Ruta para obtener datos agrupados por mes
router.get('/datos-mensuales/:sensor', (req, res) => {
    const { sensor } = req.params;
    const { año } = req.query; // Opcional: filtrar por año específico
    
    console.log(`📅 Solicitando datos mensuales para sensor: ${sensor}`);
    
    const tablas = {
        'ph-agua': { tabla: 'nivel_ph_agua', campo: 'medida', id: 'id_agua' },
        'ph-suelo': { tabla: 'nivel_ph_suelo', campo: 'medida', id: 'id_suelo' },
        'tds': { tabla: 'tds', campo: 'medida', id: 'id_tds' },
        'temperatura': { tabla: 'temperatura', campo: 'medida', id: 'id_temperatura' }
    };
    
    const config = tablas[sensor];
    if (!config) {
        return res.status(400).json({
            success: false,
            mensaje: 'Sensor no válido. Use: ph-agua, ph-suelo, tds, temperatura'
        });
    }
    
    // Query para agrupar por mes
    let query = `
        SELECT 
            YEAR(fecha) as año,
            MONTH(fecha) as mes,
            MONTHNAME(fecha) as nombre_mes,
            COUNT(*) as total_registros,
            AVG(${config.campo}) as promedio,
            MIN(${config.campo}) as minimo,
            MAX(${config.campo}) as maximo,
            DATE_FORMAT(fecha, '%Y-%m') as periodo
        FROM ${config.tabla}
        WHERE fecha IS NOT NULL
    `;
    
    const params = [];
    
    // Filtrar por año si se especifica
    if (año) {
        query += ' AND YEAR(fecha) = ?';
        params.push(año);
    }
    
    query += `
        GROUP BY YEAR(fecha), MONTH(fecha)
        ORDER BY año DESC, mes DESC
        LIMIT 12
    `;
    
    console.log('🔍 Query mensual:', query);
    console.log('📋 Parámetros:', params);
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error(`❌ Error al obtener datos mensuales de ${sensor}:`, err);
            return res.status(500).json({
                success: false,
                mensaje: 'Error al obtener datos mensuales del sensor',
                error: err.message
            });
        }
        
        console.log(`✅ Datos mensuales obtenidos para ${sensor}:`, results.length, 'registros');
        
        // Formatear datos para el frontend
        const datosFormateados = results.map(row => {
            const tipoSensor = sensor.replace('-', '_');
            const evaluacionPromedio = evaluarRango(row.promedio, tipoSensor);
            
            return {
                año: row.año,
                mes: row.mes,
                nombre_mes: row.nombre_mes,
                periodo: row.periodo,
                total_registros: row.total_registros,
                promedio: parseFloat(row.promedio).toFixed(2),
                minimo: parseFloat(row.minimo).toFixed(2),
                maximo: parseFloat(row.maximo).toFixed(2),
                evaluacion: evaluacionPromedio
            };
        });
        
        res.json({
            success: true,
            sensor: sensor,
            año: año || 'Todos',
            datos: datosFormateados,
            total_meses: results.length,
            mensaje: `Datos mensuales de ${sensor} obtenidos correctamente`
        });
    });
});

// Ruta para obtener todos los datos mensuales de todos los sensores
router.get('/todos-datos-mensuales', (req, res) => {
    const { año } = req.query;
    
    console.log('📊 Solicitando datos mensuales de todos los sensores...');
    
    const sensores = ['ph-agua', 'ph-suelo', 'tds', 'temperatura'];
    let resultadosCompletos = {};
    let consultasCompletas = 0;
    
    const procesarSensor = (sensor) => {
        const tablas = {
            'ph-agua': { tabla: 'nivel_ph_agua', campo: 'medida' },
            'ph-suelo': { tabla: 'nivel_ph_suelo', campo: 'medida' },
            'tds': { tabla: 'tds', campo: 'medida' },
            'temperatura': { tabla: 'temperatura', campo: 'medida' }
        };
        
        const config = tablas[sensor];
        
        let query = `
            SELECT 
                YEAR(fecha) as año,
                MONTH(fecha) as mes,
                MONTHNAME(fecha) as nombre_mes,
                COUNT(*) as total_registros,
                AVG(${config.campo}) as promedio,
                MIN(${config.campo}) as minimo,
                MAX(${config.campo}) as maximo,
                DATE_FORMAT(fecha, '%Y-%m') as periodo
            FROM ${config.tabla}
            WHERE fecha IS NOT NULL
        `;
        
        const params = [];
        if (año) {
            query += ' AND YEAR(fecha) = ?';
            params.push(año);
        }
        
        query += `
            GROUP BY YEAR(fecha), MONTH(fecha)
            ORDER BY año DESC, mes DESC
            LIMIT 12
        `;
        
        db.query(query, params, (err, results) => {
            if (err) {
                console.error(`Error en sensor ${sensor}:`, err);
                resultadosCompletos[sensor] = [];
            } else {
                const tipoSensor = sensor.replace('-', '_');
                resultadosCompletos[sensor] = results.map(row => ({
                    año: row.año,
                    mes: row.mes,
                    nombre_mes: row.nombre_mes,
                    periodo: row.periodo,
                    total_registros: row.total_registros,
                    promedio: parseFloat(row.promedio).toFixed(2),
                    minimo: parseFloat(row.minimo).toFixed(2),
                    maximo: parseFloat(row.maximo).toFixed(2),
                    evaluacion: evaluarRango(row.promedio, tipoSensor)
                }));
            }
            
            consultasCompletas++;
            
            if (consultasCompletas === sensores.length) {
                console.log('✅ Todos los datos mensuales obtenidos');
                res.json({
                    success: true,
                    año: año || 'Todos',
                    datos: resultadosCompletos,
                    sensores: sensores,
                    mensaje: 'Datos mensuales de todos los sensores obtenidos correctamente'
                });
            }
        });
    };
    
    // Procesar todos los sensores
    sensores.forEach(procesarSensor);
});

module.exports = router;