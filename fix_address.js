import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

const apellido = 'GALMARINI';
const calle = 'CALLE VALLE DE LA BALLESTERA';
const numero = '64';
const localidad = 'VALENCIA';
const cp = '46015';

db.run(`
    UPDATE clientes_simulacion 
    SET calle = ?, numero = ?, localidad = ?, cp = ? 
    WHERE apellido_razon_social LIKE ?
`, [calle, numero, localidad, cp, `%${apellido}%`], function (err) {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log(`Dirección desglosada actualizada para ${this.changes} cliente(s).`);
    }
    db.close();
});
