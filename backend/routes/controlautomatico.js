const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Estado global del sistema automático
let sistemaAutomatico = {
    modoActivo: false,
    ultimaEvaluacion: null,
    intervaloEvaluacion: null,
    bombasActivas: {
        // pH Agua
        bomba_acido_ph_agua: 0,     // Pin 2
        bomba_base_ph_agua: 0,      // Pin 3
        
        // pH Suelo  
        riego_acido_suelo: 0,       // Pin 4
        riego_alcalino_suelo: 0,    // Pin 5
        
        // TDS
        bomba_nutrientes: 0,        // Pin 6
        bomba_agua_pura: 0,         // Pin 7
        
        // Temperatura
        sistema_enfriamiento: 0,    // Pin 8
        sistema_calentamiento: 0    // Pin 9
    }
};

// Configuración de rangos óptimos
const RANGOS_OPTIMOS = {
    ph_agua: { min: 5.5, max: 7.5 },
    ph_suelo: { min: 5.5, max: 7.5 },
    tds: { min: 300, max: 800 },
    temperatura: { min: 20, max: 28 }
};

// Mapeo de pines para Arduino/ESP32
const PINES_ARDUINO = {
    bomba_acido_ph_agua: 2,
    bomba_base_ph_agua: 3,
    riego_acido_suelo: 4,
    riego_alcalino_suelo: 5,
    bomba_nutrientes: 6,
    bomba_agua_pura: 7,
    sistema_enfriamiento: 8,
    sistema_calentamiento: 9
};

// Función principal de evaluación automática
function evaluarSensoresAutomatico() {
    if (!sistemaAutomatico.modoActivo) return;
    
    console.log('🤖 INICIANDO EVALUACIÓN AUTOMÁTICA...');
    sistemaAutomatico.ultimaEvaluacion = new Date();
    
    // Resetear todas las bombas antes de nueva evaluación
    resetearTodasLasBombas();
    
    // Consultas para obtener últimos valores
    const queries = {
        phAgua: 'SELECT * FROM nivel_ph_agua ORDER BY fecha DESC, id_agua DESC LIMIT 1',
        phSuelo: 'SELECT * FROM nivel_ph_suelo ORDER BY fecha DESC, id_suelo DESC LIMIT 1', 
        tds: 'SELECT * FROM tds ORDER BY fecha DESC, id_tds DESC LIMIT 1',
        temperatura: 'SELECT * FROM temperatura ORDER BY fecha DESC, id_temperatura DESC LIMIT 1'
    };
    
    let resultados = {};
    let consultasCompletadas = 0;
    const totalConsultas = Object.keys(queries).length;
    
    // Ejecutar todas las consultas
    Object.keys(queries).forEach(sensor => {
        db.query(queries[sensor], (err, results) => {
            if (err) {
                console.error(`❌ Error en consulta ${sensor}:`, err);
                resultados[sensor] = null;
            } else {
                resultados[sensor] = results[0] || null;
            }
            
            consultasCompletadas++;
            if (consultasCompletadas === totalConsultas) {
                procesarYActivarBombas(resultados);
            }
        });
    });
}

