"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type CategoriaProveedor = {
  id: string;
  nombre: string;
};

export default function NuevoProveedorPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [cuit, setCuit] = useState("");
  const [tieneCuentaCorriente, setTieneCuentaCorriente] = useState(false);

  const [categorias, setCategorias] = useState<CategoriaProveedor[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<
    string[]
  >([]);

  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarCategorias = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("categorias_proveedor")
        .select("id, nombre")
        .order("nombre");

      if (error) {
        console.error("Error cargando categorías:", error);
        setError("No se pudieron cargar las categorías.");
        setLoadingData(false);
        return;
      }

      setCategorias(data ?? []);
      setLoadingData(false);
    };

    cargarCategorias();
  }, []);

  const toggleCategoria = (categoriaId: string) => {
    setCategoriasSeleccionadas((actuales) => {
      if (actuales.includes(categoriaId)) {
        return actuales.filter((id) => id !== categoriaId);
      }

      return [...actuales, categoriaId];
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    if (categoriasSeleccionadas.length === 0) {
      setError("Seleccioná al menos una categoría.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // 1. Creamos el proveedor y obtenemos su ID.
    const { data: proveedor, error: proveedorError } = await supabase
      .from("proveedores")
      .insert({
        nombre: nombre.trim(),
        cuit: cuit.trim() || null,
        tiene_cuenta_corriente: tieneCuentaCorriente,
        activo: true,
      })
      .select("id")
      .single();

    if (proveedorError || !proveedor) {
      console.error("Error creando proveedor:", proveedorError);

      setError("Ocurrió un error al crear el proveedor.");
      setLoading(false);
      return;
    }

    // 2. Creamos las relaciones con las categorías seleccionadas.
    const relaciones = categoriasSeleccionadas.map((categoriaId) => ({
      proveedor_id: proveedor.id,
      categoria_id: categoriaId,
    }));

    const { error: categoriasError } = await supabase
      .from("proveedor_categorias")
      .insert(relaciones);

    if (categoriasError) {
      console.error(
        "Error asignando categorías al proveedor:",
        categoriasError,
      );

      // Si fallan las categorías, eliminamos el proveedor para
      // no dejar un registro incompleto.
      await supabase.from("proveedores").delete().eq("id", proveedor.id);

      setError(
        "No se pudieron asignar las categorías. El proveedor no fue creado.",
      );

      setLoading(false);
      return;
    }

    router.push("/proveedores");
    router.refresh();
  };

  if (loadingData) {
    return (
      <main className="p-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="p-6 xl:p-8 xl:pt-0 pt-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/proveedores"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Volver a proveedores
          </Link>

          <h1 className="mt-4 text-3xl font-semibold text-gray-900">
            Nuevo proveedor
          </h1>

          <p className="mt-2 text-gray-600">
            Cargá los datos principales del proveedor.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
        >
          <div>
            <label
              htmlFor="nombre"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nombre *
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Corralón San Martín"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="cuit"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              CUIT
            </label>

            <input
              id="cuit"
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="Ej: 30-12345678-9"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">
              Categorías *
            </p>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4">
              {categorias.map((categoria) => (
                <label
                  key={categoria.id}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={categoriasSeleccionadas.includes(categoria.id)}
                    onChange={() => toggleCategoria(categoria.id)}
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-gray-900">
                    {categoria.nombre}
                  </span>
                </label>
              ))}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Podés seleccionar más de una categoría.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={tieneCuentaCorriente}
                onChange={(e) => setTieneCuentaCorriente(e.target.checked)}
                className="mt-1 h-4 w-4"
              />

              <div>
                <p className="text-sm font-medium text-gray-900">
                  Tiene cuenta corriente
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Las compras realizadas a este proveedor pueden acumularse para
                  pagarse posteriormente.
                </p>
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Link
              href="/proveedores"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear proveedor"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
