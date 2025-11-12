#!/bin/bash

# Script para ejecutar migraciones en Supabase
# Uso: ./scripts/run-migration.sh

echo "🔧 Ejecutando migración de Twilio..."

# Obtener la URL de conexión de Supabase
SUPABASE_URL="postgresql://postgres.hbscbwpnkrnuvmdbfmvp:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "⚠️  Por favor, ejecuta esta migración manualmente desde el Dashboard de Supabase:"
echo ""
echo "1. Ve a: https://hbscbwpnkrnuvmdbfmvp.supabase.co"
echo "2. SQL Editor → New query"
echo "3. Copia el contenido de: supabase/migrations/20250103_add_twilio_columns.sql"
echo "4. Pega y ejecuta"
echo ""
echo "O ejecuta este comando si tienes psql instalado y la contraseña:"
echo ""
echo "psql 'postgresql://postgres.hbscbwpnkrnuvmdbfmvp:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres' -f supabase/migrations/20250103_add_twilio_columns.sql"
