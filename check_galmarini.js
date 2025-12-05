import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

const apellido = 'GALMARINI';

db.all(`SELECT * FROM clientes_simulacion WHERE apellido_razon_social LIKE ?`, [`%${apellido}%`], (err, rows) => {
    if (err) {
        console.error("Error:", err);
        return;
    }
    console.log(`--- CLIENTES ENCONTRADOS (${rows.length}) ---`);
    rows.forEach(row => {
        console.log("ID:", row.id);
        console.log("Apellido:", row.apellido_razon_social);
        console.log("Cónyuge (DB):", row.nombre_conyuge);
        console.log("Email (DB):", row.email);
        console.log("F. Nac (DB):", row.fecha_nacimiento);
        console.log("-----------------------------------");
    });
});

db.close();
