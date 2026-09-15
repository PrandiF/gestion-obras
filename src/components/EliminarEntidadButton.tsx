"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  id: string;
  nombre: string;
  tipo: "proveedor" | "empleado";
};

export default function EliminarEntidadButton({ id, nombre, tipo }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eliminar = async () => {
    const confirmado = window.confirm(
      `¿Seguro que querés eliminar a "${nombre}"?`,
    );

    if (!confirmado) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const tabla = tipo === "proveedor" ? "proveedores" : "empleados";

    const columnaGasto = tipo === "proveedor" ? "proveedor_id" : "empleado_id";

    // Verificamos si ya fue utilizado en algún gasto.
    const { count, error: countError } = await supabase
      .from("gastos")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(columnaGasto, id);

    if (countError) {
      console.error(countError);
      setError("No se pudo verificar la información.");
      setLoading(false);
      return;
    }

    // Si tiene historial, NO lo borramos.
    // Simplemente lo damos de baja.
    if ((count ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from(tabla)
        .update({
          activo: false,
        })
        .eq("id", id);

      if (updateError) {
        console.error(updateError);
        setError("No se pudo dar de baja.");
        setLoading(false);
        return;
      }

      router.refresh();
      return;
    }

    // Si nunca fue utilizado, sí podemos borrarlo.
    const { error: deleteError } = await supabase
      .from(tabla)
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar.");
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        type="button"
        onClick={eliminar}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />

        {loading ? "Eliminando..." : "Eliminar"}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
