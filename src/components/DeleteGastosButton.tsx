"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  gastoId: string;
  documentos: {
    id: string;
    storage_path: string;
  }[];
};

export default function EliminarGastoButton({ gastoId, documentos }: Props) {
  const router = useRouter();

  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const eliminar = async () => {
    const confirmado = window.confirm(
      "¿Seguro que querés eliminar este gasto? Esta acción no se puede deshacer.",
    );

    if (!confirmado) return;

    setEliminando(true);
    setError("");

    const supabase = createClient();

    // Primero eliminamos los archivos físicos de Storage.
    const paths = documentos
      .map((documento) => documento.storage_path)
      .filter(Boolean);

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("documentos")
        .remove(paths);

      if (storageError) {
        console.error(storageError);
        setError("No se pudo eliminar el comprobante.");
        setEliminando(false);
        return;
      }
    }

    // documentos tiene ON DELETE CASCADE sobre gasto_id,
    // por lo que al eliminar el gasto también se eliminan
    // sus registros de documentos.
    const { error: gastoError } = await supabase
      .from("gastos")
      .delete()
      .eq("id", gastoId)
      .is("cierre_id", null);

    if (gastoError) {
      console.error(gastoError);

      setError("No se pudo eliminar el gasto.");
      setEliminando(false);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        type="button"
        onClick={eliminar}
        disabled={eliminando}
        title="Eliminar gasto"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />

        {eliminando ? "Eliminando..." : "Eliminar"}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
