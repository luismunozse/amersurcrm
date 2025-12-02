#!/bin/bash

# Script para aplicar migraciones del sistema de vendedores activos

echo "🚀 Aplicando migraciones del sistema de vendedores activos..."
echo ""

# Cargar variables de entorno
if [ -f .env.local ]; then
    source .env.local
fi

# Verificar que existe DATABASE_URL en Supabase
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL no encontrada"
    echo "Por favor, ve al panel de Supabase y aplica las migraciones manualmente:"
    echo "1. Ve a https://supabase.com/dashboard"
    echo "2. Selecciona tu proyecto"
    echo "3. Ve a SQL Editor"
    echo "4. Ejecuta los archivos:"
    echo "   - supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql"
    echo "   - supabase/migrations/create_whatsapp_lead_function.sql"
    exit 1
fi

# Obtener la referencia del proyecto desde la URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/.*https:\/\/\([^.]*\).*/\1/p')

echo "📋 Proyecto Supabase detectado: $PROJECT_REF"
echo ""

# Construir la URL de conexión para psql
# Formato: postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
echo "Para aplicar las migraciones, tienes 2 opciones:"
echo ""
echo "OPCIÓN 1: Aplicar desde Supabase Dashboard (Recomendado)"
echo "=========================================================="
echo "1. Ve a: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
echo "2. Crea una nueva consulta"
echo "3. Copia y pega el contenido de: supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql"
echo "4. Ejecuta la consulta (Ctrl+Enter)"
echo "5. Repite con: supabase/migrations/create_whatsapp_lead_function.sql"
echo ""
echo "OPCIÓN 2: Usar psql (Si tienes acceso directo)"
echo "==============================================="
echo "Obtén la cadena de conexión desde:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
echo "Luego ejecuta:"
echo "psql \"tu_cadena_de_conexion\" -f supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql"
echo "psql \"tu_cadena_de_conexion\" -f supabase/migrations/create_whatsapp_lead_function.sql"
echo ""

# Intentar abrir el navegador en Linux
if command -v xdg-open &> /dev/null; then
    echo "🌐 Abriendo Supabase Dashboard en el navegador..."
    xdg-open "https://supabase.com/dashboard/project/$PROJECT_REF/editor" &> /dev/null &
fi

echo ""
echo "✅ Después de aplicar las migraciones, recarga la página /dashboard/admin/vendedores-activos"
