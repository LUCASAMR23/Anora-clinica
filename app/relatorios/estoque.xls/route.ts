import { currentUser, dashboardData, fromMilli } from "@/app/clinic-data";

export const dynamic = "force-dynamic";

const xml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (value: unknown) => `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`;
const row = (cells: unknown[]) => `<Row>${cells.map(cell).join("")}</Row>`;

export async function GET() {
  const user = await currentUser();
  const data = await dashboardData(user);
  const stock = [row(["Material", "Categoria", "Disponível", "Unidade", "Mínimo", "Situação"]), ...data.products.map(({ product, balance }) => row([product.name, product.category, fromMilli(Number(balance)), product.unit, fromMilli(product.minMilli), Number(balance) <= product.minMilli ? "Repor" : "Em dia"]))].join("");
  const ledger = [row(["Data", "Tipo", "Material", "Lote", "Quantidade", "Unidade", "Destino", "Observação"]), ...data.ledger.map(({ movement, product, lot, trip }) => row([movement.createdAt.toISOString(), movement.type, product.name, lot.code, fromMilli(Math.abs(movement.deltaMilli)), product.unit, trip?.destination ?? "", movement.reason ?? ""]))].join("");
  const content = `<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Estoque atual"><Table>${stock}</Table></Worksheet><Worksheet ss:Name="Movimentações"><Table>${ledger}</Table></Worksheet></Workbook>`;
  return new Response(content, { headers: { "content-type": "application/vnd.ms-excel; charset=utf-8", "content-disposition": `attachment; filename="anora-estoque-${new Date().toISOString().slice(0, 10)}.xls"`, "cache-control": "no-store" } });
}
