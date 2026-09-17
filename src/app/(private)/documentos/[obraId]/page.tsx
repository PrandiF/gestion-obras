import Link from "next/link";
import { FileText, FolderOpen, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    obraId: string;
  }>;
};

export default async function DocumentosObraPage({ params }: Props) {
  const { obraId } = await params;

  const supabase = await createClient();

  const { data: obra, error } = await supabase
    .from("obras")
    .select("id, direccion")
    .eq("id", obraId)
    .single();

  if (error || !obra) {
    notFound();
  }

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/documentos"
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a obras
        </Link>

        <div className="mt-6 mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <FolderOpen className="h-4 w-4" />
            Archivos y documentos
          </div>

          <h1 className="text-3xl font-semibold text-gray-900">
            {obra.direccion}
          </h1>

          <p className="mt-2 text-gray-600">
            Consultá y administrá los archivos correspondientes a esta obra.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href={`/documentos/${obra.id}/comprobantes`}
            className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <Receipt className="h-6 w-6 text-gray-700" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Facturas y comprobantes
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Facturas y comprobantes asociados a los gastos registrados en esta
              obra.
            </p>

            <p className="mt-5 text-sm font-medium text-gray-700">
              Ver archivos →
            </p>
          </Link>

          <Link
            href={`/documentos/${obra.id}/documentacion`}
            className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
              <FileText className="h-6 w-6 text-gray-700" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Documentación
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Planos, contratos, presupuestos, permisos y otros documentos de la
              obra.
            </p>

            <p className="mt-5 text-sm font-medium text-gray-700">
              Ver documentos →
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
