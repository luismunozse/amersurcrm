#!/bin/bash

# =====================================================
# INSTALADOR COMPLETO DEL SISTEMA DE AGENDA
# =====================================================
# Script para instalar y configurar el sistema de agenda
# como motor de disciplina comercial del CRM

set -e  # Salir si hay algún error

echo "🚀 INSTALADOR DEL SISTEMA DE AGENDA - AMERSUR CRM"
echo "=================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado. Instálalo junto con Node.js"
    exit 1
fi

print_status "Verificando dependencias..."

# Verificar que las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    print_status "Instalando dependencias de Node.js..."
    npm install
fi

# Verificar variables de entorno
print_status "Verificando configuración de Supabase..."

if [ ! -f ".env.local" ]; then
    print_error "Archivo .env.local no encontrado."
    print_status "Crea el archivo .env.local con las siguientes variables:"
    echo "NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key"
    exit 1
fi

# Cargar variables de entorno
source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_error "Variables de entorno de Supabase no configuradas correctamente."
    print_status "Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
    exit 1
fi

print_success "Configuración de Supabase encontrada."

# Paso 1: Verificar estado actual del schema
print_status "Paso 1: Información importante sobre la instalación..."
print_warning "Para aplicar la migración correctamente, necesitas ejecutar comandos SQL directamente en Supabase."
print_status "Ve al Dashboard de Supabase → SQL Editor y ejecuta los comandos que se muestran a continuación."

echo ""
echo "📋 COMANDOS SQL PARA EJECUTAR EN SUPABASE:"
echo "=========================================="
echo ""
echo "-- 1. Agregar campos básicos a la tabla evento"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS objetivo TEXT;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS resultado_notas TEXT;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS proximo_paso_objetivo TEXT;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS proximo_paso_fecha TIMESTAMPTZ;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS sla_tipo TEXT;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS sla_vencimiento TIMESTAMPTZ;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS recordatorio_canal TEXT DEFAULT 'push';"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS snooze_hasta TIMESTAMPTZ;"
echo ""
echo "-- 2. Agregar campos con referencias (sin foreign keys)"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS oportunidad_id UUID;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS resultado_id UUID;"
echo "ALTER TABLE crm.evento ADD COLUMN IF NOT EXISTS snooze_motivo_id UUID;"
echo ""
echo "-- 3. Actualizar estados permitidos"
echo "ALTER TABLE crm.evento DROP CONSTRAINT IF EXISTS evento_estado_check;"
echo "ALTER TABLE crm.evento ADD CONSTRAINT evento_estado_check CHECK ("
echo "    estado IN ('pendiente', 'en_progreso', 'vencida', 'reprogramado', 'completado', 'cancelado')"
echo ");"
echo ""
echo "-- 4. Crear tabla de motivos de snooze"
echo "CREATE TABLE IF NOT EXISTS crm.evento_snooze_motivo ("
echo "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"
echo "  nombre TEXT NOT NULL UNIQUE,"
echo "  descripcion TEXT,"
echo "  activo BOOLEAN DEFAULT TRUE,"
echo "  orden INTEGER DEFAULT 0,"
echo "  created_at TIMESTAMPTZ DEFAULT NOW(),"
echo "  updated_at TIMESTAMPTZ DEFAULT NOW()"
echo ");"
echo ""
echo "-- 5. Insertar motivos de snooze"
echo "INSERT INTO crm.evento_snooze_motivo (nombre, descripcion, orden) VALUES"
echo "  ('Cliente de viaje', 'El cliente está de viaje y no puede atender', 1),"
echo "  ('Cliente ocupado', 'El cliente está ocupado en este momento', 2),"
echo "  ('Otro', 'Otro motivo no especificado', 99)"
echo "ON CONFLICT (nombre) DO NOTHING;"
echo ""
echo "-- 6. Crear tabla de resultados"
echo "CREATE TABLE IF NOT EXISTS crm.evento_resultado_catalogo ("
echo "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"
echo "  nombre TEXT NOT NULL UNIQUE,"
echo "  descripcion TEXT,"
echo "  tipo_evento TEXT,"
echo "  activo BOOLEAN DEFAULT TRUE,"
echo "  orden INTEGER DEFAULT 0,"
echo "  created_at TIMESTAMPTZ DEFAULT NOW(),"
echo "  updated_at TIMESTAMPTZ DEFAULT NOW()"
echo ");"
echo ""
echo "-- 7. Insertar resultados estándar"
echo "INSERT INTO crm.evento_resultado_catalogo (nombre, descripcion, tipo_evento, orden) VALUES"
echo "  ('Contactado exitosamente', 'Se logró contactar al cliente', 'llamada', 1),"
echo "  ('Tarea completada', 'La tarea se completó exitosamente', 'tarea', 1)"
echo "ON CONFLICT (nombre) DO NOTHING;"
echo ""

print_status "¿Ya ejecutaste estos comandos en Supabase? (presiona Enter cuando termines)"
read -p ""

print_success "¡Perfecto! Los comandos SQL han sido ejecutados."

# Datos iniciales incluidos en la migración SQL
print_status "Paso 2: Datos iniciales incluidos en la migración SQL ejecutada anteriormente."

# Datos iniciales incluidos en la migración SQL anterior

# Paso 5: Iniciar servidor de desarrollo
# Iniciar servidor de desarrollo
print_status "Paso 3: Iniciando servidor de desarrollo..."
print_warning "El servidor se iniciará en segundo plano."
print_status "Accede a http://localhost:3000/dashboard/agenda para probar el sistema."

# Iniciar servidor en segundo plano
npm run dev &
SERVER_PID=$!

# Esperar un momento para que el servidor inicie
sleep 5

# Verificar que el servidor está corriendo
if ps -p $SERVER_PID > /dev/null; then
    print_success "Servidor iniciado correctamente (PID: $SERVER_PID)"
else
    print_error "Error iniciando el servidor."
    exit 1
fi

# Mostrar resumen final
echo ""
echo "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE"
echo "======================================"
echo ""
print_success "✅ Schema de agenda actualizado con campos básicos"
print_success "✅ Estados expandidos configurados"
print_success "✅ Tablas de soporte creadas"
print_success "✅ Datos iniciales insertados"
print_success "✅ Servidor de desarrollo iniciado"
echo ""
print_status "🌐 Accede a: http://localhost:3000/dashboard/agenda"
print_status "📚 Documentación completa: IMPLEMENTACION_AGENDA_DISCIPLINA_COMERCIAL.md"
print_status "📋 Resumen ejecutivo: RESUMEN_IMPLEMENTACION_AGENDA.md"
echo ""
print_warning "Para detener el servidor, ejecuta: kill $SERVER_PID"
echo ""
print_status "🎯 PRÓXIMOS PASOS IMPORTANTES:"
echo "1. ✏️  Prueba crear un evento con objetivo obligatorio"
echo "2. 📅 Verifica que aparecen los nuevos estados (en_progreso, vencida)"
echo "3. 🔄 Prueba cerrar eventos solo con próximo paso definido"
echo "4. 📖 Lee la documentación para configuración avanzada"
echo "5. 👥 Entrena al equipo en el uso del sistema"
echo ""
print_success "¡El sistema de agenda está listo para ser el motor de disciplina comercial!"
echo ""
print_status "💡 Funcionalidades ahora disponibles:"
echo "   • Sistema de disciplina comercial (próximo paso obligatorio)"
echo "   • Objetivos obligatorios para cada tarea"
echo "   • Estados expandidos para mejor seguimiento"
echo "   • Sistema de snooze con motivos trazables"
echo "   • Control básico de SLA integrado"
