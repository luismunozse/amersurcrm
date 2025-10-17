"use client";

import { Cloud, CheckCircle, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";

interface GoogleDriveStatusProps {
  conectado: boolean;
}

export default function GoogleDriveStatus({ conectado }: GoogleDriveStatusProps) {
  if (conectado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Cloud className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-green-900">Google Drive Conectado</h4>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-green-700">
                Los documentos se sincronizan automáticamente con tu Drive
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/configuracion"
            className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configurar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-amber-900">Google Drive No Configurado</h4>
            <p className="text-sm text-amber-700">
              Conecta tu Google Drive para sincronizar documentos automáticamente
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/admin/configuracion"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          Conectar Google Drive
        </Link>
      </div>
    </div>
  );
}
