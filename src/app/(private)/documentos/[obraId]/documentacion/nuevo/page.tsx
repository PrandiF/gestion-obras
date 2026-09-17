"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const categorias = [
  {
    value: "plano",
    label: "Planos",
  },
  {
    value: "contrato",
    label: "Contratos",
  },
  {
    value: "presupuesto",
    label: "Presupuestos",
  },
  {
    value: "permiso",
    label: "Permisos / habilitaciones",
  },
  {
    value: "servicio",
    label: "Servicios",
  },
  {
    value: "otro",
    label: "Otros documentos",
  },
];

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const obraId = params.obraId as string;
  const categoriaInicial = searchParams.get("categoria") ?? "";

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");

    if (!nombre.trim()) {
      setError("Ingresá un nombre para el documento.");
      return;
    }

    if (!categoria) {
      setError("Seleccioná una categoría.");
      return;
    }

    if (!archivo) {
      setError("Seleccioná un archivo.");
      return;
    }

    if (archivo.size > 20 * 1024 * 1024) {
      setError("El archivo no puede superar los 20 MB.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";

    const fileId = crypto.randomUUID();

    const storagePath =
      `${obraId}/${categoria}/${fileId}` + (extension ? `.${extension}` : "");

    // 1. Subimos el archivo a Storage
    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(storagePath, archivo, {
        contentType: archivo.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error subiendo documento:", uploadError);

      setError("No se pudo subir el archivo.");
      setLoading(false);
      return;
    }

    // 2. Registramos el documento en PostgreSQL
    const { error: documentoError } = await supabase.from("documentos").insert({
      obra_id: obraId,
      gasto_id: null,
      nombre: nombre.trim(),
      categoria,
      storage_path: storagePath,
      tipo_archivo: archivo.type || null,
      observaciones: observaciones.trim() || null,
    });

    if (documentoError) {
      console.error("Error registrando documento:", documentoError);

      // Si falla la DB, eliminamos el archivo de Storage
      // para no dejar archivos huérfanos.
      await supabase.storage.from("documentos").remove([storagePath]);

      setError("No se pudo registrar el documento.");
      setLoading(false);
      return;
    }

    router.push(`/documentos/${obraId}/documentacion/${categoria}`);

    router.refresh();
  };

  return (
    <main className="p-6 xl:px-8 xl:pt-6 pt-20 ">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/documentos/${obraId}/documentacion`}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          ← Volver a documentación
        </Link>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Subir documento
          </h1>

          <p className="mt-2 text-gray-600">
            Agregá un archivo a la documentación de la obra.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre del documento
              </label>

              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Plano eléctrico actualizado"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Categoría
              </label>

              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none transition focus:border-gray-500"
              >
                <option value="">Seleccionar categoría</option>

                {categorias.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Archivo
              </label>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center transition hover:border-gray-400 hover:bg-gray-50">
                <Upload className="mb-3 h-7 w-7 text-gray-400" />

                {archivo ? (
                  <>
                    <span className="text-sm font-medium text-gray-900">
                      {archivo.name}
                    </span>

                    <span className="mt-1 text-xs text-gray-500">
                      {(archivo.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-700">
                      Seleccionar archivo
                    </span>

                    <span className="mt-1 text-xs text-gray-500">
                      Máximo 20 MB
                    </span>
                  </>
                )}

                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Observaciones
                <span className="ml-1 font-normal text-gray-400">
                  (opcional)
                </span>
              </label>

              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                placeholder="Ej. Versión definitiva aprobada"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition focus:border-gray-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
              <Link
                href={`/documentos/${obraId}/documentacion`}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Subiendo..." : "Subir documento"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
