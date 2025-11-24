# Soluciones para Error de Memoria en Vercel

## 🔴 El Problema: Memory Heap Out of Memory

### Error típico:
```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
Next.js build worker exited with code: null and signal: SIGABRT
```

### Causa:
El plan **Hobby (Free)** de Vercel tiene un límite de **3 GB de RAM** para builds, pero el proyecto puede necesitar más.

---

## ✅ Solución 1: Optimización de Memoria (Implementada)

### Cambios realizados:

**`vercel.json`** - Reducido a 3GB (límite free tier):
```json
{
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=3072"
  }
}
```

**`package.json`** - Build commands optimizados:
```json
{
  "scripts": {
    "build": "next build",              // Para Vercel (usa vercel.json)
    "build:local": "NODE_OPTIONS='--max-old-space-size=4096' next build"  // Para local
  }
}
```

### Ventajas:
- ✅ Funciona en plan gratuito
- ✅ No requiere upgrade
- ✅ Compatible con límites de Vercel

### Desventajas:
- ⚠️ Puede ser más lento
- ⚠️ Si el proyecto crece mucho, podría fallar

---

## ✅ Solución 2: Upgrade a Vercel Pro (Si Solución 1 Falla)

### Especificaciones:

| Plan | RAM Build | Precio |
|------|-----------|--------|
| Hobby (Free) | 3 GB | $0 |
| **Pro** | 8 GB | $20/mes |
| Enterprise | Custom | Custom |

### Pasos:
1. Ve a Vercel Dashboard → Settings → Billing
2. Upgrade a plan Pro
3. Vuelve a `vercel.json` y cambia:
   ```json
   "NODE_OPTIONS": "--max-old-space-size=6144"  // 6GB
   ```

---

## ✅ Solución 3: Optimización Adicional del Código

Si la Solución 1 falla, prueba estas optimizaciones:

### 1. **Habilitar SWC Minifier (Más rápido, menos memoria)**

En `next.config.js`:
```javascript
module.exports = {
  swcMinify: true,  // Usa SWC en vez de Terser
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}
```

### 2. **Lazy Loading de Componentes Pesados**

```javascript
// Antes
import ComponentePesado from './ComponentePesado';

// Después
import dynamic from 'next/dynamic';
const ComponentePesado = dynamic(() => import('./ComponentePesado'), {
  loading: () => <p>Cargando...</p>
});
```

### 3. **Reducir Dependencias No Usadas**

```bash
npm run build -- --profile  # Analizar qué usa más memoria
npm uninstall <paquete-no-usado>
```

### 4. **Dividir el Build en Chunks**

En `next.config.js`:
```javascript
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts']
  }
}
```

---

## ✅ Solución 4: Build Incremental (Próximo Deploy)

Vercel cachea builds previos. Si el primer build falla:

1. El segundo intento será más rápido (usa cache)
2. Consume menos memoria
3. Mayor probabilidad de éxito

**Acción:** Simplemente intenta re-deployar 2-3 veces

---

## 🔍 Diagnóstico: ¿Cuánta Memoria Necesito?

### Test Local:
```bash
# Monitorear uso de memoria durante build
npm run build:local
# Si usa < 3GB → Solución 1 funcionará
# Si usa > 3GB → Considera Solución 2 (Pro plan)
```

### En Vercel:
- Revisa los logs del build fallido
- Busca líneas como: `Heap limit allocation failed`
- Si aparece antes de "Collecting page data" → Necesitas más memoria

---

## 📊 Estado Actual

✅ **Configuración actual**: 3GB (vercel.json)
✅ **Compatible con**: Vercel Hobby (Free)
✅ **Build local**: 4GB (npm run build:local)

### ¿Qué hacer ahora?

1. **Intenta deployar** con la configuración actual (3GB)
2. **Si falla** → Revisa los logs
3. **Si el error es memoria** → Considera:
   - Optimizaciones del código (Solución 3)
   - Upgrade a Pro (Solución 2)

---

## 🚨 Qué Hacer Si el Deploy Falla

```bash
# 1. Re-intenta (cache puede ayudar)
Redeploy en Vercel Dashboard

# 2. Revisa logs específicos
Vercel Dashboard → Deployments → [Failed] → Build Logs

# 3. Busca el error exacto
Busca: "heap", "memory", "FATAL ERROR"

# 4. Aplica solución correspondiente
```

---

## 📞 Soporte

Si ninguna solución funciona:
- GitHub Issues: Reporta el problema
- Vercel Support: support@vercel.com (Pro plan)
- Community: vercel.com/community