// Función para procesar resultados y activar bombas
function procesarYActivarBombas(datos) {
    console.log('📊 PROCESANDO DATOS DE SENSORES:', datos);
    
    let accionesTomadas = [];
    
    // ===== EVALUAR pH DEL AGUA =====
    if (datos.phAgua) {
        const valorPh = parseFloat(datos.phAgua.rango || datos.phAgua.medida || 0);
        console.log(`🌊 pH Agua: ${valorPh}`);
        
        if (valorPh < RANGOS_OPTIMOS.ph_agua.min) {
            // pH muy ácido - ACTIVAR BOMBA DE BASE
            activarBomba('bomba_base_ph_agua', 15);
            accionesTomadas.push(`pH Agua ÁCIDO (${valorPh}) → Bomba Base ACTIVADA`);
            
        } else if (valorPh > RANGOS_OPTIMOS.ph_agua.max) {
            // pH muy alcalino - ACTIVAR BOMBA DE ÁCIDO  
            activarBomba('bomba_acido_ph_agua', 15);
            accionesTomadas.push(`pH Agua ALCALINO (${valorPh}) → Bomba Ácido ACTIVADA`);
            
        } else {
            console.log(`✅ pH Agua NORMAL (${valorPh})`);
        }
    }
    
    // ===== EVALUAR pH DEL SUELO =====
    if (datos.phSuelo) {
        const valorPh = parseFloat(datos.phSuelo.rango || datos.phSuelo.medida || 0);
        console.log(`🌱 pH Suelo: ${valorPh}`);
        
        if (valorPh < RANGOS_OPTIMOS.ph_suelo.min) {
            // pH muy ácido - ACTIVAR RIEGO ALCALINO
            activarBomba('riego_alcalino_suelo', 20);
            accionesTomadas.push(`pH Suelo ÁCIDO (${valorPh}) → Riego Alcalino ACTIVADO`);
            
        } else if (valorPh > RANGOS_OPTIMOS.ph_suelo.max) {
            // pH muy alcalino - ACTIVAR RIEGO ÁCIDO
            activarBomba('riego_acido_suelo', 20);
            accionesTomadas.push(`pH Suelo ALCALINO (${valorPh}) → Riego Ácido ACTIVADO`);
            
        } else {
            console.log(`✅ pH Suelo NORMAL (${valorPh})`);
        }
    }
    
    // ===== EVALUAR TDS =====
    if (datos.tds) {
        const valorTds = parseFloat(datos.tds.rango || datos.tds.medida || 0);
        console.log(`⚡ TDS: ${valorTds} ppm`);
        
        if (valorTds < RANGOS_OPTIMOS.tds.min) {
            // TDS muy bajo - ACTIVAR BOMBA DE NUTRIENTES
            activarBomba('bomba_nutrientes', 10);
            accionesTomadas.push(`TDS BAJO (${valorTds}) → Bomba Nutrientes ACTIVADA`);
            
        } else if (valorTds > RANGOS_OPTIMOS.tds.max) {
            // TDS muy alto - ACTIVAR BOMBA DE AGUA PURA
            activarBomba('bomba_agua_pura', 12);
            accionesTomadas.push(`TDS ALTO (${valorTds}) → Bomba Agua Pura ACTIVADA`);
            
        } else {
            console.log(`✅ TDS NORMAL (${valorTds})`);
        }
    }
    
    // ===== EVALUAR TEMPERATURA =====
    if (datos.temperatura) {
        const valorTemp = parseFloat(datos.temperatura.rango || datos.temperatura.medida || 0);
        console.log(`🌡️ Temperatura: ${valorTemp}°C`);
        
        if (valorTemp < RANGOS_OPTIMOS.temperatura.min) {
            // Temperatura muy baja - ACTIVAR CALENTAMIENTO
            activarBomba('sistema_calentamiento', 25);
            accionesTomadas.push(`Temperatura BAJA (${valorTemp}°C) → Sistema Calentamiento ACTIVADO`);
            
        } else if (valorTemp > RANGOS_OPTIMOS.temperatura.max) {
            // Temperatura muy alta - ACTIVAR ENFRIAMIENTO
            activarBomba('sistema_enfriamiento', 18);
            accionesTomadas.push(`Temperatura ALTA (${valorTemp}°C) → Sistema Enfriamiento ACTIVADO`);
            
        } else {
            console.log(`✅ Temperatura NORMAL (${valorTemp}°C)`);
        }
    }
    
    // Registrar acciones en base de datos
    if (accionesTomadas.length > 0) {
        console.log('🎯 ACCIONES TOMADAS:', accionesTomadas);
        guardarRegistroAutomatico(accionesTomadas.join(' | '));
    } else {
        console.log('✅ TODOS LOS PARÁMETROS NORMALES - Sin acciones requeridas');
        guardarRegistroAutomatico('Evaluación completada - Todos los parámetros en rango normal');
    }
    
    // Mostrar estado actual de bombas
    console.log('🎛️ ESTADO ACTUAL DE BOMBAS:', sistemaAutomatico.bombasActivas);
}

