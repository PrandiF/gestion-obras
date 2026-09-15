import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    empleadoId: string;
  }>;
};

type Gasto = {
  id: string;
  concepto: string;
  tipo: string;
  fecha: string;
  importe: number;
  cierre_id: string | null;

  obras: {
    direccion: string;
  } | null;

  documentos: {
    id: string;
    nombre: string;
    storage_path: string;
  }[];

  pago_gastos: {
    pago_id: string;
  }[];
};

export default async function EmpleadoDetallePage({ params }: Props) {
  const { empleadoId } = await params;

  const supabase = await createClient();

  // Empleado
  const { data: empleado, error: empleadoError } = await supabase
    .from("empleados")
    .select("id, nombre, activo")
    .eq("id", empleadoId)
    .single();

  if (empleadoError || !empleado) {
    notFound();
  }

  // Gastos asociados al empleado
  const { data: gastosData, error: gastosError } = await supabase
    .from("gastos")
    .select(
      `
        id,
        concepto,
        tipo,
        fecha,
        importe,
        cierre_id,
        obras (
          direccion
        ),
        documentos (
          id,
          nombre,
          storage_path
        ),
        pago_gastos (
          pago_id
        )
      `,
    )
    .eq("empleado_id", empleadoId)
    .order("fecha", { ascending: false });

  if (gastosError) {
    console.error("Error obteniendo gastos del empleado:", gastosError);

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar el historial del empleado.
        </p>
      </main>
    );
  }

  const gastos = (gastosData ?? []) as unknown as Gasto[];

  // Generamos URLs temporales para los comprobantes.
  const gastosConComprobante = await Promise.all(
    gastos.map(async (gasto) => {
      const comprobante = gasto.documentos?.[0];

      if (!comprobante?.storage_path) {
        return {
          ...gasto,
          comprobanteUrl: null,
        };
      }

      const { data } = await supabase.storage
        .from("documentos")
        .createSignedUrl(comprobante.storage_path, 60 * 10);

      return {
        ...gasto,
        comprobanteUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const totalHistorico = gastos.reduce(
    (total, gasto) => total + Number(gasto.importe),
    0,
  );

  const totalPagado = gastos.reduce((total, gasto) => {
    const estaPagado = gasto.pago_gastos?.length > 0;

    return estaPagado ? total + Number(gasto.importe) : total;
  }, 0);

  const totalPendiente = totalHistorico - totalPagado;

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/proveedores"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver
        </Link>

        {/* Header */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">
              {empleado.nombre}
            </h1>

            {empleado.activo ? (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                Activo
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                Inactivo
              </span>
            )}
          </div>

          <p className="mt-2 text-gray-600">
            Historial de gastos asociados al empleado.
          </p>
        </div>

        {/* Resumen */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Resumen label="Total histórico" value={totalHistorico} />

          <Resumen label="Pagado" value={totalPagado} />

          <Resumen label="Pendiente" value={totalPendiente} />
        </div>

        {/* Historial */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Historial</h2>

          <p className="mt-1 text-sm text-gray-500">
            Sueldos y gastos registrados para este empleado.
          </p>
        </div>

        {gastosConComprobante.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay gastos
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              No hay gastos asociados a {empleado.nombre}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Fecha
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Obra
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Tipo
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Concepto
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Comprobante
                  </th>

                  <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                    Importe
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {gastosConComprobante.map((gasto) => {
                  const estaPagado = gasto.pago_gastos?.length > 0;

                  const pendienteDePago =
                    gasto.cierre_id !== null && !estaPagado;

                  return (
                    <tr key={gasto.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {formatDate(gasto.fecha)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {gasto.obras?.direccion ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatTipo(gasto.tipo)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {gasto.concepto}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {estaPagado ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            Pagado
                          </span>
                        ) : pendienteDePago ? (
                          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                            Pendiente de pago
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Pendiente de cierre
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {gasto.comprobanteUrl ? (
                          <a
                            href={gasto.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-700 hover:text-gray-950 hover:underline"
                          >
                            Ver comprobante
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(gasto.importe)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-4 text-right font-semibold text-gray-900"
                  >
                    Total histórico
                  </td>

                  <td className="px-5 py-4 text-right text-lg font-semibold text-gray-900">
                    {formatCurrency(totalHistorico)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function Resumen({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>

      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function formatTipo(tipo: string) {
  const tipos: Record<string, string> = {
    sueldo: "Sueldo",
    gasto_empleado: "Gasto de empleado",
    materiales: "Materiales",
    reintegro: "Reintegro",
    servicio: "Servicio",
    otro: "Otro",
  };

  return tipos[tipo] ?? tipo;
}

function formatDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR");
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}
