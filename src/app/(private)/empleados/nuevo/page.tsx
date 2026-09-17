"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoEmpleadoPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.from("empleados").insert({
      nombre,
      activo: true,
    });

    if (error) {
      console.error("Error creando empleado:", error);
      setError("Ocurrió un error al crear el empleado.");
      setLoading(false);
      return;
    }

    router.push("/empleados");
    router.refresh();
  };

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/empleados"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a empleados
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Nuevo empleado
          </h1>

          <p className="mt-2 text-gray-600">Cargá los datos del empleado.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
        >
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nombre *
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Juan Pérez"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Link
              href="/empleados"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear empleado"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
