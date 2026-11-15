import "server-only";

import { dashboardData, fromMilli } from "@/app/clinic-data";

export type ReportData = Awaited<ReturnType<typeof dashboardData>>;

export const printableDate = (date: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(`${date}T12:00:00`));
export const generatedAt = () => new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
export const reportStatus = (status: string) => ({ planning: "Planejamento", travel: "Em campo", closed: "Concluída", cancelled: "Cancelada" }[status] ?? status);

export function materialsForTrip(data: ReportData, tripId: string) {
  return data.allocations.filter(({ allocation }) => allocation.tripId === tripId).map(({ allocation, product, lot, balance, returnedMilli }) => ({
    product: product.name,
    unit: product.unit,
    lot: lot.code,
    sent: fromMilli(allocation.sentMilli),
    current: fromMilli(Number(balance)),
    returned: fromMilli(Number(returnedMilli)),
  }));
}

export const htmlEscape = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
