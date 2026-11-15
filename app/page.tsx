import { addProduct, addTripItem, closeTrip, createTrip, dispatchTrip, inviteMember, receiveStock, recordUsage } from "./actions";
import { currentUser, dashboardData, fromMilli } from "./clinic-data";

const today = new Date().toISOString().slice(0, 10);
const tag: Record<string, string> = { planning: "Planejamento", travel: "Em campo", closed: "Encerrada", cancelled: "Cancelada" };

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  const data = await dashboardData(user);
  const canManage = user.role === "admin" || user.role === "manager";
  const activeTrips = data.trips.filter(({ trip }) => trip.status === "travel").length;
  const lowStock = data.products.filter(({ product, balance }) => Number(balance) <= product.minMilli).length;
  const allocationFor = (tripId: string) => data.allocations.filter(({ allocation }) => allocation.tripId === tripId);
  const itemFor = (tripId: string) => data.pendingItems.filter(({ item }) => item.tripId === tripId);

  return <main className="min-h-screen bg-[#f7f7f4] text-[#26342d]">
    <header className="border-b border-[#dce4dc] bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5">
      <div><p className="text-xs font-semibold uppercase tracking-[.22em] text-[#7b907f]">Anora Clínica</p><h1 className="text-xl font-semibold">{data.clinic?.name ?? "Minha Clínica"}</h1></div>
      <div className="text-right text-sm"><p className="font-medium">{user.displayName}</p><p className="text-[#66756a]">{user.role === "admin" ? "Administradora" : user.role === "manager" ? "Gestora" : user.role === "doctor" ? "Médica" : "Consulta"}</p></div>
    </div></header>
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold tracking-tight">Operação sob controle.</h2><p className="mt-1 text-[#66756a]">Estoque, malas e rastreabilidade em um só lugar.</p></div>
        <div className="flex gap-2"><a className="button secondary" href="/relatorios/estoque.xls">Exportar Excel</a><a className="button" href="/relatorios/viagens.txt">Relatório de viagens</a></div>
      </div>
      <section className="grid gap-4 sm:grid-cols-3"><Stat label="Materiais cadastrados" value={String(data.products.length)} note="controle por lote"/><Stat label="Médicas em campo" value={String(activeTrips)} note="malas em andamento"/><Stat label="Atenções no estoque" value={String(lowStock)} note="mínimo ou abaixo"/></section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <section className="card"><div className="section-head"><div><h3>Estoque por material</h3><p>Saldo disponível na clínica; cada movimentação fica registrada.</p></div></div>
          <div className="overflow-x-auto"><table><thead><tr><th>Material</th><th>Disponível</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>{data.products.map(({ product, balance }) => <tr key={product.id}><td><b>{product.name}</b><small>{product.category} · {product.unit}</small></td><td>{fromMilli(Number(balance))} {product.unit}</td><td>{fromMilli(product.minMilli)}</td><td><span className={Number(balance) <= product.minMilli ? "pill warn" : "pill"}>{Number(balance) <= product.minMilli ? "Repor" : "Em dia"}</span></td></tr>)}{!data.products.length && <tr><td colSpan={4}>Ainda não há materiais cadastrados.</td></tr>}</tbody></table></div>
          {canManage && <details className="form-box"><summary>+ Cadastrar material</summary><form action={addProduct} className="form-grid"><Input name="name" label="Material"/><Input name="category" label="Categoria"/><label>Unidade<select name="unit" defaultValue="un"><option>un</option><option>ml</option><option>U</option><option>par</option><option>g</option></select></label><Input name="minimum" label="Estoque mínimo" type="number" step="0.001" defaultValue="0"/><button className="button" type="submit">Salvar material</button></form></details>}
          {canManage && data.products.length > 0 && <details className="form-box"><summary>+ Registrar entrada de lote</summary><form action={receiveStock} className="form-grid"><label>Material<select name="productId">{data.products.map(({ product }) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><Input name="lotCode" label="Código do lote"/><Input name="expiryDate" label="Validade" type="date"/><Input name="quantity" label="Quantidade" type="number" step="0.001"/><Input name="supplier" label="Fornecedor (opcional)" required={false}/><button className="button" type="submit">Registrar entrada</button></form></details>}
        </section>
        <section className="card"><div className="section-head"><div><h3>Equipe e acesso</h3><p>Funções aplicadas pelo servidor.</p></div></div>
          <div className="space-y-2">{data.team.map(member => <div className="member" key={member.userId}><span>{member.displayName}</span><small>{member.role}</small></div>)}{data.invitations.map(member => <div className="member muted" key={member.email}><span>{member.displayName}<small>{member.email}</small></span><small>convite: {member.role}</small></div>)}</div>
          {user.role === "admin" && <details className="form-box"><summary>+ Preparar acesso da equipe</summary><form action={inviteMember} className="form-grid"><Input name="displayName" label="Nome"/><Input name="email" label="E-mail" type="email"/><label>Função<select name="role"><option value="doctor">Médica</option><option value="manager">Gestora</option><option value="viewer">Consulta</option><option value="admin">Administradora</option></select></label><button className="button" type="submit">Preparar convite</button></form><p className="hint">Depois, a administradora libera o mesmo e-mail no acesso privado do site.</p></details>}
        </section>
      </div>

      <section className="mt-8 card"><div className="section-head"><div><h3>Malas e viagens</h3><p>Planeje, despache por lote, registre consumo e confira o retorno.</p></div></div>
        {canManage && <details className="form-box"><summary>+ Nova viagem</summary><form action={createTrip} className="form-grid"><Input name="destination" label="Destino"/><label>Responsável<select name="responsibleId">{data.team.filter(x => ["admin", "manager", "doctor"].includes(x.role)).map(x => <option key={x.userId} value={x.userId}>{x.displayName}</option>)}</select></label><Input name="departureDate" label="Saída" type="date" defaultValue={today}/><Input name="returnDate" label="Retorno" type="date" defaultValue={today}/><button className="button" type="submit">Criar planejamento</button></form></details>}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">{data.trips.map(({ trip, responsible }) => <article key={trip.id} className="trip"><div className="flex items-start justify-between gap-3"><div><h4>{trip.destination}</h4><p>{responsible} · {trip.departureDate} a {trip.returnDate}</p></div><span className={`pill ${trip.status === "travel" ? "live" : ""}`}>{tag[trip.status]}</span></div>
          {trip.status === "planning" && canManage && <><form action={addTripItem} className="compact"><input name="tripId" value={trip.id} readOnly hidden/><select name="productId">{data.products.map(({ product }) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input name="quantity" type="number" min="0.001" step="0.001" placeholder="Quantidade" required/><button className="button secondary">Adicionar</button></form><ul className="lines">{itemFor(trip.id).map(({ item, product }) => <li key={item.id}>{product.name}<b>{fromMilli(item.plannedMilli)} {product.unit}</b></li>)}</ul><form action={dispatchTrip}><input name="tripId" value={trip.id} readOnly hidden/><button className="button" type="submit">Conferir e despachar mala</button></form></>}
          {trip.status === "travel" && <div className="space-y-3">{allocationFor(trip.id).map(({ allocation, lot, product, balance }) => <div className="allocation" key={allocation.id}><div><b>{product.name}</b><small>Lote {lot.code} · saldo {fromMilli(Number(balance))} {product.unit}</small></div>{(canManage || trip.responsibleId === user.userId) && <form action={recordUsage} className="compact"><input name="tripId" value={trip.id} readOnly hidden/><input name="allocationId" value={allocation.id} readOnly hidden/><input name="quantity" type="number" min="0.001" step="0.001" placeholder="Uso" required/><input name="reason" placeholder="Procedimento/motivo" required/><button className="button secondary">Registrar</button></form>}</div>)}
            {canManage && <details className="form-box"><summary>Conferir retorno e encerrar</summary><form action={closeTrip} className="form-grid"><input name="tripId" value={trip.id} readOnly hidden/>{allocationFor(trip.id).map(({ allocation, lot, product, balance }) => <label key={allocation.id}>{product.name} · lote {lot.code}<input name={`return_${allocation.id}`} type="number" min="0" max={Number(balance) / 1000} step="0.001" defaultValue={Number(balance) / 1000}/><input name={`reason_${allocation.id}`} placeholder="Motivo, se houver diferença"/></label>)}<button className="button" type="submit">Encerrar viagem</button></form></details>}</div>}
          {trip.status === "closed" && <p className="closed-note">Viagem conferida e estoque reconciliado.</p>}
        </article>)}{!data.trips.length && <p className="empty">A primeira viagem aparecerá aqui.</p>}</div>
      </section>

      <section className="mt-8 card"><div className="section-head"><div><h3>Últimas movimentações</h3><p>Livro de estoque: os lançamentos não podem ser editados nem apagados.</p></div></div><div className="overflow-x-auto"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Material / lote</th><th>Quantidade</th><th>Observação</th></tr></thead><tbody>{data.ledger.map(({ movement, product, lot, trip }) => <tr key={movement.id}><td>{movement.createdAt.toLocaleString("pt-BR")}</td><td>{movement.type}</td><td>{product.name}<small>{lot.code}{trip ? ` · ${trip.destination}` : ""}</small></td><td>{fromMilli(Math.abs(movement.deltaMilli))} {product.unit}</td><td>{movement.reason ?? "—"}</td></tr>)}</tbody></table></div></section>
    </div>
  </main>;
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <div className="stat"><p>{label}</p><strong>{value}</strong><small>{note}</small></div>; }
function Input({ name, label, type = "text", required = true, defaultValue, step }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string; step?: string }) { return <label>{label}<input name={name} type={type} required={required} defaultValue={defaultValue} step={step}/></label>; }
