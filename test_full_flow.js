// const fetch = require('node-fetch'); // Built-in in Node 22

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log("--- INICIANDO PRUEBA AUTOMATIZADA ---");

    // 1. CREAR CLIENTE
    console.log("\n1. Creando Cliente...");
    const newClient = {
        tipo: 'FISICA',
        dni: '20-TEST-' + Date.now(), // CUIT único
        apellido: 'TEST_APELLIDO',
        nombre: 'TEST_NOMBRE',
        civil: 'SOLTERO',
        nupcias: '',
        domicilio: 'CALLE FALSA 123',
        personeria: '',
        conyuge: '',
        f_nac: '',
        email: ''
    };

    let createdId;
    try {
        const res = await fetch(`${BASE_URL}/crear-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClient)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        createdId = data.id;
        console.log("✅ Cliente creado con ID:", createdId);
    } catch (e) {
        console.error("❌ Error al crear:", e.message);
        return;
    }

    // 2. ACTUALIZAR CLIENTE (Agregar datos faltantes)
    console.log("\n2. Actualizando Cliente (Agregando Cónyuge, Email, F. Nac)...");
    const updateData = {
        ...newClient,
        civil: 'CASADO',
        nupcias: '1',
        conyuge: 'ESPOSA_TEST',
        f_nac: '01/01/1980',
        email: 'test@email.com'
    };

    try {
        const res = await fetch(`${BASE_URL}/clientes/${createdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        console.log("✅ Cliente actualizado:", data.mensaje);
    } catch (e) {
        console.error("❌ Error al actualizar:", e.message);
        return;
    }

    // 3. VERIFICAR DATOS (Buscar)
    console.log("\n3. Verificando datos guardados...");
    try {
        const res = await fetch(`${BASE_URL}/buscar-cliente?q=TEST_APELLIDO`);
        const results = await res.json();
        const client = results.find(c => c.id === createdId);

        if (!client) {
            console.error("❌ Cliente no encontrado en búsqueda.");
            return;
        }

        console.log("Datos recuperados:");
        console.log("- Estado Civil:", client.estado_civil);
        console.log("- Cónyuge:", client.conyuge);
        console.log("- Email:", client.email);
        console.log("- F. Nac:", client.f_nac);

        if (client.conyuge === 'ESPOSA_TEST' && client.email === 'test@email.com' && client.estado_civil === 'CASADO') {
            console.log("✅ PRUEBA EXITOSA: Los datos se guardaron y recuperaron correctamente.");
        } else {
            console.error("❌ PRUEBA FALLIDA: Los datos recuperados no coinciden con los actualizados.");
        }

    } catch (e) {
        console.error("❌ Error al buscar:", e.message);
    }
}

runTest();
