import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./simulador_ingesis.db');

const schema = `
CREATE TABLE IF NOT EXISTS clientes_simulacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- PESTAÑA 1: DATOS PRINCIPALES
    tipo_persona TEXT DEFAULT 'Fisica', -- 'Fisica' o 'Juridica'
    sexo TEXT,                          -- 'M' o 'F' (Radio Button)
    apellido TEXT NOT NULL,
    nombres TEXT NOT NULL,
    
    -- PESTAÑA 2: CONTACTO
    domicilio TEXT,                     -- Calle y Altura
    localidad TEXT,
    cp TEXT,                            -- Código Postal
    email TEXT,                         -- Se usa para reportes automáticos
    telefono TEXT,

    -- PESTAÑA 3: DATOS PERSONALES / FILIACIÓN
    tipo_doc TEXT DEFAULT 'DNI',        -- 'DNI', 'LE', 'LC', 'PAS', 'CUIT'
    nro_doc TEXT UNIQUE NOT NULL,       -- CLAVE ÚNICA (Validación Crítica)
    nacionalidad TEXT,
    fecha_nacimiento DATE,
    nombre_padre TEXT,
    nombre_madre TEXT,

    -- LÓGICA DE ESTADO CIVIL (COMPLEJA)
    estado_civil TEXT,                  -- 'Soltero', 'Casado', 'Divorciado', 'Viudo'
    nupcias TEXT,                       -- Solo editable si estado_civil == 'Casado'
    
    -- VINCULACIÓN DE CÓNYUGE (Recursividad)
    id_conyuge INTEGER,                 -- ID de otro registro en esta misma tabla
    nombre_conyuge_visual TEXT,         -- Nombre concatenado para mostrar en el input (Read-Only)
    
    fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.serialize(() => {
    // Drop table if exists to ensure clean slate for the new schema
    db.run("DROP TABLE IF EXISTS clientes_simulacion");
    db.run("DROP TABLE IF EXISTS clientes"); // Remove old table

    db.run(schema, (err) => {
        if (err) {
            console.error("Error creando tabla:", err.message);
        } else {
            console.log("Base de datos simulada creada correctamente (Tabla: clientes_simulacion).");
        }
    });
});

db.close();
