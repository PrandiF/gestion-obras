"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NuevaObraPage() {
  const router = useRouter();

  const [direccion, setDireccion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.from("obras").insert({
      direccion: direccion || null,
      fecha_inicio: fechaInicio || null,
      estado: "activa",
    });

    if (error) {
      console.error("Error creando obra:", error);
      setError("Ocurrió un error al crear la obra.");
      setLoading(false);
      return;
    }

    router.push("/obras");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 xl:p-8 xl:pt-0 pt-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 ">
          <Link
            href="/obras"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a obras
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Nueva obra
          </h1>

          <p className="mt-2 text-gray-600">
            Cargá los datos principales de la obra.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
        >
          <div>
            <label
              htmlFor="direccion"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Dirección
            </label>

            <input
              id="direccion"
              type="text"
              value={direccion}
              required
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Concordia 1234"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="fechaInicio"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Fecha de inicio
            </label>

            <input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Link
              href="/obras"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear obra"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
