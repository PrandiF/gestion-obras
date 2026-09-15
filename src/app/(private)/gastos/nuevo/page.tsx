import Link from "next/link";
import GastoForm from "@/components/GastoForm";

export default function NuevoGastoPage() {
  return (
    <main className="p-6 xl:p-8 xl:pt-0 pt-20 ">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/gastos"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a gastos
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Nuevo gasto
          </h1>

          <p className="mt-2 text-gray-600">
            Registrá un gasto asociado a una obra.
          </p>
        </div>

        <GastoForm modo="crear" />
      </div>
    </main>
  );
}
