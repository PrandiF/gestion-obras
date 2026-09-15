import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const { data: categorias, error } = await supabase
    .from("categorias_proveedor")
    .select(
      `
      id,
      nombre,
      proveedor_categorias (
        proveedor_id
      )
    `,
    )
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error obteniendo categorías:", error);

    return (
      <main className="p-6 xl:p-8 xl:pt-0 pt-20 ">
        <p className="text-red-600">
          Ocurrió un error al cargar las categorías de proveedores.
        </p>
      </main>
    );
  }

  return (
    <main className="p-6 xl:p-8 xl:pt-0 pt-20 ">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Proveedores
            </h1>

            <p className="mt-2 text-gray-600">
              Seleccioná una categoría para consultar sus proveedores.
            </p>
          </div>

          <Link
            href="/proveedores/nuevo"
            className="rounded-lg bg-gray-900 px-4 py-2 xl:py-2.5 text-sm font-medium  text-white transition hover:bg-gray-800 xl:text-start text-center"
          >
            + Nuevo proveedor
          </Link>
        </div>

        {categorias.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h2 className="text-lg font-medium text-gray-900">
              No hay categorías
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Todavía no hay categorías de proveedores configuradas.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categorias.map((categoria) => {
              const cantidadProveedores =
                categoria.proveedor_categorias?.length ?? 0;

              return (
                <Link
                  key={categoria.id}
                  href={`/proveedores/categoria/${categoria.id}`}
                  className="group rounded-xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {categoria.nombre}
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {cantidadProveedores === 1
                          ? "1 proveedor"
                          : `${cantidadProveedores} proveedores`}
                      </p>
                    </div>

                    <span className="text-xl text-gray-400 transition group-hover:translate-x-1 group-hover:text-gray-900">
                      →
                    </span>
                  </div>

                  <p className="mt-6 text-sm font-medium text-gray-700">
                    Ver proveedores
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
