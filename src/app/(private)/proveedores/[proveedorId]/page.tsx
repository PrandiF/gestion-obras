import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    proveedorId: string;
  }>;
  searchParams: Promise<{
    categoria?: string;
  }>;
};

type Gasto = {
  id: string;
  fecha: string;
  concepto: string;
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

export default async function ProveedorDetallePage({
  params,
  searchParams,
}: Props) {
  const { proveedorId } = await params;
  const { categoria } = await searchParams;

  const supabase = await createClient();

  // =========================
  // PROVEEDOR
  // =========================

  const { data: proveedor, error: proveedorError } = await supabase
    .from("proveedores")
    .select(
      `
      id,
      nombre,
      cuit,
      tiene_cuenta_corriente,
      activo,
      proveedor_categorias (
        categorias_proveedor (
          id,
          nombre
        )
      )
    `,
    )
    .eq("id", proveedorId)
    .single();

  if (proveedorError || !proveedor) {
    notFound();
  }

  // =========================
  // GASTOS
  // =========================

  const { data, error: gastosError } = await supabase
    .from("gastos")
    .select(
      `
      id,
      fecha,
      concepto,
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
    .eq("proveedor_id", proveedorId)
    .order("fecha", { ascending: false });

  if (gastosError) {
    console.error("Error obteniendo gastos del proveedor:", gastosError);
  }

  const gastos = (data ?? []) as unknown as Gasto[];

  // =========================
  // COMPROBANTES
  // =========================

  const gastosConComprobante = await Promise.all(
    gastos.map(async (gasto) => {
      const comprobante = gasto.documentos?.[0];

      if (!comprobante) {
        return {
          ...gasto,
          comprobanteUrl: null,
        };
      }

      const { data: signedData } = await supabase.storage
        .from("documentos")
        .createSignedUrl(comprobante.storage_path, 60 * 10);

      return {
        ...gasto,
        comprobanteUrl: signedData?.signedUrl ?? null,
      };
    }),
  );

  // =========================
  // TOTALES
  // =========================

  const totalHistorico = gastos.reduce(
    (total, gasto) => total + Number(gasto.importe),
    0,
  );

  const totalPagado = gastos
    .filter((gasto) => gasto.pago_gastos?.length > 0)
    .reduce((total, gasto) => total + Number(gasto.importe), 0);

  const pendientePago = gastos
    .filter(
      (gasto) => gasto.cierre_id !== null && gasto.pago_gastos?.length === 0,
    )
    .reduce((total, gasto) => total + Number(gasto.importe), 0);

  // Normalizamos categorías porque Supabase puede tipar
  // la relación anidada como array.
  const categorias = proveedor.proveedor_categorias.flatMap((relacion) =>
    Array.isArray(relacion.categorias_proveedor)
      ? relacion.categorias_proveedor
      : relacion.categorias_proveedor
        ? [relacion.categorias_proveedor]
        : [],
  );

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}

        <div className="mb-8">
          <Link
            href={
              categoria ? `/proveedores/categoria/${categoria}` : "/proveedores"
            }
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a proveedores
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            {proveedor.nombre}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            {categorias.map((categoria) => (
              <span
                key={categoria.id}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {categoria.nombre}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-700">CUIT:</span>{" "}
              {proveedor.cuit || "—"}
            </p>

            <p>
              <span className="font-medium text-gray-700">
                Cuenta corriente:
              </span>{" "}
              {proveedor.tiene_cuenta_corriente ? "Sí" : "No"}
            </p>
          </div>
        </div>

        {/* RESUMEN */}

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Total histórico</p>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalHistorico)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Total pagado</p>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalPagado)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">
              Pendiente de pago
            </p>

            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatCurrency(pendientePago)}
            </p>
          </div>
        </div>

        {/* HISTORIAL */}

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Historial de gastos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {gastos.length === 1
              ? "1 gasto registrado con este proveedor."
              : `${gastos.length} gastos registrados con este proveedor.`}
          </p>
        </div>

        {gastosConComprobante.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">
              Todavía no hay gastos registrados con este proveedor.
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
                    Concepto
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Estado
                  </th>

                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-600">
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

                  const estaCerrado = gasto.cierre_id !== null;

                  return (
                    <tr key={gasto.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {new Date(`${gasto.fecha}T00:00:00`).toLocaleDateString(
                          "es-AR",
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {gasto.obras?.direccion || "—"}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {gasto.concepto}
                      </td>

                      <td className="px-5 py-4">
                        {estaPagado ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            Pagado
                          </span>
                        ) : estaCerrado ? (
                          <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
                            Pendiente de pago
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Pendiente de cierre
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        {gasto.comprobanteUrl ? (
                          <a
                            href={gasto.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
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
                    colSpan={5}
                    className="px-5 py-4 text-right text-sm font-semibold text-gray-700"
                  >
                    Total histórico
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900">
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

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}
