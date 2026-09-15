import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EliminarEntidadButton from "@/components/EliminarEntidadButton";

type Props = {
  params: Promise<{
    categoriaId: string;
  }>;
};

type Proveedor = {
  id: string;
  nombre: string;
  cuit: string | null;
  tiene_cuenta_corriente: boolean;
  activo: boolean;
};

type Empleado = {
  id: string;
  nombre: string;
  activo: boolean;
};

export default async function ProveedoresCategoriaPage({ params }: Props) {
  const { categoriaId } = await params;

  const supabase = await createClient();

  // Obtenemos la categoría.
  const { data: categoria, error: categoriaError } = await supabase
    .from("categorias_proveedor")
    .select("id, nombre")
    .eq("id", categoriaId)
    .single();

  if (categoriaError || !categoria) {
    notFound();
  }

  const esManoDeObra = categoria.nombre === "Mano de obra";

  // Obtenemos los proveedores relacionados con esta categoría.
  const { data: relaciones, error: proveedoresError } = await supabase
    .from("proveedor_categorias")
    .select(
      `
        proveedor_id,
        proveedores (
          id,
          nombre,
          cuit,
          tiene_cuenta_corriente,
          activo
        )
      `,
    )
    .eq("categoria_id", categoriaId);

  if (proveedoresError) {
    console.error(
      "Error obteniendo proveedores de la categoría:",
      proveedoresError,
    );

    return (
      <main className="p-8">
        <p className="text-red-600">
          Ocurrió un error al cargar los proveedores.
        </p>
      </main>
    );
  }

  // Si estamos en Mano de obra, también cargamos empleados.
  let empleados: Empleado[] = [];

  if (esManoDeObra) {
    const { data: empleadosData, error: empleadosError } = await supabase
      .from("empleados")
      .select("id, nombre, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (empleadosError) {
      console.error("Error obteniendo empleados:", empleadosError);
    } else {
      empleados = (empleadosData ?? []) as Empleado[];
    }
  }

  /*
   * Supabase puede inferir esta relación como array.
   * La normalizamos acá para trabajar siempre con un proveedor.
   */
  const proveedores: Proveedor[] = (relaciones ?? [])
    .map((relacion) => {
      const proveedor = Array.isArray(relacion.proveedores)
        ? relacion.proveedores[0]
        : relacion.proveedores;

      return proveedor as Proveedor | null;
    })
    .filter(
      (proveedor): proveedor is Proveedor =>
        proveedor !== null &&
        proveedor !== undefined &&
        proveedor.activo === true,
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/proveedores"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a categorías
          </Link>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                {categoria.nombre}
              </h1>

              <p className="mt-2 text-gray-600">
                {esManoDeObra
                  ? "Empleados y proveedores correspondientes a mano de obra."
                  : "Proveedores correspondientes a esta categoría."}
              </p>
            </div>

            <Link
              href="/proveedores/nuevo"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              + Nuevo proveedor
            </Link>
          </div>
        </div>

        {/* EMPLEADOS - solamente para Mano de obra */}
        {esManoDeObra && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Empleados
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Personal registrado como mano de obra.
                </p>
              </div>

              <Link
                href="/empleados/nuevo"
                className="text-sm font-medium text-gray-700 hover:text-gray-950"
              >
                + Nuevo empleado
              </Link>
            </div>

            {empleados.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-500">
                  No hay empleados activos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                        Empleado
                      </th>

                      <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {empleados.map((empleado) => (
                      <tr key={empleado.id}>
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {empleado.nombre}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-4">
                            <Link
                              href={`/empleados/${empleado.id}`}
                              className="text-sm font-medium text-gray-700 hover:text-gray-950"
                            >
                              Ver detalle
                            </Link>
                            <span className="text-gray-300">|</span>

                            <EliminarEntidadButton
                              id={empleado.id}
                              nombre={empleado.nombre}
                              tipo="empleado"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* PROVEEDORES */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {esManoDeObra ? "Proveedores / contratistas" : "Proveedores"}
            </h2>

            {esManoDeObra && (
              <p className="mt-1 text-sm text-gray-500">
                Proveedores externos asociados a mano de obra.
              </p>
            )}
          </div>

          {proveedores.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <h2 className="text-lg font-medium text-gray-900">
                No hay proveedores en {categoria.nombre}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Todavía no hay proveedores activos asociados a esta categoría.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      Proveedor
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      CUIT
                    </th>

                    <th className="px-5 py-3 text-left text-sm font-medium text-gray-600">
                      Cuenta corriente
                    </th>

                    <th className="px-5 py-3 text-right text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {proveedores.map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {proveedor.nombre}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {proveedor.cuit || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {proveedor.tiene_cuenta_corriente ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            Sí
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            No
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/proveedores/${proveedor.id}?categoria=${categoriaId}`}
                            className="text-sm font-medium text-gray-700 hover:text-gray-950"
                          >
                            Ver detalle
                          </Link>

                          <span className="text-gray-300">|</span>

                          <EliminarEntidadButton
                            id={proveedor.id}
                            nombre={proveedor.nombre}
                            tipo="proveedor"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
