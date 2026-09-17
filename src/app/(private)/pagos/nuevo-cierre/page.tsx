"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Gasto = {
  id: string;
  tipo: string;
  concepto: string;
  fecha: string;
  importe: number;

  proveedores: {
    nombre: string;
  } | null;

  empleados: {
    nombre: string;
  } | null;

  personas_reintegro: {
    nombre: string;
  } | null;
};

export default function NuevoCierrePage() {
  const router = useRouter();

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [gastos, setGastos] = useState<Gasto[]>([]);

  const [consultado, setConsultado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const [error, setError] = useState("");

  const buscarGastos = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setConsultado(false);

    if (!fechaDesde || !fechaHasta) {
      setError("Seleccioná ambas fechas.");
      return;
    }

    if (fechaHasta < fechaDesde) {
      setError("La fecha hasta no puede ser anterior a la fecha desde.");
      return;
    }

    setBuscando(true);

    const supabase = createClient();

    const { data, error: gastosError } = await supabase
      .from("gastos")
      .select(
        `
        id,
        tipo,
        concepto,
        fecha,
        importe,
        proveedores (
          nombre
        ),
        empleados (
          nombre
        ),
        personas_reintegro (
          nombre
        )
      `,
      )
      .gte("fecha", fechaDesde)
      .lte("fecha", fechaHasta)
      .is("cierre_id", null)
      .order("fecha", { ascending: true });

    if (gastosError) {
      console.error("Error buscando gastos:", gastosError);

      setError("No se pudieron obtener los gastos.");
      setBuscando(false);
      return;
    }

    setGastos((data ?? []) as unknown as Gasto[]);
    setConsultado(true);
    setBuscando(false);
  };

  const confirmarCierre = async () => {
    if (gastos.length === 0) {
      return;
    }

    setError("");
    setCerrando(true);

    const supabase = createClient();

    // 1. Creamos el cierre semanal
    const { data: cierre, error: cierreError } = await supabase
      .from("cierres_semanales")
      .insert({
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        fecha_pago: null,
        estado: "cerrado",
      })
      .select("id")
      .single();

    if (cierreError || !cierre) {
      console.error("Error creando cierre:", cierreError);

      setError("No se pudo crear el cierre semanal.");
      setCerrando(false);
      return;
    }

    const gastosIds = gastos.map((gasto) => gasto.id);

    // 2. Asociamos los gastos al cierre
    const { error: updateError } = await supabase
      .from("gastos")
      .update({
        cierre_id: cierre.id,
      })
      .in("id", gastosIds)
      .is("cierre_id", null);

    if (updateError) {
      console.error("Error asociando gastos al cierre:", updateError);

      // Si falla la asociación, eliminamos el cierre vacío.
      await supabase.from("cierres_semanales").delete().eq("id", cierre.id);

      setError("No se pudo completar el cierre semanal. Intentá nuevamente.");

      setCerrando(false);
      return;
    }

    router.push(`/pagos/${cierre.id}`);
    router.refresh();
  };

  const total = gastos.reduce(
    (acumulado, gasto) => acumulado + Number(gasto.importe),
    0,
  );

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/pagos"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a pagos
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Nuevo cierre semanal
          </h1>

          <p className="mt-2 text-gray-600">
            Seleccioná el período para revisar los gastos antes de cerrar la
            semana.
          </p>
        </div>

        <form
          onSubmit={buscarGastos}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Desde
              </label>

              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setConsultado(false);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Hasta
              </label>

              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setConsultado(false);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-gray-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={buscando}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {buscando ? "Buscando..." : "Revisar gastos"}
            </button>
          </div>
        </form>

        {consultado && (
          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Gastos incluidos
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Solo se muestran gastos que todavía no pertenecen a otro cierre.
              </p>
            </div>

            {gastos.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                <h3 className="font-medium text-gray-900">
                  No hay gastos pendientes
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  No encontramos gastos sin cerrar dentro del período
                  seleccionado.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                          Fecha
                        </th>

                        <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                          Destinatario
                        </th>

                        <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                          Tipo
                        </th>

                        <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                          Concepto
                        </th>

                        <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                          Importe
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {gastos.map((gasto) => {
                        const destinatario =
                          gasto.proveedores?.nombre ||
                          gasto.empleados?.nombre ||
                          gasto.personas_reintegro?.nombre ||
                          "Sin destinatario";

                        return (
                          <tr key={gasto.id}>
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                              {formatDate(gasto.fecha)}
                            </td>

                            <td className="px-5 py-4 text-sm font-medium text-gray-900">
                              {destinatario}
                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {formatTipo(gasto.tipo)}
                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {gasto.concepto}
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
                          colSpan={4}
                          className="px-5 py-4 text-right text-sm font-semibold text-gray-700"
                        >
                          Total del cierre
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-lg font-semibold text-gray-900">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5">
                  <div>
                    <p className="font-medium text-gray-900">
                      {gastos.length} {gastos.length === 1 ? "gasto" : "gastos"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Una vez confirmado, estos gastos quedarán asociados al
                      cierre semanal.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={confirmarCierre}
                    disabled={cerrando}
                    className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cerrando ? "Cerrando..." : "Confirmar cierre"}
                  </button>
                </div>
              </>
            )}
          </div>
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

function formatDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-AR");
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}
