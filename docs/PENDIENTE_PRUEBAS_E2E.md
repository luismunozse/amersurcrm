# ✅ Pendiente: Automatizar pruebas E2E

Las pruebas end-to-end (Playwright) quedan programadas para una siguiente iteración. Dejamos aquí los pasos a completar cuando retomemos el tema.

## 1. Preparar cuentas dedicadas
- Crear usuario `qa-admin` y `qa-vendedor` en Supabase con contraseñas conocidas solo para el equipo de QA.
- Limitar permisos a lo estrictamente necesario (evitar roles super-admin si no hacen falta).
- Guardar las credenciales en variables de entorno para Playwright (`E2E_ADMIN_USER`, `E2E_ADMIN_PASS`, etc.).

## 2. Datos y limpieza
- Definir clientes/proyectos “dummy” con prefijo `TEST-` para que sean fáciles de identificar.
- Agregar un job manual (o script npm) para limpiar esos datos luego de cada corrida.
- Ejecutar las pruebas fuera del horario productivo y avisar al equipo para evitar confusiones.

## 3. Configurar Playwright
- Crear helper de login que reutilice las credenciales QA.
- Actualizar los specs (`tests/e2e/*.spec.ts`) para cubrir los flujos clave: login, gestión de clientes, marketing, etc.
- Añadir un comando npm (`npm run test:e2e:qa` por ejemplo) que use esas credenciales.

## 4. Checklist previo
- Confirmar backup de la base antes de la primera corrida.
- Verificar que los usuarios QA no tengan 2FA ni bloqueos extra.
- Documentar cualquier limitación (ej. Twilio sandbox, datos compartidos con producción).

Cuando estos puntos estén listos, podemos reactivar los tests E2E y ampliar el coverage automático.***
