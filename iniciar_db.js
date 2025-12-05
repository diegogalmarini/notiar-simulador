import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./simulador_ingesis.db');

const schema = `
    CREATE TABLE IF NOT EXISTS clientes_simulacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        
        -- GROUP: IDENTITY
        tipo_persona TEXT DEFAULT 'Fisica',
        sexo TEXT,                          -- Radio: 'M' or 'F'
        apellido TEXT NOT NULL,
        variante TEXT,                      -- Alias/Maiden Name
        nombres TEXT NOT NULL,
        
        -- GROUP: LEGAL DOCS
        tipo_doc TEXT DEFAULT 'DNI',
        nro_doc TEXT UNIQUE NOT NULL,       -- Constraint: Unique Key
        cuit TEXT,                          -- Tax ID
        
        -- GROUP: BIOGRAPHY
        nacionalidad TEXT,
        fecha_nacimiento DATE,
        lugar_nacimiento TEXT,              -- Place of Birth
        profesion TEXT,                     -- Mandatory
        
        -- GROUP: ADDRESS - ATOMIZED
        calle TEXT,
        altura TEXT,
        piso TEXT,
        dpto TEXT,
        cp TEXT,
        localidad TEXT,
        provincia TEXT DEFAULT 'Buenos Aires',
        
        -- GROUP: CONTACT
        email TEXT,
        telefono TEXT,

        -- GROUP: LINKS
        nombre_padre TEXT,
        nombre_madre TEXT,
        estado_civil TEXT,
        nupcias TEXT,
        id_conyuge INTEGER,
        nombre_conyuge_visual TEXT,
        
        -- GROUP: META
        observaciones TEXT,
        fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

db.serialize(() => {
    // ACTION: DESTROY current schema as requested
    db.run("DROP TABLE IF EXISTS clientes_simulacion");
    db.run("DROP TABLE IF EXISTS clientes");

    db.run(schema, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Database initialized. Table: clientes_simulacion");
        }
    });
});

db.close();
