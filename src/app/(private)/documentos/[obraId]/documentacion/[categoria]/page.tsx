import Link from "next/link";
import { FileText, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EliminarDocumentoButton from "@/components/DeleteDocumentoButton";

type Props = {
  params: Promise<{
    obraId: string;
    categoria: string;
  }>;
};

type Documento = {
  id: string;
  nombre: string;
  storage_path: string;
  tipo_archivo: string | null;
  observaciones: string | null;
  created_at: string;
};

const categorias: Record<
  string,
  {
    label: string;
    description: string;
  }
> = {
  plano: {
    label: "Planos",
    description: "Planos y documentación técnica de la obra.",
  },
  contrato: {
    label: "Contratos",
    description: "Contratos y acuerdos relacionados con la obra.",
  },
  presupuesto: {
    label: "Presupuestos",
    description: "Presupuestos generales y propuestas recibidas.",
  },
  permiso: {
    label: "Permisos / habilitaciones",
    description: "Permisos, habilitaciones y documentación administrativa.",
  },
  servicio: {
    label: "Servicios",
    description: "Documentación relacionada con servicios de la obra.",
  },
  otro: {
    label: "Otros documentos",
    description: "Archivos que no correspondan a otra categoría.",
  },
};

export default async function CategoriaDocumentosPage({ params }: Props) {
  const { obraId, categoria } = await params;

  const categoriaActual = categorias[categoria];

  if (!categoriaActual) {
    notFound();
  }

  const supabase = await createClient();

  const { data: obra, error: obraError } = await supabase
    .from("obras")
    .select("id, direccion")
    .eq("id", obraId)
    .single();

  if (obraError || !obra) {
    notFound();
  }

  const { data, error } = await supabase
    .from("documentos")
    .select(
      `
      id,
      nombre,
      storage_path,
      tipo_archivo,
      observaciones,
      created_at
    `,
    )
    .eq("obra_id", obraId)
    .eq("categoria", categoria)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error obteniendo documentos:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar los documentos.
        </p>
      </main>
    );
  }

  const documentos = (data ?? []) as Documento[];

  const documentosConUrl = await Promise.all(
    documentos.map(async (documento) => {
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
          href={`/documentos/${obra.id}/documentacion`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a documentación
        </Link>

        <div className="mt-6 mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <FolderOpen className="h-4 w-4" />
              {obra.direccion}
            </div>

            <h1 className="text-3xl font-semibold text-gray-900">
              {categoriaActual.label}
            </h1>

            <p className="mt-2 text-gray-600">{categoriaActual.description}</p>
          </div>

          <Link
            href={`/documentos/${obra.id}/documentacion/nuevo?categoria=${categoria}`}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Subir documento
          </Link>
        </div>

        {documentosConUrl.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-gray-400" />

            <h2 className="text-lg font-medium text-gray-900">
              Esta carpeta está vacía
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Subí el primer documento de esta categoría.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Documento
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Observaciones
                  </th>

                  <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                    Fecha de carga
                  </th>

                  <th className="px-5 py-3 text-center text-sm font-medium text-gray-600">
                    Archivo
                  </th>
                  <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {documentosConUrl.map((documento) => (
                  <tr key={documento.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-gray-400" />

                        <div>
                          <p className="font-medium text-gray-900">
                            {documento.nombre}
                          </p>

                          {documento.tipo_archivo && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {formatTipoArchivo(documento.tipo_archivo)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="max-w-sm px-5 py-4 text-sm text-gray-600">
                      {documento.observaciones || "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                      {new Date(documento.created_at).toLocaleDateString(
                        "es-AR",
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {documento.archivoUrl ? (
                        <a
                          href={documento.archivoUrl}
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
                    <td className="px-5 py-4 text-right">
                      <EliminarDocumentoButton
                        documentoId={documento.id}
                        storagePath={documento.storage_path}
                        nombre={documento.nombre}
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

function formatTipoArchivo(tipo: string) {
  const tipos: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      "Excel",
  };

  return tipos[tipo] ?? tipo;
}