// Función para activar bomba específica
function activarBomba(nombreBomba, duracionSegundos) {
    if (!sistemaAutomatico.bombasActivas.hasOwnProperty(nombreBomba)) {
        console.error(`❌ Bomba ${nombreBomba} no existe`);
        return;
    }
    
    // Activar bomba (estado = 1)
    sistemaAutomatico.bombasActivas[nombreBomba] = 1;
    const pin = PINES_ARDUINO[nombreBomba];
    
    console.log(`🔛 BOMBA ACTIVADA: ${nombreBomba} (Pin ${pin}) = 1 por ${duracionSegundos}s`);
    
    // Simular envío de comando a Arduino/ESP32
    enviarComandoArduino(pin, 1, duracionSegundos, nombreBomba);
    
    // Programar desactivación automática
    setTimeout(() => {
        sistemaAutomatico.bombasActivas[nombreBomba] = 0;
        console.log(`🔴 BOMBA DESACTIVADA: ${nombreBomba} (Pin ${pin}) = 0`);
        
        // Enviar comando de apagado
        enviarComandoArduino(pin, 0, 0, nombreBomba);
        
    }, duracionSegundos * 1000);
}

// Función para resetear todas las bombas
function resetearTodasLasBombas() {
    Object.keys(sistemaAutomatico.bombasActivas).forEach(bomba => {
        sistemaAutomatico.bombasActivas[bomba] = 0;
    });
}

// Función para simular envío a Arduino/ESP32
function enviarComandoArduino(pin, estado, duracion, nombreBomba) {
    const comando = {
        pin: pin,
        estado: estado,
        duracion: duracion,
        bomba: nombreBomba,
        timestamp: new Date().toISOString(),
        modo: 'automatico'
    };
    
    console.log(`📡 COMANDO A ARDUINO/ESP32:`, JSON.stringify(comando));
    
    // Aquí conectarías con Arduino/ESP32:
    // - Puerto Serial: `PIN:${pin},ESTADO:${estado},DURACION:${duracion}`
    // - HTTP: POST a IP del ESP32
    // - MQTT: Publicar en topic específico
    
    // Guardar comando en historial
    guardarComandoArduino(comando);
}

// Función para guardar comando en base de datos
function guardarComandoArduino(comando) {
    const descripcion = `AUTOMÁTICO - ${comando.bomba}: Pin ${comando.pin} = ${comando.estado} por ${comando.duracion}s`;
    
    const query = `INSERT INTO historial_dato (nombre, descripcion, fecha) VALUES (?, ?, CURDATE())`;
    
    db.query(query, ['Control Automático', descripcion], (err, result) => {
        if (err) {
            console.error('Error al guardar comando:', err);
        } else {
            console.log(`💾 Comando guardado en historial`);
        }
    });
}

// Función para guardar registro general
function guardarRegistroAutomatico(descripcion) {
    const query = `INSERT INTO historial_dato (nombre, descripcion, fecha) VALUES (?, ?, CURDATE())`;
    
    db.query(query, ['Evaluación Automática', descripcion], (err, result) => {
        if (err) {
            console.error('Error al guardar registro:', err);
        }
    });
}

// ===== RUTAS DE LA API =====

