import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EliminarEntidadButton from "@/components/EliminarEntidadButton";

export default async function EmpleadosPage() {
  const supabase = await createClient();

  const { data: empleados, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error obteniendo empleados:", error);

    return (
      <main className="p-6 xl:p-8 xl:pt-0 pt-20 -8">
        <p className="text-red-600">
          Ocurrió un error al cargar los empleados.
        </p>
      </main>
    );
  }

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Empleados</h1>

            <p className="mt-2 text-gray-600">
              Administrá los empleados asociados a los gastos de las obras.
            </p>
          </div>

          <Link
            href="/empleados/nuevo"
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 xl:text-start text-center"
          >
            + Nuevo empleado
          </Link>
        </div>

        {empleados.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay empleados
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Agregá el primer empleado para comenzar.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Empleado
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {empleados.map((empleado) => (
                  <tr key={empleado.id}>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {empleado.nombre}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <EliminarEntidadButton
                        id={empleado.id}
                        nombre={empleado.nombre}
                        tipo="empleado"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
