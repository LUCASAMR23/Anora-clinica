import { currentUser, dashboardData } from "@/app/clinic-data";
import { generatedAt, htmlEscape, materialsForTrip, printableDate, reportStatus } from "../report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await currentUser(); const data = await dashboardData(user);
  const clinicName = data.clinic?.name ?? "Anora Clínica"; const timestamp = generatedAt();
  const trips = data.trips.map(({ trip, responsible, procedureName }) => {
    const materials = materialsForTrip(data, trip.id);
    const rows = materials.length ? materials.map((item) => `<tr><td>${htmlEscape(item.product)}</td><td>${htmlEscape(item.lot)}</td><td>${item.sent} ${htmlEscape(item.unit)}</td><td>${item.returned} ${htmlEscape(item.unit)}</td><td>${item.current} ${htmlEscape(item.unit)}</td></tr>`).join("") : "<tr><td colspan=\"5\">Materiais aguardando despacho.</td></tr>";
    return `<section><h2>${htmlEscape(trip.destination)} <small>${htmlEscape(reportStatus(trip.status))}</small></h2><p><b>${htmlEscape(responsible)}</b> · ${htmlEscape(printableDate(trip.departureDate))} a ${htmlEscape(printableDate(trip.returnDate))}${procedureName ? ` · Procedimento: <b>${htmlEscape(procedureName)}</b>` : ""}</p><table><thead><tr><th>Material</th><th>Lote</th><th>Levado</th><th>Retornou</th><th>Saldo na mala</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join("") || "<p>Nenhuma viagem cadastrada.</p>";
  const logoUrl = new URL("/anora-logo.png", request.url).href;
  const document = `<!doctype html><html><head><meta charset=\"utf-8\"><style>body{font:11pt Arial;color:#3f2b22;margin:36px}.logo{width:100px;height:auto;margin-bottom:8px}h1{margin:0;color:#573a2d}h2{border-bottom:1px solid #d8c2b1;padding-bottom:8px}small{font-size:9pt;background:#efe1d4;padding:4px 8px;border-radius:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e0d1c4;padding:8px;text-align:left}th{background:#f1e4d7}section{margin:24px 0}.meta{color:#765c4b}</style></head><body><img class=\"logo\" src=\"${htmlEscape(logoUrl)}\" alt=\"Anora Clínica\"><p class=\"meta\">RELATÓRIO OPERACIONAL · Emitido em ${htmlEscape(timestamp)} · Por ${htmlEscape(user.displayName)}</p><h1>${htmlEscape(clinicName)}</h1><p>Malas, viagens e materiais sob responsabilidade.</p>${trips}</body></html>`;
  return new Response(document, { headers: { "content-type": "application/msword; charset=utf-8", "content-disposition": `attachment; filename=\"relatorio-viagens-${new Date().toISOString().slice(0, 10)}.doc\"`, "cache-control": "no-store" } });
}
