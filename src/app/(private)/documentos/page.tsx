import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Obra = {
  id: string;
  direccion: string;
  estado: "activa" | "finalizada";
};

export default async function DocumentosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("obras")
    .select("id, direccion, estado")
    .order("created_at", { ascending: false });

  const obras = (data ?? []) as Obra[];

  if (error) {
    console.error("Error obteniendo obras:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">Ocurrió un error al cargar las obras.</p>
      </main>
    );
  }

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Archivos y documentos
          </h1>

          <p className="mt-2 text-gray-600">
            Seleccioná una obra para consultar sus archivos y documentación.
          </p>
        </div>

        {obras.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <FolderOpen className="mx-auto mb-4 h-10 w-10 text-gray-400" />

            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay obras
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Creá una obra para comenzar a organizar su documentación.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 grid-cols-1">
            {obras.map((obra) => (
              <Link
                key={obra.id}
                href={`/documentos/${obra.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
                    <FolderOpen className="h-5 w-5 text-gray-700" />
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      obra.estado === "activa"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {obra.estado === "activa" ? "Activa" : "Finalizada"}
                  </span>
                </div>

                <h2 className="font-semibold text-gray-900">
                  {obra.direccion}
                </h2>

                <p className="mt-2 text-sm text-gray-500 transition group-hover:text-gray-700">
                  Ver documentación →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
