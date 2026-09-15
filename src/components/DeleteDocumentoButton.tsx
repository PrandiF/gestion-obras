"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  documentoId: string;
  storagePath: string;
  nombre: string;
};

export default function EliminarDocumentoButton({
  documentoId,
  storagePath,
  nombre,
}: Props) {
  const router = useRouter();

  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const eliminarDocumento = async () => {
    const confirmado = window.confirm(
      `¿Seguro que querés eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmado) return;

    setEliminando(true);
    setError("");

    const supabase = createClient();

    // Primero eliminamos el archivo físico.
    const { error: storageError } = await supabase.storage
      .from("documentos")
      .remove([storagePath]);

    if (storageError) {
      console.error("Error eliminando archivo:", storageError);

      setError("No se pudo eliminar el archivo.");
      setEliminando(false);
      return;
    }

    // Después eliminamos el registro de la DB.
    // Además exigimos que NO sea un comprobante.
    const { error: documentoError } = await supabase
      .from("documentos")
      .delete()
      .eq("id", documentoId)
      .neq("categoria", "comprobante");

    if (documentoError) {
      console.error("Error eliminando documento:", documentoError);

      setError("No se pudo eliminar el documento.");
      setEliminando(false);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        type="button"
        onClick={eliminarDocumento}
        disabled={eliminando}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />

        {eliminando ? "Eliminando..." : "Eliminar"}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
