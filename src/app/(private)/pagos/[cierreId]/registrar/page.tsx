import RegistrarPagoForm from "../../../../../components/RegistrarPagoForm";

type Props = {
  params: Promise<{
    cierreId: string;
  }>;

  searchParams: Promise<{
    tipo?: string;
    destinatarioId?: string;
    gastoId?: string;
  }>;
};

export default async function RegistrarPagoPage({
  params,
  searchParams,
}: Props) {
  const { cierreId } = await params;
  const { tipo, destinatarioId, gastoId } = await searchParams;

  return (
    <RegistrarPagoForm
      cierreId={cierreId}
      tipo={tipo ?? null}
      destinatarioId={destinatarioId ?? null}
      gastoId={gastoId ?? null}
    />
  );
}
