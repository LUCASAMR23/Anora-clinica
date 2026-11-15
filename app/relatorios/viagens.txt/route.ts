import { currentUser, dashboardData } from "@/app/clinic-data";
import { generatedAt, materialsForTrip, printableDate, reportStatus } from "../report";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser(); const data = await dashboardData(user);
  const lines = [`${data.clinic?.name ?? "ANORA CLÍNICA"} — RELATÓRIO DE MALAS E VIAGENS`, `Emitido em: ${generatedAt()}`, `Emitido por: ${user.displayName}`, ""];
  for (const { trip, responsible } of data.trips) {
    lines.push(`${reportStatus(trip.status).toUpperCase()} — ${responsible}`, `Destino: ${trip.destination}`, `Período: ${printableDate(trip.departureDate)} a ${printableDate(trip.returnDate)}`);
    const materials = materialsForTrip(data, trip.id);
    if (!materials.length) lines.push("Materiais: aguardando despacho.");
    for (const item of materials) lines.push(`• ${item.product} | lote ${item.lot} | levado: ${item.sent} ${item.unit} | saldo na mala: ${item.current} ${item.unit}`);
    lines.push("");
  }
  if (!data.trips.length) lines.push("Nenhuma viagem cadastrada.");
  return new Response(lines.join("\r\n"), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename=\"relatorio-viagens-${new Date().toISOString().slice(0, 10)}.txt\"`, "cache-control": "no-store" } });
}
