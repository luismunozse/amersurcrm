#!/bin/bash

# Script de inicio rápido para WhatsApp Bot
# Amersur CRM

echo "🚀 Iniciando WhatsApp Bot para Amersur CRM..."
echo ""

# Verificar que exista .env
if [ ! -f .env ]; then
    echo "❌ Error: No existe archivo .env"
    echo ""
    echo "Crea el archivo .env primero:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    exit 1
fi

# Verificar que exista node_modules
if [ ! -d node_modules ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Iniciar bot
echo "✅ Todo listo. Iniciando bot..."
echo ""
echo "📱 Prepárate para escanear el código QR con WhatsApp"
echo ""

node index.js
