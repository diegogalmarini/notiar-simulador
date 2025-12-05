import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./simulador_ingesis.db');

// --- ENDPOINTS ---

// 1. BUSCAR CLIENTE
app.get('/api/buscar-cliente', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    setTimeout(() => {
        const sql = `
            SELECT * FROM clientes_simulacion 
            WHERE nro_doc = ? OR cuit = ? OR apellido LIKE ?
            LIMIT 50
        `;
        db.all(sql, [q, q, `${q}%`], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Error DB' });
            res.json(rows);
        });
    }, 100); // Small latency
});

// 2. CREAR CLIENTE
app.post('/api/clientes', (req, res) => {
    const data = req.body;

    // Strict validation
    const checkSql = `SELECT id FROM clientes_simulacion WHERE nro_doc = ?`;
    db.get(checkSql, [data.nro_doc], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (row) return res.status(409).json({ error: 'DUPLICADO: Documento existente.' });

        const sql = `
            INSERT INTO clientes_simulacion (
                tipo_persona, sexo, apellido, variante, nombres,
                tipo_doc, nro_doc, cuit,
                nacionalidad, fecha_nacimiento, lugar_nacimiento, profesion,
                calle, altura, piso, dpto, cp, localidad, provincia,
                email, telefono,
                nombre_padre, nombre_madre, estado_civil, nupcias, id_conyuge, nombre_conyuge_visual,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            data.tipo_persona || 'Fisica', data.sexo, data.apellido, data.variante, data.nombres,
            data.tipo_doc, data.nro_doc, data.cuit,
            data.nacionalidad, data.fecha_nacimiento, data.lugar_nacimiento, data.profesion,
            data.calle, data.altura, data.piso, data.dpto, data.cp, data.localidad, data.provincia || 'Buenos Aires',
            data.email, data.telefono,
            data.nombre_padre, data.nombre_madre, data.estado_civil, data.nupcias, data.id_conyuge, data.nombre_conyuge_visual,
            data.observaciones
        ];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'OK' });
        });
    });
});

// 3. ACTUALIZAR CLIENTE
app.put('/api/clientes/:id', (req, res) => {
    const id = req.params.id;
    const data = req.body;

    const sql = `
        UPDATE clientes_simulacion SET
            tipo_persona=?, sexo=?, apellido=?, variante=?, nombres=?,
            tipo_doc=?, nro_doc=?, cuit=?,
            nacionalidad=?, fecha_nacimiento=?, lugar_nacimiento=?, profesion=?,
            calle=?, altura=?, piso=?, dpto=?, cp=?, localidad=?, provincia=?,
            email=?, telefono=?,
            nombre_padre=?, nombre_madre=?, estado_civil=?, nupcias=?, id_conyuge=?, nombre_conyuge_visual=?,
            observaciones=?
        WHERE id = ?
    `;

    const params = [
        data.tipo_persona, data.sexo, data.apellido, data.variante, data.nombres,
        data.tipo_doc, data.nro_doc, data.cuit,
        data.nacionalidad, data.fecha_nacimiento, data.lugar_nacimiento, data.profesion,
        data.calle, data.altura, data.piso, data.dpto, data.cp, data.localidad, data.provincia,
        data.email, data.telefono,
        data.nombre_padre, data.nombre_madre, data.estado_civil, data.nupcias, data.id_conyuge, data.nombre_conyuge_visual,
        data.observaciones,
        id
    ];

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