// Ruta para activar/desactivar modo automático
router.post('/modo-automatico-toggle', (req, res) => {
    const { activar } = req.body;
    
    try {
        if (activar) {
            // ACTIVAR MODO AUTOMÁTICO
            sistemaAutomatico.modoActivo = true;
            
            // Limpiar intervalo anterior si existe
            if (sistemaAutomatico.intervaloEvaluacion) {
                clearInterval(sistemaAutomatico.intervaloEvaluacion);
            }
            
            // Iniciar evaluación cada 30 segundos
            sistemaAutomatico.intervaloEvaluacion = setInterval(() => {
                evaluarSensoresAutomatico();
            }, 30000);
            
            // Realizar evaluación inmediata
            evaluarSensoresAutomatico();
            
            console.log('🤖 MODO AUTOMÁTICO ACTIVADO - Evaluaciones cada 30 segundos');
            guardarRegistroAutomatico('Modo automático ACTIVADO - Sistema iniciado');
            
            res.json({
                success: true,
                mensaje: 'Modo automático activado correctamente',
                configuracion: {
                    intervalo: 30,
                    rangos: RANGOS_OPTIMOS,
                    bombas: Object.keys(sistemaAutomatico.bombasActivas).length
                }
            });
            
        } else {
            // DESACTIVAR MODO AUTOMÁTICO
            sistemaAutomatico.modoActivo = false;
            
            // Detener evaluaciones periódicas
            if (sistemaAutomatico.intervaloEvaluacion) {
                clearInterval(sistemaAutomatico.intervaloEvaluacion);
                sistemaAutomatico.intervaloEvaluacion = null;
            }
            
            // Apagar todas las bombas
            resetearTodasLasBombas();
            
            console.log('👤 MODO AUTOMÁTICO DESACTIVADO');
            guardarRegistroAutomatico('Modo automático DESACTIVADO - Todas las bombas apagadas');
            
            res.json({
                success: true,
                mensaje: 'Modo automático desactivado correctamente'
            });
        }
        
    } catch (error) {
        console.error('Error al cambiar modo automático:', error);
        res.json({
            success: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener estado del sistema automático
router.get('/estado-automatico', (req, res) => {
    res.json({
        success: true,
        modo_automatico: sistemaAutomatico.modoActivo,
        ultima_evaluacion: sistemaAutomatico.ultimaEvaluacion,
        bombas_activas: sistemaAutomatico.bombasActivas,
        configuracion_rangos: RANGOS_OPTIMOS,
        total_bombas_activas: Object.values(sistemaAutomatico.bombasActivas).filter(estado => estado === 1).length
    });
});

// Ruta para obtener datos de sensores con evaluación
router.get('/datos-sensores-automatico', (req, res) => {
    const queries = {
        phAgua: 'SELECT * FROM nivel_ph_agua ORDER BY fecha DESC, id_agua DESC LIMIT 1',
        phSuelo: 'SELECT * FROM nivel_ph_suelo ORDER BY fecha DESC, id_suelo DESC LIMIT 1',
        tds: 'SELECT * FROM tds ORDER BY fecha DESC, id_tds DESC LIMIT 1',
        temperatura: 'SELECT * FROM temperatura ORDER BY fecha DESC, id_temperatura DESC LIMIT 1'
    };

    const evaluarParametro = (valor, tipo) => {
        const rangos = RANGOS_OPTIMOS[tipo];
        if (!rangos) return { estado: 'Sin configurar', necesita_accion: false, accion: 'Ninguna' };
        
        if (valor < rangos.min) {
            return { 
                estado: 'BAJO', 
                necesita_accion: true, 
                accion: tipo.includes('ph') ? 'Activar bomba alcalina' : 
                        tipo === 'tds' ? 'Activar bomba nutrientes' : 'Activar calentamiento'
            };
        } else if (valor > rangos.max) {
            return { 
                estado: 'ALTO', 
                necesita_accion: true, 
                accion: tipo.includes('ph') ? 'Activar bomba ácida' : 
                        tipo === 'tds' ? 'Activar bomba agua pura' : 'Activar enfriamiento'
            };
        } else {
            return { 
                estado: 'NORMAL', 
                necesita_accion: false, 
                accion: 'Ninguna' 
            };
        }
    };

    let resultados = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.query(queries[key], (err, results) => {
            if (err) {
                console.error(`Error en consulta ${key}:`, err);
                resultados[key] = { 
                    valor: 0, 
                    evaluacion: { estado: 'ERROR', necesita_accion: false, accion: 'Verificar sensor' }
                };
            } else {
                const data = results[0];
                if (data) {
                    const valor = parseFloat(data.rango || data.medida || 0);
                    const tipo = key === 'phAgua' ? 'ph_agua' : 
                               key === 'phSuelo' ? 'ph_suelo' : 
                               key === 'tds' ? 'tds' : 'temperatura';
                    
                    resultados[key] = {
                        valor: valor,
                        fecha: data.fecha,
                        evaluacion: evaluarParametro(valor, tipo)
                    };
                } else {
                    resultados[key] = { 
                        valor: 0, 
                        evaluacion: { estado: 'SIN DATOS', necesita_accion: false, accion: 'Verificar conexión' }
                    };
                }
            }
            
            completedQueries++;
            if (completedQueries === totalQueries) {
                res.json({
                    success: true,
                    datos: resultados,
                    modo_automatico: sistemaAutomatico.modoActivo,
                    bombas_activas: sistemaAutomatico.bombasActivas
                });
            }
        });
    });
});

// Ruta para configurar rangos personalizados
router.post('/configurar-rangos', (req, res) => {
    const { ph_agua, ph_suelo, tds, temperatura } = req.body;
    
    try {
        if (ph_agua) {
            RANGOS_OPTIMOS.ph_agua = ph_agua;
        }
        if (ph_suelo) {
            RANGOS_OPTIMOS.ph_suelo = ph_suelo;
        }
        if (tds) {
            RANGOS_OPTIMOS.tds = tds;
        }
        if (temperatura) {
            RANGOS_OPTIMOS.temperatura = temperatura;
        }
        
        console.log('⚙️ Rangos actualizados:', RANGOS_OPTIMOS);
        guardarRegistroAutomatico(`Rangos actualizados: ${JSON.stringify(req.body)}`);
        
        res.json({
            success: true,
            mensaje: 'Rangos actualizados correctamente',
            nuevos_rangos: RANGOS_OPTIMOS
        });
        
    } catch (error) {
        console.error('Error al actualizar rangos:', error);
        res.json({
            success: false,
            mensaje: 'Error al actualizar rangos'
        });
    }
});

// Ruta para parada de emergencia
router.post('/emergencia', (req, res) => {
    try {
        console.log('🚨 PARADA DE EMERGENCIA ACTIVADA');
        
        // Desactivar modo automático inmediatamente
        sistemaAutomatico.modoActivo = false;
        
        // Detener evaluaciones
        if (sistemaAutomatico.intervaloEvaluacion) {
            clearInterval(sistemaAutomatico.intervaloEvaluacion);
            sistemaAutomatico.intervaloEvaluacion = null;
        }
        
        // Apagar TODAS las bombas inmediatamente
        Object.keys(sistemaAutomatico.bombasActivas).forEach(bomba => {
            if (sistemaAutomatico.bombasActivas[bomba] === 1) {
                sistemaAutomatico.bombasActivas[bomba] = 0;
                const pin = PINES_ARDUINO[bomba];
                enviarComandoArduino(pin, 0, 0, bomba);
                console.log(`🔴 EMERGENCIA - ${bomba} APAGADA`);
            }
        });
        
        guardarRegistroAutomatico('EMERGENCIA ACTIVADA - Todos los sistemas detenidos inmediatamente');
        
        res.json({
            success: true,
            mensaje: 'Parada de emergencia ejecutada - Todos los sistemas detenidos',
            bombas_estado: sistemaAutomatico.bombasActivas
        });
        
    } catch (error) {
        console.error('Error en parada de emergencia:', error);
        res.json({
            success: false,
            mensaje: 'Error en parada de emergencia'
        });
    }
});

// Ruta para obtener historial de acciones automáticas
router.get('/historial-automatico', (req, res) => {
    const query = `
        SELECT * FROM historial_dato 
        WHERE nombre IN ('Control Automático', 'Evaluación Automática') 
        ORDER BY fecha DESC, id_historial DESC 
        LIMIT 50
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener historial:', err);
            res.json({ success: false, mensaje: 'Error al obtener historial' });
        } else {
            res.json({ 
                success: true, 
                historial: results,
                total_registros: results.length
            });
        }
    });
});

// Ruta para test manual de bomba específica (solo en modo manual)
router.post('/test-bomba', (req, res) => {
    const { nombreBomba, duracion = 5 } = req.body;
    
    if (sistemaAutomatico.modoActivo) {
        return res.json({
            success: false,
            mensaje: 'No se puede hacer test mientras el modo automático está activo'
        });
    }
    
    if (!sistemaAutomatico.bombasActivas.hasOwnProperty(nombreBomba)) {
        return res.json({
            success: false,
            mensaje: 'Bomba no encontrada'
        });
    }
    
    console.log(`🧪 TEST MANUAL - ${nombreBomba} por ${duracion}s`);
    activarBomba(nombreBomba, duracion);
    
    res.json({
        success: true,
        mensaje: `Test de ${nombreBomba} iniciado por ${duracion} segundos`,
        pin: PINES_ARDUINO[nombreBomba]
    });
});

module.exports = router;