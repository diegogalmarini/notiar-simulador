import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

console.log("--- ESQUEMA DE TABLA ---");
db.all(`PRAGMA table_info(clientes_simulacion)`, (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);

    console.log("\n--- DATOS DE GALMARINI ---");
    db.all(`SELECT * FROM clientes_simulacion WHERE apellido_razon_social LIKE '%GALMARINI%'`, (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
        db.close();
    });
});
