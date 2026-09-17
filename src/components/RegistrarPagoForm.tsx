"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TipoDestinatario = "proveedor" | "empleado" | "persona_reintegro" | "otro";

type Gasto = {
  id: string;
  concepto: string;
  fecha: string;
  importe: number;
  tipo: string;

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

type Props = {
  cierreId: string;
  tipo: string | null;
  destinatarioId: string | null;
  gastoId: string | null;
};

export default function RegistrarPagoForm({
  cierreId,
  tipo: tipoParam,
  destinatarioId,
  gastoId,
}: Props) {
  const router = useRouter();

  const tipo = tipoParam as TipoDestinatario | null;

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [nombreDestinatario, setNombreDestinatario] = useState("");

  const [fechaPago, setFechaPago] = useState("");
  const [medioPago, setMedioPago] = useState("transferencia");

  const [archivo, setArchivo] = useState<File | null>(null);

  const [observaciones, setObservaciones] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // CARGAR GASTOS
  // =========================================================

  useEffect(() => {
    const cargarDatos = async () => {
      if (!tipo) {
        setError("No se pudo identificar el destinatario.");
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");

      const supabase = createClient();

      // -------------------------------------------------------
      // 1. Traemos los gastos del cierre
      // -------------------------------------------------------

      const { data, error: gastosError } = await supabase
        .from("gastos")
        .select(
          `
            id,
            concepto,
            fecha,
            importe,
            tipo,
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
        .order("fecha", {
          ascending: true,
        });

      if (gastosError) {
        console.error("Error cargando gastos:", gastosError);

        setError("No se pudieron cargar los gastos del pago.");

        setCargando(false);
        return;
      }

      const todos = (data ?? []) as unknown as Gasto[];

      // -------------------------------------------------------
      // 2. Traemos directamente los gastos ya pagados
      // -------------------------------------------------------
      //
      // No usamos el nested pago_gastos dentro de gastos.
      // Consultamos la tabla directamente para tener una
      // fuente de verdad clara.
      //

      const { data: relacionesPago, error: relacionesError } = await supabase
        .from("pago_gastos")
        .select("gasto_id");

      if (relacionesError) {
        console.error("Error cargando relaciones de pagos:", relacionesError);

        setError("No se pudo comprobar el estado de los pagos.");

        setCargando(false);
        return;
      }

      const gastosPagadosIds = new Set(
        (relacionesPago ?? []).map((relacion) => relacion.gasto_id),
      );

      // -------------------------------------------------------
      // 3. Filtrar gastos
      // -------------------------------------------------------

      const gastosFiltrados = todos.filter((gasto) => {
        const estaPagado = gastosPagadosIds.has(gasto.id);

        // -----------------------------------------------
        // PAGO INDIVIDUAL
        // -----------------------------------------------
        //
        // Si viene gastoId, solamente mostramos ese gasto.
        // Además comprobamos que todavía esté pendiente.
        //

        if (gastoId) {
          return gasto.id === gastoId && !estaPagado;
        }

        // -----------------------------------------------
        // PAGO GENERAL
        // -----------------------------------------------
        //
        // Nunca incluimos gastos que ya estén pagos.
        //

        if (estaPagado) {
          return false;
        }

        // Proveedor
        if (tipo === "proveedor") {
          return gasto.proveedores?.id === destinatarioId;
        }

        // Empleado
        if (tipo === "empleado") {
          return gasto.empleados?.id === destinatarioId;
        }

        // Reintegro
        if (tipo === "persona_reintegro") {
          return gasto.personas_reintegro?.id === destinatarioId;
        }

        // Otros gastos
        if (tipo === "otro") {
          return (
            !gasto.proveedores && !gasto.empleados && !gasto.personas_reintegro
          );
        }

        return false;
      });

      // -------------------------------------------------------
      // 4. Si no quedan gastos pendientes
      // -------------------------------------------------------

      if (gastosFiltrados.length === 0) {
        setGastos([]);

        setError(
          gastoId
            ? "Este gasto ya fue pagado o no se encuentra disponible."
            : "No hay gastos pendientes para registrar.",
        );

        setCargando(false);
        return;
      }

      setGastos(gastosFiltrados);

      // -------------------------------------------------------
      // 5. Nombre del destinatario
      // -------------------------------------------------------

      const primero = gastosFiltrados[0];

      if (tipo === "proveedor") {
        setNombreDestinatario(primero.proveedores?.nombre ?? "");
      } else if (tipo === "empleado") {
        setNombreDestinatario(primero.empleados?.nombre ?? "");
      } else if (tipo === "persona_reintegro") {
        setNombreDestinatario(primero.personas_reintegro?.nombre ?? "");
      } else {
        setNombreDestinatario("Otros gastos");
      }

      setCargando(false);
    };

    cargarDatos();
  }, [cierreId, destinatarioId, tipo, gastoId]);

  // =========================================================
  // TOTAL
  // =========================================================

  const total = gastos.reduce((acc, gasto) => acc + Number(gasto.importe), 0);

  // =========================================================
  // REGISTRAR PAGO
  // =========================================================

  const registrarPago = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!tipo) {
      setError("No se pudo identificar el destinatario.");
      return;
    }

    if (gastos.length === 0) {
      setError("No hay gastos pendientes para registrar.");
      return;
    }

    if (!fechaPago) {
      setError("Seleccioná la fecha de pago.");
      return;
    }

    if (archivo && archivo.size > 20 * 1024 * 1024) {
      setError("El comprobante no puede superar los 20 MB.");
      return;
    }

    setError("");
    setGuardando(true);

    const supabase = createClient();

    // ---------------------------------------------------------
    // COMPROBACIÓN FINAL
    // ---------------------------------------------------------
    //
    // Volvemos a consultar pago_gastos justo antes de insertar
    // para evitar intentar pagar dos veces un gasto.
    //

    const { data: relacionesActuales, error: relacionesActualesError } =
      await supabase.from("pago_gastos").select("gasto_id");

    if (relacionesActualesError) {
      console.error("Error comprobando pagos:", relacionesActualesError);

      setError("No se pudo comprobar el estado actual de los pagos.");

      setGuardando(false);
      return;
    }

    const gastosYaPagados = new Set(
      (relacionesActuales ?? []).map((relacion) => relacion.gasto_id),
    );

    const gastosAPagar = gastos.filter(
      (gasto) => !gastosYaPagados.has(gasto.id),
    );

    if (gastosAPagar.length === 0) {
      setError("Los gastos seleccionados ya fueron pagados.");

      setGuardando(false);
      return;
    }

    const totalAPagar = gastosAPagar.reduce(
      (acc, gasto) => acc + Number(gasto.importe),
      0,
    );

    // ---------------------------------------------------------
    // 1. CREAR PAGO
    // ---------------------------------------------------------

    const { data: pago, error: pagoError } = await supabase
      .from("pagos")
      .insert({
        cierre_id: cierreId,

        tipo_destinatario: tipo,

        proveedor_id: tipo === "proveedor" ? destinatarioId : null,

        empleado_id: tipo === "empleado" ? destinatarioId : null,

        persona_reintegro_id:
          tipo === "persona_reintegro" ? destinatarioId : null,

        destinatario: tipo === "otro" ? nombreDestinatario : null,

        importe: totalAPagar,

        fecha_pago: fechaPago,

        medio_pago: medioPago,

        comprobante_path: null,

        observaciones: observaciones.trim() || null,
      })
      .select("id")
      .single();

    if (pagoError || !pago) {
      console.error("Error creando pago:", pagoError);

      setError("No se pudo registrar el pago.");

      setGuardando(false);
      return;
    }

    let comprobantePath: string | null = null;

    // ---------------------------------------------------------
    // 2. SUBIR COMPROBANTE
    // ---------------------------------------------------------

    if (archivo) {
      const extension = archivo.name.split(".").pop()?.toLowerCase() || "file";

      comprobantePath =
        `pagos/${cierreId}/` + `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(comprobantePath, archivo);

      if (uploadError) {
        console.error("Error subiendo comprobante:", uploadError);

        // Rollback del pago
        await supabase.from("pagos").delete().eq("id", pago.id);

        setError("No se pudo subir el comprobante del pago.");

        setGuardando(false);
        return;
      }

      // Guardar path en pagos
      const { error: updatePagoError } = await supabase
        .from("pagos")
        .update({
          comprobante_path: comprobantePath,
        })
        .eq("id", pago.id);

      if (updatePagoError) {
        console.error("Error asociando comprobante:", updatePagoError);

        await supabase.storage.from("documentos").remove([comprobantePath]);

        await supabase.from("pagos").delete().eq("id", pago.id);

        setError("No se pudo asociar el comprobante al pago.");

        setGuardando(false);
        return;
      }
    }

    // ---------------------------------------------------------
    // 3. RELACIONAR PAGO CON LOS GASTOS
    // ---------------------------------------------------------

    const relaciones = gastosAPagar.map((gasto) => ({
      pago_id: pago.id,
      gasto_id: gasto.id,
    }));

    const { error: relacionesError } = await supabase
      .from("pago_gastos")
      .insert(relaciones);

    if (relacionesError) {
      console.error("Error relacionando gastos:", relacionesError);

      // Eliminar comprobante
      if (comprobantePath) {
        await supabase.storage.from("documentos").remove([comprobantePath]);
      }

      // Eliminar pago
      await supabase.from("pagos").delete().eq("id", pago.id);

      setError("No se pudieron asociar los gastos al pago.");

      setGuardando(false);
      return;
    }

    // El trigger de PostgreSQL comprueba
    // si todos los gastos del cierre están pagos.

    router.push(`/pagos/${cierreId}`);

    router.refresh();
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (cargando) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Cargando pago...</p>
      </main>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="p-6 pt-22 xl:p-8 xl:pt-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/pagos/${cierreId}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver al cierre
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            {gastoId ? "Registrar pago" : "Registrar pagos pendientes"}
          </h1>

          {nombreDestinatario && (
            <p className="mt-2 text-gray-600">{nombreDestinatario}</p>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {gastos.length > 0 && (
          <form onSubmit={registrarPago} className="space-y-6">
            {/* Gastos incluidos */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <h2 className="font-semibold text-gray-900">
                  {gastoId ? "Gasto incluido" : "Gastos pendientes incluidos"}
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {gastos.map((gasto) => (
                  <div
                    key={gasto.id}
                    className="flex items-center justify-between gap-5 px-5 py-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {gasto.concepto}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(gasto.fecha)} · {formatTipo(gasto.tipo)}
                      </p>
                    </div>

                    <p className="font-medium text-gray-900">
                      {formatCurrency(gasto.importe)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-4">
                <span className="font-semibold text-gray-900">Total</span>

                <span className="text-xl font-semibold text-gray-900">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Datos del pago */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Fecha */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Fecha de pago
                  </label>

                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-gray-500"
                  />
                </div>

                {/* Medio */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Medio de pago
                  </label>

                  <select
                    value={medioPago}
                    onChange={(e) => setMedioPago(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-gray-500"
                  >
                    <option value="transferencia">Transferencia</option>

                    <option value="efectivo">Efectivo</option>

                    <option value="tarjeta">Tarjeta</option>

                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              {/* Comprobante */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Comprobante
                </label>

                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600"
                />

                <p className="mt-2 text-xs text-gray-500">
                  PDF, JPG o PNG. Máximo 20 MB.
                </p>
              </div>

              {/* Observaciones */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Observaciones
                </label>

                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-gray-500"
                />
              </div>
            </div>

            {/* Botón */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando
                  ? "Registrando..."
                  : gastoId
                    ? "Registrar pago"
                    : "Registrar pagos pendientes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

// =========================================================
// HELPERS
// =========================================================

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
