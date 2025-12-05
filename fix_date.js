import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./simulador_ingesis.db');

const apellido = 'GALMARINI';
const f_nac = '22/11/1971';

db.run(`UPDATE clientes_simulacion SET fecha_nacimiento = ? WHERE apellido_razon_social LIKE ?`, [f_nac, `%${apellido}%`], function (err) {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log(`Fecha de nacimiento actualizada a ${f_nac} para ${this.changes} cliente(s).`);
    }
    db.close();
});
