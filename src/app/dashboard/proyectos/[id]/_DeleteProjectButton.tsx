'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { eliminarProyecto } from '../_actions';
import { cn } from "@/lib/utils";

interface DeleteProjectButtonProps {
  proyectoId: string;
  proyectoNombre: string;
  lotesCount: number;
  className?: string;
}

export default function DeleteProjectButton({ 
  proyectoId, 
  proyectoNombre, 
  lotesCount,
  className,
}: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    
    try {
      const result = await eliminarProyecto(proyectoId);
      
      if (result.success) {
        toast.success(result.message);
        // Redirigir a la lista de proyectos
        router.push('/dashboard/proyectos');
      }
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      toast.error(error instanceof Error ? error.message : 'Error eliminando proyecto');
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (!showConfirm) {
    return (
      <div className={cn(className)}>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar Proyecto
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg", className)}>
      <AlertTriangle className="w-5 h-5 text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          ¿Eliminar proyecto &quot;{proyectoNombre}&quot;?
        </p>
        <p className="text-xs text-red-600 mt-1">
          Se eliminarán {lotesCount} lote(s) y todos los archivos asociados. Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleCancel}
          variant="outline"
          size="sm"
          disabled={isDeleting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-100"
          disabled={isDeleting}
        >
          {isDeleting ? 'Eliminando...' : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}
