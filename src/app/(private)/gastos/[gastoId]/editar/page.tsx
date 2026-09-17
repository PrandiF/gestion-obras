import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GastoForm, { type GastoInicial } from "@/components/GastoForm";

type Props = {
  params: Promise<{
    gastoId: string;
  }>;
};

export default async function EditarGastoPage({ params }: Props) {
  const { gastoId } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gastos")
    .select(
      `
      id,
      obra_id,
      tipo,
      concepto,
      fecha,
      importe,
      proveedor_id,
      empleado_id,
      persona_reintegro_id,
      observaciones,
      cierre_id,
      documentos (
        id,
        nombre,
        storage_path
      )
    `,
    )
    .eq("id", gastoId)
    .single();

  if (error || !data) {
    notFound();
  }

  // No permitimos ni siquiera abrir el editor
  // para un gasto que ya está cerrado.
  if (data.cierre_id !== null) {
    redirect("/gastos");
  }

  const gasto = data as unknown as GastoInicial;

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/gastos"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a gastos
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Editar gasto
          </h1>

          <p className="mt-2 text-gray-600">
            Modificá la información del gasto antes de incluirlo en un cierre
            semanal.
          </p>
        </div>

        <GastoForm modo="editar" gastoInicial={gasto} />
      </div>
    </main>
  );
}
