'use client';

import { useEffect, useState } from 'react';

export default function GoogleMapsDebug() {
  const [apiKey, setApiKey] = useState<string>('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    
    // Verificar API key
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    setApiKey(key || 'NO CONFIGURADA');

    // Verificar si Google Maps está cargado
    const checkGoogleMaps = () => {
      if ((window as any).google?.maps) {
        setGoogleMapsLoaded(true);
      } else {
        setTimeout(checkGoogleMaps, 1000);
      }
    };
    
    checkGoogleMaps();
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg font-mono text-xs max-w-sm">
      <h4 className="font-bold mb-2">🐛 Google Maps Debug</h4>
      <div className="space-y-1">
        <div>
          <strong>API Key:</strong> 
          <span className={apiKey === 'NO CONFIGURADA' ? 'text-red-400' : 'text-green-400'}>
            {apiKey === 'NO CONFIGURADA' ? apiKey : `${apiKey.substring(0, 10)}...`}
          </span>
        </div>
        <div>
          <strong>Google Maps:</strong> 
          <span className={googleMapsLoaded ? 'text-green-400' : 'text-red-400'}>
            {googleMapsLoaded ? '✅ Cargado' : '❌ No cargado'}
          </span>
        </div>
        <div>
          <strong>Status:</strong> 
          <span className="text-blue-400">Debug activo</span>
        </div>
      </div>
    </div>
  );
}
