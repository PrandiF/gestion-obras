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

type Pago = {
  id: string;
  tipo_destinatario: "proveedor" | "empleado" | "persona_reintegro" | "otro";

  proveedor_id: string | null;
  empleado_id: string | null;
  persona_reintegro_id: string | null;

  importe: number;
  fecha_pago: string;
  medio_pago: string;
  comprobante_path: string | null;
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

  pago: Pago | null;
  comprobanteUrl: string | null;
};

export default async function CierrePage({ params }: Props) {
  const { cierreId } = await params;

  const supabase = await createClient();

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

  // Traemos los pagos que ya pertenecen a este cierre.
  const { data: pagosData, error: pagosError } = await supabase
    .from("pagos")
    .select(
      `
        id,
        tipo_destinatario,
        proveedor_id,
        empleado_id,
        persona_reintegro_id,
        importe,
        fecha_pago,
        medio_pago,
        comprobante_path
      `,
    )
    .eq("cierre_id", cierreId);

  if (pagosError) {
    console.error("Error obteniendo pagos:", pagosError);
  }

  const pagos = (pagosData ?? []) as unknown as Pago[];

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
        pago: null,
        comprobanteUrl: null,
      });
    }
  }

  let grupos = Array.from(gruposMap.values());

  // Asociamos cada pago con su grupo.
  grupos = grupos.map((grupo) => {
    const pago =
      pagos.find((pago) => {
        if (grupo.tipoDestinatario === "proveedor") {
          return (
            pago.tipo_destinatario === "proveedor" &&
            pago.proveedor_id === grupo.destinatarioId
          );
        }

        if (grupo.tipoDestinatario === "empleado") {
          return (
            pago.tipo_destinatario === "empleado" &&
            pago.empleado_id === grupo.destinatarioId
          );
        }

        if (grupo.tipoDestinatario === "persona_reintegro") {
          return (
            pago.tipo_destinatario === "persona_reintegro" &&
            pago.persona_reintegro_id === grupo.destinatarioId
          );
        }

        return pago.tipo_destinatario === "otro";
      }) ?? null;

    return {
      ...grupo,
      pago,
    };
  });

  // Creamos URLs temporales para comprobantes.
  grupos = await Promise.all(
    grupos.map(async (grupo) => {
      if (!grupo.pago?.comprobante_path) {
        return grupo;
      }

      const { data } = await supabase.storage
        .from("documentos")
        .createSignedUrl(grupo.pago.comprobante_path, 60 * 10);

      return {
        ...grupo,
        comprobanteUrl: data?.signedUrl ?? null,
      };
    }),
  );

  const totalCierre = grupos.reduce((total, grupo) => total + grupo.total, 0);

  const totalPagado = grupos.reduce(
    (total, grupo) => total + (grupo.pago ? Number(grupo.pago.importe) : 0),
    0,
  );

  const totalPendiente = totalCierre - totalPagado;

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/pagos"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a pagos
        </Link>

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

        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div
              key={grupo.key}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between gap-5 border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      {grupo.nombre}
                    </p>

                    {grupo.pago ? (
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Pagado ✓
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

                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>

                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(grupo.total)}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {grupo.gastos.map((gasto) => (
                  <div
                    key={gasto.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[120px_1fr_160px]"
                  >
                    <p className="text-sm text-gray-500">
                      {formatDate(gasto.fecha)}
                    </p>

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {gasto.concepto}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatTipo(gasto.tipo)}
                      </p>
                    </div>

                    <p className="text-right text-sm font-medium text-gray-900">
                      {formatCurrency(gasto.importe)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 px-5 py-4">
                {grupo.pago ? (
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-700">
                        Pago registrado
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(grupo.pago.fecha_pago)}
                        {" · "}
                        {formatMedioPago(grupo.pago.medio_pago)}
                      </p>
                    </div>

                    {grupo.comprobanteUrl && (
                      <a
                        href={grupo.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:underline"
                      >
                        Ver comprobante →
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Link
                      href={`/pagos/${cierre.id}/registrar?tipo=${grupo.tipoDestinatario}&destinatarioId=${grupo.destinatarioId ?? ""}`}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      Registrar pago
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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

function formatMedioPago(medio: string) {
  const medios: Record<string, string> = {
    transferencia: "Transferencia",
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    otro: "Otro",
  };

  return medios[medio] ?? medio;
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
