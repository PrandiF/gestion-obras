import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    obraId: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

type Documento = {
  id: string;
  nombre: string;
  storage_path: string;
  tipo_archivo: string | null;

  gastos: {
    fecha: string;
    concepto: string;
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
  } | null;
};

export default async function ComprobantesPage({
  params,
  searchParams,
}: Props) {
  const { obraId } = await params;
  const { page } = await searchParams;

  const ITEMS_PER_PAGE = 10;

  const parsedPage = Number(page);
  const requestedPage =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const supabase = await createClient();

  // Obtenemos la obra
  const { data: obra, error: obraError } = await supabase
    .from("obras")
    .select("id, direccion")
    .eq("id", obraId)
    .single();

  if (obraError || !obra) {
    notFound();
  }

  // Obtenemos los comprobantes de esta obra
  const { data, error } = await supabase
    .from("documentos")
    .select(
      `
      id,
      nombre,
      storage_path,
      tipo_archivo,
      gastos (
        fecha,
        concepto,
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
      )
    `,
    )
    .eq("obra_id", obraId)
    .eq("categoria", "comprobante");

  if (error) {
    console.error("Error obteniendo comprobantes:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar los comprobantes.
        </p>
      </main>
    );
  }

  const documentos = (data ?? []) as unknown as Documento[];

  // Ordenamos por la fecha del gasto:
  // más antiguo -> más reciente.
  const documentosOrdenados = [...documentos].sort((a, b) => {
    const fechaA = a.gastos?.fecha ?? "";
    const fechaB = b.gastos?.fecha ?? "";

    return fechaA.localeCompare(fechaB);
  });

  const totalDocumentos = documentosOrdenados.length;

  const totalPages = Math.ceil(totalDocumentos / ITEMS_PER_PAGE);

  const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));

  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE;

  const documentosPaginados = documentosOrdenados.slice(from, to);

  const getPageUrl = (pageNumber: number) =>
    `/documentos/${obraId}/comprobantes?page=${pageNumber}`;

  // Generamos una URL temporal para cada archivo.
  const comprobantes = await Promise.all(
    documentosPaginados.map(async (documento) => {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("documentos")
        .createSignedUrl(documento.storage_path, 60 * 10);

      if (signedError) {
        console.error(
          `Error generando URL para ${documento.nombre}:`,
          signedError,
        );
      }

      return {
        ...documento,
        archivoUrl: signedData?.signedUrl ?? null,
      };
    }),
  );

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/documentos/${obra.id}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a {obra.direccion}
        </Link>

        <div className="mt-6 mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <FolderOpen className="h-4 w-4" />
            {obra.direccion}
          </div>

          <h1 className="text-3xl font-semibold text-gray-900">
            Facturas y comprobantes
          </h1>

          <p className="mt-2 text-gray-600">
            Comprobantes asociados a los gastos registrados en esta obra.
          </p>
        </div>

        {comprobantes.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-gray-400" />

            <h2 className="text-lg font-medium text-gray-900">
              Todavía no hay comprobantes
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Los comprobantes adjuntados al registrar gastos aparecerán
              automáticamente acá.
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
                    Proveedor / asociado
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Concepto
                  </th>

                  <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                    Importe
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Archivo
                  </th>

                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-600">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {comprobantes.map((documento) => {
                  const gasto = documento.gastos;

                  const asociado =
                    gasto?.proveedores?.nombre ||
                    gasto?.empleados?.nombre ||
                    gasto?.personas_reintegro?.nombre ||
                    "—";

                  return (
                    <tr key={documento.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {gasto?.fecha
                          ? new Date(
                              `${gasto.fecha}T00:00:00`,
                            ).toLocaleDateString("es-AR")
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {asociado}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {gasto?.concepto ?? "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-gray-900">
                        {gasto ? formatCurrency(gasto.importe) : "—"}
                      </td>

                      <td className="max-w-60 px-5 py-4 text-sm text-gray-600">
                        <span
                          className="block truncate"
                          title={documento.nombre}
                        >
                          {documento.nombre}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center text-sm">
                        {documento.archivoUrl ? (
                          <a
                            href={documento.archivoUrl}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Mostrando {from + 1}–{Math.min(to, totalDocumentos)} de{" "}
              {totalDocumentos} comprobantes
            </p>

            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={getPageUrl(currentPage - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (pageNumber) =>
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    Math.abs(pageNumber - currentPage) <= 1,
                )
                .map((pageNumber) => (
                  <Link
                    key={pageNumber}
                    href={getPageUrl(pageNumber)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      currentPage === pageNumber
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                ))}

              {currentPage < totalPages && (
                <Link
                  href={getPageUrl(currentPage + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Siguiente
                </Link>
              )}
            </div>
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
