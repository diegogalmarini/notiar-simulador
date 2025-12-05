import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

const columnsToAdd = [
    "ALTER TABLE clientes_simulacion ADD COLUMN calle TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN numero TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN piso TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN cp TEXT;",
    "ALTER TABLE clientes_simulacion ADD COLUMN localidad TEXT;"
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
    console.log("Migración de domicilio finalizada.");
});
