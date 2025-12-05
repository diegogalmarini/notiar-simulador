import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./simulador_ingesis.db');

// --- ENDPOINTS ---

// 1. BUSCAR CLIENTE (Gatekeeper)
app.get('/api/buscar-cliente', (req, res) => {
    const queryTerm = req.query.q || '';
    console.log(`[BUSCAR] Termino: '${queryTerm}'`);

    const sql = `
        SELECT 
            id, tipo_persona, sexo, apellido, nombres, 
            tipo_doc, nro_doc, 
            domicilio, localidad, cp, email, telefono,
            nacionalidad, fecha_nacimiento, nombre_padre, nombre_madre,
            estado_civil, nupcias, id_conyuge, nombre_conyuge_visual
        FROM clientes_simulacion 
        WHERE (nro_doc LIKE ? OR apellido LIKE ? OR nombres LIKE ?)
        LIMIT 50
    `;

    const searchPattern = `%${queryTerm}%`;

    db.all(sql, [searchPattern, searchPattern, searchPattern], (err, rows) => {
        if (err) {
            console.error("Error en búsqueda:", err);
            return res.status(500).json({ error: "Error en base de datos" });
        }
        res.json(rows);
    });
});

// 2. CREAR CLIENTE (Con Latencia y Validación)
app.post('/api/clientes', (req, res) => {
    const data = req.body;
    console.log(`[CREAR] Solicitud para: ${data.apellido}, ${data.nombres} (${data.nro_doc})`);

    // 1. SIMULACIÓN DE LATENCIA (3s)
    setTimeout(() => {

        // 2. VALIDACIÓN DE DUPLICADOS (DNI)
        const checkQuery = "SELECT id FROM clientes_simulacion WHERE nro_doc = ?";
        db.get(checkQuery, [data.nro_doc], (err, row) => {
            if (err) return res.status(500).json({ error: "Error interno al validar." });

            if (row) {
                return res.status(409).json({
                    error: "ATENCIÓN: Ya existe una persona con ese Documento.",
                    tipo: "DUPLICATE_ENTRY"
                });
            }

            // 3. INSERTAR SI ES NUEVO
            const insertQuery = `
                INSERT INTO clientes_simulacion (
                    tipo_persona, sexo, apellido, nombres, 
                    tipo_doc, nro_doc, 
                    domicilio, localidad, cp, email, telefono,
                    nacionalidad, fecha_nacimiento, nombre_padre, nombre_madre,
                    estado_civil, nupcias, id_conyuge, nombre_conyuge_visual
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                data.tipo_persona || 'Fisica', data.sexo, data.apellido, data.nombres,
                data.tipo_doc || 'DNI', data.nro_doc,
                data.domicilio, data.localidad, data.cp, data.email, data.telefono,
                data.nacionalidad, data.fecha_nacimiento, data.nombre_padre, data.nombre_madre,
                data.estado_civil, data.nupcias, data.id_conyuge, data.nombre_conyuge_visual
            ];

            db.run(insertQuery, params, function (err) {
                if (err) {
                    console.error("Error al insertar:", err.message);
                    return res.status(500).json({ error: "Error interno al guardar." });
                }
                console.log(`Cliente creado con ID: ${this.lastID}`);
                res.json({ success: true, id: this.lastID });
            });
        });

    }, 3000); // 3 SEGUNDOS DE ESPERA OBLIGATORIA
});

// 3. ACTUALIZAR CLIENTE
app.put('/api/clientes/:id', (req, res) => {
    const id = req.params.id;
    const data = req.body;
    console.log(`[ACTUALIZAR] ID: ${id}`);

    setTimeout(() => {
        const updateQuery = `
            UPDATE clientes_simulacion SET
                tipo_persona = ?, sexo = ?, apellido = ?, nombres = ?, 
                tipo_doc = ?, nro_doc = ?, 
                domicilio = ?, localidad = ?, cp = ?, email = ?, telefono = ?,
                nacionalidad = ?, fecha_nacimiento = ?, nombre_padre = ?, nombre_madre = ?,
                estado_civil = ?, nupcias = ?, id_conyuge = ?, nombre_conyuge_visual = ?
            WHERE id = ?
        `;

        const params = [
            data.tipo_persona, data.sexo, data.apellido, data.nombres,
            data.tipo_doc, data.nro_doc,
            data.domicilio, data.localidad, data.cp, data.email, data.telefono,
            data.nacionalidad, data.fecha_nacimiento, data.nombre_padre, data.nombre_madre,
            data.estado_civil, data.nupcias, data.id_conyuge, data.nombre_conyuge_visual,
            id
        ];

        db.run(updateQuery, params, function (err) {
            if (err) {
                console.error("Error al actualizar:", err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: "El Documento ya pertenece a otro cliente." });
                }
                return res.status(500).json({ error: "Error interno al actualizar." });
            }
            res.json({ success: true, id: id });
        });
    }, 3000);
});

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor simulador corriendo en http://localhost:${PORT}`);
});
