import { currentUser, dashboardData, fromMilli } from "@/app/clinic-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser(); const data = await dashboardData(user);
  const lines = [`ANORA CLÍNICA — RELATÓRIO DE MALAS E VIAGENS`, `Gerado em ${new Date().toLocaleString("pt-BR")}`, ""];
  for (const { trip, responsible } of data.trips) {
    lines.push(`${trip.status === "travel" ? "EM CAMPO" : trip.status === "closed" ? "ENCERRADA" : "PLANEJAMENTO"} — ${responsible}`, `Destino: ${trip.destination}`, `Período: ${trip.departureDate} a ${trip.returnDate}`);
    const allocations = data.allocations.filter(({ allocation }) => allocation.tripId === trip.id);
    if (!allocations.length) lines.push("Materiais: aguardando despacho.");
    for (const { allocation, product, lot, balance } of allocations) lines.push(`• ${product.name} | lote ${lot.code} | levado: ${fromMilli(allocation.sentMilli)} ${product.unit} | saldo atual na mala: ${fromMilli(Number(balance))} ${product.unit}`);
    lines.push("");
  }
  if (!data.trips.length) lines.push("Nenhuma viagem cadastrada.");
  return new Response(lines.join("\r\n"), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="anora-viagens-${new Date().toISOString().slice(0, 10)}.txt"`, "cache-control": "no-store" } });
}
