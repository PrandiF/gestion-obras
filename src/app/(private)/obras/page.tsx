import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ObrasPage() {
  const supabase = await createClient();

  const { data: obras, error } = await supabase
    .from("obras")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo obras:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">Ocurrió un error al cargar las obras.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 xl:pt-0 pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Obras</h1>

            <p className="mt-2 text-gray-600">
              Administrá las obras de la empresa.
            </p>
          </div>

          <Link
            href="/obras/nueva"
            className="rounded-lg bg-gray-900 px-4 py-2 xl:py-2.5 text-sm font-medium  text-white transition hover:bg-gray-800 whitespace-nowrap"
          >
            + Nueva obra
          </Link>
        </div>

        {obras.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay obras
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Creá la primera obra para comenzar a registrar gastos.
            </p>
          </div>
        ) : (
          <div className="grid xl:gap-4 md:grid-cols-2 lg:grid-cols-3 grid-cols-1 ">
            {obras.map((obra) => (
              <div
                key={obra.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-semibold text-gray-900">
                    {obra.direccion}
                  </h2>

                  <span
                    className={`rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ${obra.estado === "activa" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    {obra.estado === "activa" ? "Activa" : "Finalizada"}
                  </span>
                </div>

                {obra.fecha_inicio && (
                  <p className="mt-4 text-sm text-gray-500">
                    Inicio:{" "}
                    {new Date(
                      `${obra.fecha_inicio}T00:00:00`,
                    ).toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
