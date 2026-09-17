import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    cierreId: string;
  }>;
};

type Gasto = {
  id: string;
  tipo: string;
  concepto: string;
  fecha: string;
  importe: number;

  proveedores: {
    id: string;
    nombre: string;
  } | null;

  empleados: {
    id: string;
    nombre: string;
  } | null;

  personas_reintegro: {
    id: string;
    nombre: string;
  } | null;
};

type Cierre = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  fecha_pago: string | null;
  estado: "abierto" | "cerrado" | "pagado";
};

type Grupo = {
  key: string;

  tipoDestinatario: "proveedor" | "empleado" | "persona_reintegro" | "otro";

  destinatarioId: string | null;
  nombre: string;
  gastos: Gasto[];
  total: number;
};

export default async function CierrePage({ params }: Props) {
  const { cierreId } = await params;

  const supabase = await createClient();

  // =========================================================
  // CIERRE
  // =========================================================

  const { data: cierreData, error: cierreError } = await supabase
    .from("cierres_semanales")
    .select(
      `
        id,
        fecha_desde,
        fecha_hasta,
        fecha_pago,
        estado
      `,
    )
    .eq("id", cierreId)
    .single();

  if (cierreError || !cierreData) {
    notFound();
  }

  const cierre = cierreData as Cierre;

  // =========================================================
  // GASTOS DEL CIERRE
  // =========================================================

  const { data: gastosData, error: gastosError } = await supabase
    .from("gastos")
    .select(
      `
        id,
        tipo,
        concepto,
        fecha,
        importe,
        proveedores (
          id,
          nombre
        ),
        empleados (
          id,
          nombre
        ),
        personas_reintegro (
          id,
          nombre
        )
      `,
    )
    .eq("cierre_id", cierreId)
    .order("fecha", { ascending: true });

  if (gastosError) {
    console.error("Error obteniendo gastos:", gastosError);

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar los gastos del cierre.
        </p>
      </main>
    );
  }

  const gastos = (gastosData ?? []) as unknown as Gasto[];

  // =========================================================
  // GASTOS QUE YA TIENEN UN PAGO ASOCIADO
  // =========================================================
  //
  // Consultamos pago_gastos directamente.
  // Si el ID de un gasto aparece acá, consideramos ese gasto pagado.
  //

  const { data: relacionesPago, error: relacionesPagoError } = await supabase
    .from("pago_gastos")
    .select("gasto_id");

  if (relacionesPagoError) {
    console.error("Error obteniendo relaciones de pagos:", relacionesPagoError);
  }

  const gastosPagadosIds = new Set(
    (relacionesPago ?? []).map((relacion) => relacion.gasto_id),
  );

  const estaGastoPagado = (gastoId: string) => gastosPagadosIds.has(gastoId);

  // =========================================================
  // AGRUPAR GASTOS POR DESTINATARIO
  // =========================================================

  const gruposMap = new Map<string, Grupo>();

  for (const gasto of gastos) {
    let key: string;
    let nombre: string;
    let destinatarioId: string | null;
    let tipoDestinatario: Grupo["tipoDestinatario"];

    if (gasto.proveedores) {
      key = `proveedor-${gasto.proveedores.id}`;
      nombre = gasto.proveedores.nombre;
      destinatarioId = gasto.proveedores.id;
      tipoDestinatario = "proveedor";
    } else if (gasto.empleados) {
      key = `empleado-${gasto.empleados.id}`;
      nombre = gasto.empleados.nombre;
      destinatarioId = gasto.empleados.id;
      tipoDestinatario = "empleado";
    } else if (gasto.personas_reintegro) {
      key = `reintegro-${gasto.personas_reintegro.id}`;
      nombre = gasto.personas_reintegro.nombre;
      destinatarioId = gasto.personas_reintegro.id;
      tipoDestinatario = "persona_reintegro";
    } else {
      key = "otro";
      nombre = "Otros gastos";
      destinatarioId = null;
      tipoDestinatario = "otro";
    }

    const grupoExistente = gruposMap.get(key);

    if (grupoExistente) {
      grupoExistente.gastos.push(gasto);
      grupoExistente.total += Number(gasto.importe);
    } else {
      gruposMap.set(key, {
        key,
        tipoDestinatario,
        destinatarioId,
        nombre,
        gastos: [gasto],
        total: Number(gasto.importe),
      });
    }
  }

  const grupos = Array.from(gruposMap.values());

  // =========================================================
  // TOTALES GENERALES
  // =========================================================

  const totalCierre = gastos.reduce(
    (total, gasto) => total + Number(gasto.importe),
    0,
  );

  const totalPagado = gastos.reduce((total, gasto) => {
    if (estaGastoPagado(gasto.id)) {
      return total + Number(gasto.importe);
    }

    return total;
  }, 0);

  const totalPendiente = totalCierre - totalPagado;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/pagos"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a pagos
        </Link>

        {/* Encabezado */}
        <div className="mt-6 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">
              Cierre semanal
            </h1>

            <EstadoCierre estado={cierre.estado} />
          </div>

          <p className="mt-2 text-gray-600">
            {formatDate(cierre.fecha_desde)}
            {" → "}
            {formatDate(cierre.fecha_hasta)}
          </p>
        </div>

        {/* Resumen general */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Resumen label="Total del cierre" value={totalCierre} />

          <Resumen label="Pagado" value={totalPagado} />

          <Resumen label="Pendiente" value={totalPendiente} />
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Pagos</h2>

          <p className="mt-1 text-sm text-gray-500">
            Estado de los pagos correspondientes a este cierre.
          </p>
        </div>

        {/* Grupos */}
        <div className="space-y-4">
          {grupos.map((grupo) => {
            // Gastos pagados de este grupo
            const gastosPagados = grupo.gastos.filter((gasto) =>
              estaGastoPagado(gasto.id),
            );

            // Gastos pendientes de este grupo
            const gastosPendientes = grupo.gastos.filter(
              (gasto) => !estaGastoPagado(gasto.id),
            );

            // Estado general del grupo
            const grupoPagado = gastosPendientes.length === 0;

            const grupoParcial =
              gastosPagados.length > 0 && gastosPendientes.length > 0;

            // Totales del grupo
            const totalPagadoGrupo = gastosPagados.reduce(
              (total, gasto) => total + Number(gasto.importe),
              0,
            );

            const totalPendienteGrupo = gastosPendientes.reduce(
              (total, gasto) => total + Number(gasto.importe),
              0,
            );

            return (
              <div
                key={grupo.key}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                {/* Cabecera del grupo */}
                <div className="flex flex-wrap items-center justify-between gap-5 border-b border-gray-200 bg-gray-50 px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-gray-900">
                        {grupo.nombre}
                      </p>

                      {grupoPagado ? (
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                          Pagado ✓
                        </span>
                      ) : grupoParcial ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Pago parcial
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatTipoDestinatario(grupo.tipoDestinatario)}
                    </p>
                  </div>

                  {/* Totales del grupo */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Total {formatCurrency(grupo.total)}
                    </p>

                    <p className="mt-1 text-sm font-medium text-green-700">
                      Pagado {formatCurrency(totalPagadoGrupo)}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      Pendiente {formatCurrency(totalPendienteGrupo)}
                    </p>
                  </div>
                </div>

                {/* Gastos individuales */}
                <div className="divide-y divide-gray-100">
                  {grupo.gastos.map((gasto) => {
                    const estaPagado = estaGastoPagado(gasto.id);

                    return (
                      <div
                        key={gasto.id}
                        className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr_110px_140px_150px] sm:items-center"
                      >
                        {/* Fecha */}
                        <p className="text-sm text-gray-500">
                          {formatDate(gasto.fecha)}
                        </p>

                        {/* Concepto */}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {gasto.concepto}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatTipo(gasto.tipo)}
                          </p>
                        </div>

                        {/* Estado */}
                        <div className="sm:text-right">
                          {estaPagado ? (
                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              Pagado ✓
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                              Pendiente
                            </span>
                          )}
                        </div>

                        {/* Importe */}
                        <p className="text-sm font-medium text-gray-900 sm:text-right">
                          {formatCurrency(gasto.importe)}
                        </p>

                        {/* Acción */}
                        <div className="sm:text-right">
                          {!estaPagado ? (
                            <Link
                              href={`/pagos/${cierre.id}/registrar?tipo=${grupo.tipoDestinatario}&destinatarioId=${grupo.destinatarioId ?? ""}&gastoId=${gasto.id}`}
                              className="inline-flex whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              Registrar pago
                            </Link>
                          ) : (
                            <span className="text-xs font-medium text-green-700">
                              Pago registrado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Acción grupal */}
                <div className="border-t border-gray-200 px-5 py-4">
                  {gastosPendientes.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        {gastosPagados.length > 0 && (
                          <p className="text-sm font-medium text-green-700">
                            {gastosPagados.length}{" "}
                            {gastosPagados.length === 1
                              ? "gasto pagado"
                              : "gastos pagados"}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-gray-500">
                          Pendiente: {formatCurrency(totalPendienteGrupo)}
                        </p>
                      </div>

                      <Link
                        href={`/pagos/${cierre.id}/registrar?tipo=${grupo.tipoDestinatario}&destinatarioId=${grupo.destinatarioId ?? ""}`}
                        className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        Registrar todos los pendientes
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-green-700">
                        Todos los gastos están pagos ✓
                      </p>

                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(grupo.total)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sin gastos */}
        {grupos.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              Este cierre no tiene gastos asociados.
            </p>
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
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${estilos[estado]}`}
    >
      {labels[estado]}
    </span>
  );
}

function formatTipoDestinatario(tipo: Grupo["tipoDestinatario"]) {
  const tipos = {
    proveedor: "Proveedor",
    empleado: "Empleado",
    persona_reintegro: "Reintegro",
    otro: "Otro",
  };

  return tipos[tipo];
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
