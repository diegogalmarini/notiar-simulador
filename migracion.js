import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

const columnsToAdd = [
    "ALTER TABLE clientes_simulacion ADD COLUMN nombre_conyuge TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN fecha_nacimiento TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN email TEXT;"
];

db.serialize(() => {
    columnsToAdd.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log("Columna ya existe, omitiendo.");
                } else {
                    console.error("Error al agregar columna:", err.message);
                }
            } else {
                console.log("Columna agregada exitosamente.");
            }
        });
    });
});

db.close(() => {
    console.log("Migración finalizada.");
});
