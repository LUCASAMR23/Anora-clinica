/* eslint-disable @next/next/no-img-element */
import { currentUser, dashboardData } from "@/app/clinic-data";
import { generatedAt, materialsForTrip, printableDate, reportStatus } from "../report";
import { PrintOnLoad } from "./print-on-load";

export const dynamic = "force-dynamic";

export default async function TripPrintReport() {
  const user = await currentUser();
  const data = await dashboardData(user);
  const clinicName = data.clinic?.name ?? "Anora Clínica";
  const timestamp = generatedAt();
  const active = data.trips.filter(({ trip }) => trip.status === "travel").length;

  return <main className="print-report">
    <PrintOnLoad />
    <header className="print-header">
      <div><img className="print-logo" src="/anora-logo.png" alt="Anora Clínica"/><p className="print-eyebrow">RELATÓRIO OPERACIONAL</p><h1>{clinicName}</h1><p>Malas, viagens e materiais sob responsabilidade</p></div>
      <div className="print-meta"><b>Emitido em</b><span>{timestamp}</span><b>Responsável pela emissão</b><span>{user.displayName}</span></div>
    </header>
    <section className="print-summary"><div><b>{data.trips.length}</b><span>viagens registradas</span></div><div><b>{active}</b><span>médicas em campo</span></div><div><b>{data.products.length}</b><span>materiais acompanhados</span></div></section>
    <section className="print-section"><h2>Viagens</h2>
      {!data.trips.length && <p>Nenhuma viagem cadastrada até o momento.</p>}
      {data.trips.map(({ trip, responsible, procedureName }) => {
        const materials = materialsForTrip(data, trip.id);
        return <article className="print-trip" key={trip.id}>
          <div className="print-trip-head"><div><h3>{trip.destination}</h3><p><b>{responsible}</b> · {printableDate(trip.departureDate)} a {printableDate(trip.returnDate)}</p>{procedureName && <p>Procedimento: <b>{procedureName}</b></p>}</div><span>{reportStatus(trip.status)}</span></div>
          {!materials.length ? <p className="print-muted">Materiais aguardando despacho.</p> : <table><thead><tr><th>Material</th><th>Lote</th><th>Levado</th><th>Retornou</th><th>Saldo atual na mala</th></tr></thead><tbody>{materials.map((item) => <tr key={`${item.product}-${item.lot}`}><td>{item.product}</td><td>{item.lot}</td><td>{item.sent} {item.unit}</td><td>{item.returned} {item.unit}</td><td>{item.current} {item.unit}</td></tr>)}</tbody></table>}
          {trip.status === "closed" && <p className="print-muted">Viagem conferida e concluída em estoque.</p>}
        </article>;
      })}
    </section>
    <footer className="print-footer">{clinicName} · Documento gerado pelo controle de estoque Anora Clínica · {timestamp}</footer>
  </main>;
}
