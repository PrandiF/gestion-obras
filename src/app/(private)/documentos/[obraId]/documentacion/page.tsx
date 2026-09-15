import Link from "next/link";
import {
  FileText,
  FileSignature,
  Calculator,
  BadgeCheck,
  Wrench,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    obraId: string;
  }>;
};

type Documento = {
  id: string;
  categoria:
    | "plano"
    | "contrato"
    | "presupuesto"
    | "permiso"
    | "servicio"
    | "otro";
};

const categorias = [
  {
    value: "plano",
    label: "Planos",
    description: "Planos y documentación técnica de la obra.",
    icon: FileText,
  },
  {
    value: "contrato",
    label: "Contratos",
    description: "Contratos y acuerdos relacionados con la obra.",
    icon: FileSignature,
  },
  {
    value: "presupuesto",
    label: "Presupuestos",
    description: "Presupuestos generales y propuestas recibidas.",
    icon: Calculator,
  },
  {
    value: "permiso",
    label: "Permisos / habilitaciones",
    description: "Permisos, habilitaciones y documentación administrativa.",
    icon: BadgeCheck,
  },
  {
    value: "servicio",
    label: "Servicios",
    description: "Documentación relacionada con servicios de la obra.",
    icon: Wrench,
  },
  {
    value: "otro",
    label: "Otros documentos",
    description: "Archivos que no correspondan a otra categoría.",
    icon: FolderOpen,
  },
] as const;

export default async function DocumentacionPage({ params }: Props) {
  const { obraId } = await params;

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
    .select("id, categoria")
    .eq("obra_id", obraId)
    .neq("categoria", "comprobante");

  if (error) {
    console.error("Error obteniendo documentos:", error);

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar la documentación.
        </p>
      </main>
    );
  }

  const documentos = (data ?? []) as Documento[];

  return (
    <main className="p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/documentos/${obra.id}`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a {obra.direccion}
        </Link>

        <div className="mt-6 mb-8 flex items-start justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <FolderOpen className="h-4 w-4" />
              {obra.direccion}
            </div>

            <h1 className="text-3xl font-semibold text-gray-900">
              Documentación
            </h1>

            <p className="mt-2 text-gray-600">
              Planos, contratos, presupuestos y otros archivos de la obra.
            </p>
          </div>

          <Link
            href={`/documentos/${obra.id}/documentacion/nuevo`}
            className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            + Subir documento
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((categoria) => {
            const Icon = categoria.icon;

            const cantidad = documentos.filter(
              (documento) => documento.categoria === categoria.value,
            ).length;

            return (
              <Link
                key={categoria.value}
                href={`/documentos/${obra.id}/documentacion/${categoria.value}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
                    <Icon className="h-5 w-5 text-gray-700" />
                  </div>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {cantidad} {cantidad === 1 ? "archivo" : "archivos"}
                  </span>
                </div>

                <h2 className="font-semibold text-gray-900">
                  {categoria.label}
                </h2>

                <p className="mt-2 text-sm leading-5 text-gray-500">
                  {categoria.description}
                </p>

                <p className="mt-5 text-sm font-medium text-gray-700">
                  Abrir carpeta →
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
