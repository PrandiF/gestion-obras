import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Cierre = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  fecha_pago: string | null;
  estado: "abierto" | "cerrado" | "pagado";
  created_at: string;
};

export default async function PagosPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cierres_semanales")
    .select(
      `
      id,
      fecha_desde,
      fecha_hasta,
      fecha_pago,
      estado,
      created_at
    `,
    )
    .order("fecha_desde", { ascending: false });

  if (error) {
    console.error("Error obteniendo cierres:", error);

    return (
      <main className="p-6 xl:p-8 xl:pt-0 pt-20 ">
        <p className="text-red-600">
          Ocurrió un error al cargar los cierres semanales.
        </p>
      </main>
    );
  }

  const cierres = (data ?? []) as Cierre[];

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Pagos</h1>

            <p className="mt-2 text-gray-600">
              Gestioná los cierres semanales y los pagos pendientes.
            </p>
          </div>

          <Link
            href="/pagos/nuevo-cierre"
            className="rounded-lg bg-gray-900 xl:px-4 px-2 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 whitespace-nowrap"
          >
            + Nuevo cierre semanal
          </Link>
        </div>

        {cierres.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-gray-400" />

            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay cierres semanales
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Cuando cierres una semana, vas a poder consultar acá los importes
              pendientes y registrar sus pagos.
            </p>

            <Link
              href="/pagos/nuevo-cierre"
              className="mt-5 inline-block text-sm font-medium text-gray-900 hover:underline"
            >
              Crear primer cierre →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {cierres.map((cierre) => (
                <div
                  key={cierre.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  {/* Período + estado */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Período
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {formatDate(cierre.fecha_desde)}
                        {" → "}
                        {formatDate(cierre.fecha_hasta)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <EstadoCierre estado={cierre.estado} />
                    </div>
                  </div>

                  {/* Información */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500">Fecha de pago</span>

                      <span className="font-medium text-gray-800">
                        {cierre.fecha_pago
                          ? formatDate(cierre.fecha_pago)
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <Link
                      href={`/pagos/${cierre.id}`}
                      className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      Ver cierre →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="md:block hidden overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      Período
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      Fecha de pago
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      Estado
                    </th>

                    <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {cierres.map((cierre) => (
                    <tr key={cierre.id}>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {formatDate(cierre.fecha_desde)}
                        {" → "}
                        {formatDate(cierre.fecha_hasta)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {cierre.fecha_pago
                          ? formatDate(cierre.fecha_pago)
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <EstadoCierre estado={cierre.estado} />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/pagos/${cierre.id}`}
                          className="text-sm font-medium text-gray-900 hover:underline"
                        >
                          Ver cierre →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function EstadoCierre({ estado }: { estado: Cierre["estado"] }) {
  const estilos = {
    abierto: "bg-yellow-50 text-yellow-700",
    cerrado: "bg-orange-50 text-orange-700",
    pagado: "bg-green-50 text-green-700",
  };

  const labels = {
    abierto: "Abierto",
    cerrado: "Pendiente de pago",
    pagado: "Pagado",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${estilos[estado]}`}
    >
      {labels[estado]}
    </span>
  );
}

function formatDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR");
}
