import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteGastosButton from "@/components/DeleteGastosButton";

type Gasto = {
  id: string;
  tipo: string;
  concepto: string;
  fecha: string;
  importe: number;
  observaciones: string | null;

  obras: {
    direccion: string;
  } | null;

  proveedores: {
    nombre: string;
  } | null;

  empleados: {
    nombre: string;
  } | null;

  personas_reintegro: {
    nombre: string;
  } | null;

  documentos: {
    id: string;
    nombre: string;
    storage_path: string;
  }[];
  cierre_id: string | null;
};

type Props = {
  searchParams: Promise<{
    tipo?: string;
  }>;
};

export default async function GastosPage({ searchParams }: Props) {
  const { tipo } = await searchParams;

  const supabase = await createClient();

  let query = supabase.from("gastos").select(`
    id,
    tipo,
    concepto,
    fecha,
    importe,
    observaciones,
    cierre_id,
    obras (
      direccion
    ),
    proveedores (
      nombre
    ),
    empleados (
      nombre
    ),
    personas_reintegro (
      nombre
    ),
    documentos (
      id,
      nombre,
      storage_path
    )
  `);

  if (
    tipo &&
    [
      "materiales",
      "sueldo",
      "gasto_empleado",
      "reintegro",
      "servicio",
      "otro",
    ].includes(tipo)
  ) {
    query = query.eq("tipo", tipo);
  }

  const { data, error } = await query.order("fecha", {
    ascending: false,
  });

  const gastos = (data ?? []) as unknown as Gasto[];

  const gastosConComprobantes = await Promise.all(
    gastos.map(async (gasto) => {
      const comprobante = gasto.documentos?.[0];

      if (!comprobante) {
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

  if (error) {
    console.error("Error obteniendo gastos:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">Ocurrió un error al cargar los gastos.</p>
      </main>
    );
  }

  return (
    <main className="p-6 xl:p-8 xl:pt-0 pt-20 ">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Gastos</h1>

            <p className="mt-2 text-gray-600">
              Consultá y registrá los gastos de las obras.
            </p>
          </div>

          <Link
            href="/gastos/nuevo"
            className="rounded-lg bg-gray-900 px-4 py-2 xl:py-2.5 text-sm font-medium  text-white transition hover:bg-gray-800 whitespace-nowrap"
          >
            + Nuevo gasto
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-gray-700">
            Filtrar por:
          </span>

          <Link
            href="/gastos"
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              !tipo
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todos
          </Link>

          {[
            { value: "materiales", label: "Materiales" },
            { value: "sueldo", label: "Sueldos" },
            {
              value: "gasto_empleado",
              label: "Gastos de empleados",
            },
            { value: "reintegro", label: "Reintegros" },
            { value: "servicio", label: "Servicios" },
            { value: "otro", label: "Otros" },
          ].map((opcion) => (
            <Link
              key={opcion.value}
              href={`/gastos?tipo=${opcion.value}`}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                tipo === opcion.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opcion.label}
            </Link>
          ))}
        </div>
        {gastos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900">
              {tipo ? "No hay gastos de este tipo" : "Todavía no hay gastos"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {tipo
                ? "Probá seleccionando otro tipo de gasto."
                : "Registrá el primer gasto para comenzar."}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {gastosConComprobantes.map((gasto) => {
                const asociado =
                  gasto.proveedores?.nombre ||
                  gasto.empleados?.nombre ||
                  gasto.personas_reintegro?.nombre ||
                  "—";

                return (
                  <div
                    key={gasto.id}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    {/* Encabezado */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {gasto.concepto}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(
                            `${gasto.fecha}T00:00:00`,
                          ).toLocaleDateString("es-AR")}
                        </p>
                      </div>

                      <p className="shrink-0 font-semibold text-gray-900">
                        {formatCurrency(gasto.importe)}
                      </p>
                    </div>

                    {/* Información */}
                    <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Obra</span>

                        <span className="text-right font-medium text-gray-800">
                          {gasto.obras?.direccion ?? "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Tipo</span>

                        <span className="text-right text-gray-800">
                          {formatTipo(gasto.tipo)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Asociado a</span>

                        <span className="text-right text-gray-800">
                          {asociado}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500">Comprobante</span>

                        {gasto.comprobanteUrl ? (
                          <a
                            href={gasto.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {gasto.cierre_id === null ? (
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/gastos/${gasto.id}/editar`}
                            className="text-sm font-medium text-gray-700 hover:text-gray-950"
                          >
                            Editar
                          </Link>

                          <span className="text-gray-300">|</span>

                          <DeleteGastosButton
                            gastoId={gasto.id}
                            documentos={gasto.documentos ?? []}
                          />
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-medium text-gray-400">
                            Gasto cerrado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                      Asociado a
                    </th>
                    <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                      Importe
                    </th>
                    <th className="px-5 py-3 text-center text-sm font-medium text-gray-600">
                      Comprobante
                    </th>
                    <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {gastosConComprobantes.map((gasto) => {
                    const asociado =
                      gasto.proveedores?.nombre ||
                      gasto.empleados?.nombre ||
                      gasto.personas_reintegro?.nombre ||
                      "—";

                    return (
                      <tr key={gasto.id}>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                          {new Date(
                            `${gasto.fecha}T00:00:00`,
                          ).toLocaleDateString("es-AR")}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {gasto.obras?.direccion ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatTipo(gasto.tipo)}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {gasto.concepto}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {asociado}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-gray-900">
                          {formatCurrency(gasto.importe)}
                        </td>
                        <td className="px-5 py-4 text-center text-sm">
                          {gasto.comprobanteUrl ? (
                            <a
                              href={gasto.comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              Ver
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {gasto.cierre_id === null ? (
                            <div className="flex justify-end gap-4">
                              <Link
                                href={`/gastos/${gasto.id}/editar`}
                                className="text-sm font-medium text-gray-700 hover:text-gray-950"
                              >
                                Editar
                              </Link>
                              |
                              <DeleteGastosButton
                                gastoId={gasto.id}
                                documentos={gasto.documentos ?? []}
                              />
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs font-medium text-gray-400">
                                Gasto cerrado
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function formatTipo(tipo: string) {
  const tipos: Record<string, string> = {
    materiales: "Materiales",
    sueldo: "Sueldo",
    gasto_empleado: "Gasto de empleado",
    reintegro: "Reintegro",
    servicio: "Servicio",
    otro: "Otro",
  };

  return tipos[tipo] ?? tipo;
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}
