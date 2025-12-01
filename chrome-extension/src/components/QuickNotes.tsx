import React, { useState } from 'react';
import { CRMApiClient } from '@/lib/api';

interface QuickNotesProps {
  clienteId: string;
  apiClient: CRMApiClient;
  onNotaAdded?: () => void;
}

export function QuickNotes({ clienteId, apiClient, onNotaAdded }: QuickNotesProps) {
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleAddNota() {
    if (!nota.trim() || saving) return;

    setSaving(true);
    try {
      const timestamp = new Date().toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const notaConTimestamp = `[${timestamp}] ${nota.trim()}`;

      await apiClient.addQuickNote(clienteId, notaConTimestamp);

      setNota('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      if (onNotaAdded) {
        onNotaAdded();
      }
    } catch (error) {
      console.error('[QuickNotes] Error agregando nota:', error);
      alert('Error al agregar nota. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleAddNota();
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📝</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Nota Rápida
        </h3>
      </div>

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Cliente prefiere 2 habitaciones... (Ctrl+Enter para guardar)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm resize-none"
        rows={3}
        disabled={saving}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {nota.length}/200
        </span>
        <button
          onClick={handleAddNota}
          disabled={!nota.trim() || saving || nota.length > 200}
          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Agregar'}
        </button>
      </div>

      {showSuccess && (
        <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-300 flex items-center gap-2">
          <span>✓</span>
          <span>Nota agregada exitosamente</span>
        </div>
      )}
    </div>
  );
}
