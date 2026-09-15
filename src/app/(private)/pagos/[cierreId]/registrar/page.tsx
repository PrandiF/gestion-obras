import RegistrarPagoForm from "../../../../../components/RegistrarPagoForm";

type Props = {
  params: Promise<{
    cierreId: string;
  }>;

  searchParams: Promise<{
    tipo?: string;
    destinatarioId?: string;
  }>;
};

export default async function RegistrarPagoPage({
  params,
  searchParams,
}: Props) {
  const { cierreId } = await params;
  const { tipo, destinatarioId } = await searchParams;

  return (
    <RegistrarPagoForm
      cierreId={cierreId}
      tipo={tipo ?? null}
      destinatarioId={destinatarioId ?? null}
    />
  );
}
