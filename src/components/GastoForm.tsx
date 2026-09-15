"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Obra = {
  id: string;
  direccion: string;
};

type Proveedor = {
  id: string;
  nombre: string;
};

type Empleado = {
  id: string;
  nombre: string;
};

type PersonaReintegro = {
  id: string;
  nombre: string;
};

type TipoGasto =
  | "materiales"
  | "sueldo"
  | "gasto_empleado"
  | "reintegro"
  | "servicio"
  | "otro";

export type GastoInicial = {
  id: string;
  obra_id: string;
  tipo: TipoGasto;
  concepto: string;
  fecha: string;
  importe: number;
  proveedor_id: string | null;
  empleado_id: string | null;
  persona_reintegro_id: string | null;
  observaciones: string | null;
  cierre_id: string | null;

  documentos?: {
    id: string;
    nombre: string;
    storage_path: string;
  }[];
};

type Props = {
  modo: "crear" | "editar";
  gastoInicial?: GastoInicial;
};

export default function GastoForm({ modo, gastoInicial }: Props) {
  const router = useRouter();

  const [obras, setObras] = useState<Obra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [personasReintegro, setPersonasReintegro] = useState<
    PersonaReintegro[]
  >([]);

  const [obraId, setObraId] = useState(gastoInicial?.obra_id ?? "");

  const [tipo, setTipo] = useState<TipoGasto | "">(gastoInicial?.tipo ?? "");

  const [concepto, setConcepto] = useState(gastoInicial?.concepto ?? "");

  const [fecha, setFecha] = useState(gastoInicial?.fecha ?? "");

  const [importe, setImporte] = useState(
    gastoInicial ? String(gastoInicial.importe) : "",
  );

  const [proveedorId, setProveedorId] = useState(
    gastoInicial?.proveedor_id ?? "",
  );

  const [empleadoId, setEmpleadoId] = useState(gastoInicial?.empleado_id ?? "");

  const [personaReintegroId, setPersonaReintegroId] = useState(
    gastoInicial?.persona_reintegro_id ?? "",
  );

  const [observaciones, setObservaciones] = useState(
    gastoInicial?.observaciones ?? "",
  );

  const [archivo, setArchivo] = useState<File | null>(null);

  const [loadingData, setLoadingData] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const comprobanteActual = gastoInicial?.documentos?.[0] ?? null;

  useEffect(() => {
    const cargarDatos = async () => {
      const supabase = createClient();

      const [
        obrasResult,
        proveedoresResult,
        empleadosResult,
        personasReintegroResult,
      ] = await Promise.all([
        supabase
          .from("obras")
          .select("id, direccion")
          .eq("estado", "activa")
          .order("direccion"),

        supabase
          .from("proveedores")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("empleados")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("personas_reintegro")
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre"),
      ]);

      if (
        obrasResult.error ||
        proveedoresResult.error ||
        empleadosResult.error ||
        personasReintegroResult.error
      ) {
        console.error(
          obrasResult.error,
          proveedoresResult.error,
          empleadosResult.error,
          personasReintegroResult.error,
        );

        setError("Ocurrió un error al cargar los datos.");

        setLoadingData(false);
        return;
      }

      setObras(obrasResult.data ?? []);
      setProveedores(proveedoresResult.data ?? []);
      setEmpleados(empleadosResult.data ?? []);
      setPersonasReintegro(personasReintegroResult.data ?? []);

      setLoadingData(false);
    };

    cargarDatos();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const importeNumero = Number(importe);

    if (!importeNumero || importeNumero <= 0) {
      setError("Ingresá un importe válido.");
      setLoading(false);
      return;
    }

    if (!obraId || !tipo || !concepto || !fecha) {
      setError("Completá todos los campos obligatorios.");
      setLoading(false);
      return;
    }

    if (tipo === "materiales" && !proveedorId) {
      setError("Seleccioná un proveedor.");
      setLoading(false);
      return;
    }

    if ((tipo === "sueldo" || tipo === "gasto_empleado") && !empleadoId) {
      setError("Seleccioná un empleado.");
      setLoading(false);
      return;
    }

    if (tipo === "reintegro" && !personaReintegroId) {
      setError("Seleccioná la persona a reintegrar.");
      setLoading(false);
      return;
    }

    if (archivo && archivo.size > 20 * 1024 * 1024) {
      setError("El archivo no puede superar los 20 MB.");
      setLoading(false);
      return;
    }

    const datosGasto = {
      obra_id: obraId,
      tipo,
      concepto: concepto.trim(),
      fecha,
      importe: importeNumero,

      proveedor_id: tipo === "materiales" ? proveedorId : null,

      empleado_id:
        tipo === "sueldo" || tipo === "gasto_empleado" ? empleadoId : null,

      persona_reintegro_id: tipo === "reintegro" ? personaReintegroId : null,

      observaciones: observaciones.trim() || null,
    };

    let gastoId: string;

    // CREAR
    if (modo === "crear") {
      const { data: gasto, error: gastoError } = await supabase
        .from("gastos")
        .insert(datosGasto)
        .select("id")
        .single();

      if (gastoError || !gasto) {
        console.error(gastoError);
        setError("Ocurrió un error al registrar el gasto.");
        setLoading(false);
        return;
      }

      gastoId = gasto.id;
    }

    // EDITAR
    else {
      if (!gastoInicial) {
        setError("No se pudo identificar el gasto.");
        setLoading(false);
        return;
      }

      // Segunda protección contra editar
      // un gasto que ya fue cerrado.
      const { data: gastoActual } = await supabase
        .from("gastos")
        .select("cierre_id")
        .eq("id", gastoInicial.id)
        .single();

      if (!gastoActual || gastoActual.cierre_id !== null) {
        setError("Este gasto ya pertenece a un cierre y no puede editarse.");
        setLoading(false);
        return;
      }

      const { data: actualizado, error: updateError } = await supabase
        .from("gastos")
        .update(datosGasto)
        .eq("id", gastoInicial.id)
        .is("cierre_id", null)
        .select("id")
        .single();

      if (updateError || !actualizado) {
        console.error(updateError);
        setError("No se pudo actualizar el gasto.");
        setLoading(false);
        return;
      }

      gastoId = gastoInicial.id;
    }

    // Si seleccionaron un comprobante nuevo...
    if (archivo) {
      const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";

      const fileId = crypto.randomUUID();

      const storagePath =
        `${obraId}/comprobantes/${fileId}` + (extension ? `.${extension}` : "");

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(storagePath, archivo, {
          contentType: archivo.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);

        // Solo hacemos rollback del gasto
        // cuando estamos CREANDO.
        if (modo === "crear") {
          await supabase.from("gastos").delete().eq("id", gastoId);
        }

        setError("No se pudo subir el comprobante.");
        setLoading(false);
        return;
      }

      // Si estamos editando y ya había
      // comprobante, primero eliminamos
      // su registro.
      if (modo === "editar" && comprobanteActual) {
        const { error: deleteDocumentoError } = await supabase
          .from("documentos")
          .delete()
          .eq("id", comprobanteActual.id);

        if (deleteDocumentoError) {
          await supabase.storage.from("documentos").remove([storagePath]);

          setError("No se pudo reemplazar el comprobante anterior.");

          setLoading(false);
          return;
        }
      }

      const { error: documentoError } = await supabase
        .from("documentos")
        .insert({
          obra_id: obraId,
          gasto_id: gastoId,
          nombre: archivo.name,
          categoria: "comprobante",
          storage_path: storagePath,
          tipo_archivo: archivo.type || null,
        });

      if (documentoError) {
        console.error(documentoError);

        await supabase.storage.from("documentos").remove([storagePath]);

        if (modo === "crear") {
          await supabase.from("gastos").delete().eq("id", gastoId);
        }

        setError("No se pudo registrar el comprobante.");

        setLoading(false);
        return;
      }

      // Una vez registrado correctamente
      // el nuevo comprobante, eliminamos
      // el archivo físico anterior.
      if (modo === "editar" && comprobanteActual) {
        await supabase.storage
          .from("documentos")
          .remove([comprobanteActual.storage_path]);
      }
    }

    router.push("/gastos");
    router.refresh();
  };

  if (loadingData) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Obra *
        </label>

        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">Seleccionar obra</option>

          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.direccion}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Tipo de gasto *
        </label>

        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoGasto)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">Seleccionar tipo</option>
          <option value="materiales">Materiales</option>
          <option value="sueldo">Sueldo</option>
          <option value="gasto_empleado">Gasto de empleado</option>
          <option value="reintegro">Reintegro</option>
          <option value="servicio">Servicio</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      {tipo === "materiales" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Proveedor *
          </label>

          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="">Seleccionar proveedor</option>

            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {(tipo === "sueldo" || tipo === "gasto_empleado") && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Empleado *
          </label>

          <select
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="">Seleccionar empleado</option>

            {empleados.map((empleado) => (
              <option key={empleado.id} value={empleado.id}>
                {empleado.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {tipo === "reintegro" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Persona a reintegrar *
          </label>

          <select
            value={personaReintegroId}
            onChange={(e) => setPersonaReintegroId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="">Seleccionar persona</option>

            {personasReintegro.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Concepto *
        </label>

        <input
          type="text"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          required
          placeholder="Ej: Compra de cemento"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Fecha *
          </label>

          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Importe *
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            required
            placeholder="0"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Factura / comprobante
        </label>

        {modo === "editar" && comprobanteActual && (
          <div className="mb-3 rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">
              Comprobante actual
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {comprobanteActual.nombre}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Si seleccionás otro archivo, reemplazará al actual.
            </p>
          </div>
        )}

        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
        />

        <p className="mt-2 text-xs text-gray-500">
          PDF, JPG o PNG. Máximo 20 MB.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Observaciones
        </label>

        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Información adicional..."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <Link
          href="/gastos"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading
            ? modo === "crear"
              ? "Registrando..."
              : "Guardando..."
            : modo === "crear"
              ? "Registrar gasto"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
