// Script para probar la API directamente desde Node.js
// Ejecutar con: node scripts/probar_api_directamente.js

const fetch = require('node-fetch');

async function probarAPI() {
    const url = 'http://localhost:3000/api/auth/login-dni';
    const datos = {
        dni: '19062014',
        password: 'tu_contraseña_aqui' // Reemplaza con la contraseña real
    };

    console.log('🔍 Probando API de login con DNI...');
    console.log('URL:', url);
    console.log('Datos:', { dni: datos.dni, password: '***' });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datos)
        });

        console.log('📊 Status:', response.status);
        console.log('📊 Status Text:', response.statusText);
        console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));

        const resultado = await response.text();
        console.log('📊 Response Body:', resultado);

        if (response.ok) {
            console.log('✅ Login exitoso!');
        } else {
            console.log('❌ Login falló');
        }

    } catch (error) {
        console.error('❌ Error en la petición:', error);
    }
}

// Ejecutar la prueba
probarAPI();

