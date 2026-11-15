"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { auditEvents, lots, memberInvites, members, products, stockMovements, tripAllocations, tripItems, trips } from "@/db/schema";
import { audit, currentUser, requireRole, toMilli } from "./clinic-data";

const id = () => crypto.randomUUID();
const stamp = () => new Date();
type BatchExecutor = { batch(queries: readonly unknown[]): Promise<unknown> };
const runBatch = (db: unknown, commands: readonly unknown[]) => (db as BatchExecutor).batch(commands);
const field = (form: FormData, name: string, max = 160) => {
  const value = String(form.get(name) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Confira o campo ${name}.`);
  return value;
};
const done = () => revalidatePath("/");

export async function addProduct(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]);
  const name = field(form, "name"), category = field(form, "category"), unit = field(form, "unit", 12);
  if (!new Set(["un", "ml", "U", "par", "g"]).has(unit)) throw new Error("Unidade inválida.");
  const productId = id();
  await getDb().batch([
    getDb().insert(products).values({ id: productId, clinicId: user.clinicId, name, category, unit, minMilli: toMilli(form.get("minimum"), "Estoque mínimo", true), active: true, createdAt: stamp() }),
    getDb().insert(auditEvents).values({ id: id(), clinicId: user.clinicId, actorId: user.userId, action: "product.create", entityType: "product", entityId: productId, detail: name, createdAt: stamp() }),
  ]);
  done();
}

export async function receiveStock(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]);
  const productId = field(form, "productId", 80), code = field(form, "lotCode", 80), expiryDate = field(form, "expiryDate", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new Error("Informe uma validade válida.");
  const quantity = toMilli(form.get("quantity"), "Quantidade recebida");
  const db = getDb();
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.clinicId, user.clinicId))).limit(1);
  if (!product) throw new Error("Material não encontrado.");
  let [lot] = await db.select().from(lots).where(and(eq(lots.productId, productId), eq(lots.code, code), eq(lots.clinicId, user.clinicId))).limit(1);
  const commands = [];
  if (!lot) { lot = { id: id(), clinicId: user.clinicId, productId, code, expiryDate, supplier: String(form.get("supplier") ?? "").trim() || null, createdAt: stamp() }; commands.push(db.insert(lots).values(lot)); }
  commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: lot.id, tripId: null, location: "clinic", type: "receipt", deltaMilli: quantity, reason: "Entrada de estoque", createdAt: stamp(), createdBy: user.userId }));
  await runBatch(db, commands); await audit(user, "stock.receipt", "lot", lot.id, `${product.name}: ${quantity}`); done();
}

export async function createTrip(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]);
  const destination = field(form, "destination"), responsibleId = field(form, "responsibleId", 80), departureDate = field(form, "departureDate", 10), returnDate = field(form, "returnDate", 10);
  if (returnDate < departureDate) throw new Error("A data de retorno deve ser posterior à saída.");
  const db = getDb(); const [responsible] = await db.select().from(members).where(and(eq(members.userId, responsibleId), eq(members.clinicId, user.clinicId), eq(members.active, true))).limit(1);
  if (!responsible) throw new Error("Profissional responsável inválida.");
  const tripId = id(); await db.insert(trips).values({ id: tripId, clinicId: user.clinicId, destination, responsibleId, departureDate, returnDate, status: "planning", createdAt: stamp(), closedAt: null });
  await audit(user, "trip.create", "trip", tripId, destination); done();
}

export async function inviteMember(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin"]);
  const email = field(form, "email", 254).toLowerCase(); const displayName = field(form, "displayName"); const role = field(form, "role", 16);
  if (!/^\S+@\S+\.\S+$/.test(email) || !new Set(["admin", "manager", "doctor", "viewer"]).has(role)) throw new Error("Convite inválido.");
  await getDb().insert(memberInvites).values({ email, clinicId: user.clinicId, displayName, role: role as "admin" | "manager" | "doctor" | "viewer", createdAt: stamp() }).onConflictDoUpdate({ target: memberInvites.email, set: { clinicId: user.clinicId, displayName, role: role as "admin" | "manager" | "doctor" | "viewer", createdAt: stamp() } });
  await audit(user, "member.invite", "member_invite", email, role); done();
}

export async function addTripItem(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]);
  const tripId = field(form, "tripId", 80), productId = field(form, "productId", 80), quantity = toMilli(form.get("quantity"), "Quantidade planejada"); const db = getDb();
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.clinicId, user.clinicId), eq(trips.status, "planning"))).limit(1);
  if (!trip) throw new Error("A mala não está disponível para planejamento.");
  await db.insert(tripItems).values({ id: id(), tripId, productId, plannedMilli: quantity }).onConflictDoUpdate({ target: [tripItems.tripId, tripItems.productId], set: { plannedMilli: quantity } });
  await audit(user, "trip.plan_item", "trip", tripId, productId); done();
}

/** Removes only a draft trip. Trips that have moved stock must remain as a traceable record. */
export async function deletePlanningTrip(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]);
  const tripId = field(form, "tripId", 80); const db = getDb();
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.clinicId, user.clinicId), eq(trips.status, "planning"))).limit(1);
  if (!trip) throw new Error("Somente planejamentos sem despacho podem ser excluídos.");
  await db.batch([
    db.delete(tripItems).where(eq(tripItems.tripId, tripId)),
    db.delete(trips).where(eq(trips.id, tripId)),
  ]);
  await audit(user, "trip.delete_draft", "trip", tripId, trip.destination); done();
}

export async function dispatchTrip(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]); const tripId = field(form, "tripId", 80); const db = getDb();
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.clinicId, user.clinicId), eq(trips.status, "planning"))).limit(1);
  if (!trip) throw new Error("Esta mala não pode ser despachada.");
  const items = await db.select().from(tripItems).where(eq(tripItems.tripId, tripId)); if (!items.length) throw new Error("Inclua materiais no planejamento antes do despacho.");
  const commands: unknown[] = [];
  for (const item of items) {
    const eligible = await db.select({ lot: lots, balance: sql<number>`coalesce(sum(case when ${stockMovements.location} = 'clinic' then ${stockMovements.deltaMilli} else 0 end), 0)` })
      .from(lots).leftJoin(stockMovements, eq(stockMovements.lotId, lots.id)).where(and(eq(lots.productId, item.productId), eq(lots.clinicId, user.clinicId), sql`${lots.expiryDate} >= ${trip.returnDate}`)).groupBy(lots.id).orderBy(asc(lots.expiryDate));
    let remaining = item.plannedMilli;
    for (const row of eligible) { const take = Math.min(Math.max(0, Number(row.balance)), remaining); if (!take) continue;
      const allocationId = id();
      commands.push(db.insert(tripAllocations).values({ id: allocationId, tripId, lotId: row.lot.id, productId: item.productId, sentMilli: take }));
      commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: row.lot.id, tripId: null, location: "clinic", type: "dispatch", deltaMilli: -take, reason: `Despacho: ${trip.destination}`, createdAt: stamp(), createdBy: user.userId }));
      commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: row.lot.id, tripId, location: "trip", type: "dispatch", deltaMilli: take, reason: `Mala: ${trip.destination}`, createdAt: stamp(), createdBy: user.userId })); remaining -= take;
    }
    if (remaining > 0) throw new Error("Estoque insuficiente ou lote com validade menor que o retorno.");
  }
  commands.push(db.update(trips).set({ status: "travel" }).where(eq(trips.id, tripId)));
  await runBatch(db, commands); await audit(user, "trip.dispatch", "trip", tripId, trip.destination); done();
}

export async function recordUsage(form: FormData) {
  const user = await currentUser(); const tripId = field(form, "tripId", 80), allocationId = field(form, "allocationId", 80), quantity = toMilli(form.get("quantity"), "Consumo");
  const db = getDb(); const [allocation] = await db.select({ allocation: tripAllocations, trip: trips }).from(tripAllocations).innerJoin(trips, eq(trips.id, tripAllocations.tripId)).where(and(eq(tripAllocations.id, allocationId), eq(tripAllocations.tripId, tripId), eq(trips.clinicId, user.clinicId), eq(trips.status, "travel"))).limit(1);
  if (!allocation || (user.role === "doctor" && allocation.trip.responsibleId !== user.userId)) throw new Error("Você não pode registrar consumo nesta mala.");
  await db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: allocation.allocation.lotId, tripId, location: "trip", type: "usage", deltaMilli: -quantity, reason: field(form, "reason", 500), createdAt: stamp(), createdBy: user.userId });
  await audit(user, "trip.usage", "trip", tripId, `${allocationId}: ${quantity}`); done();
}

export async function closeTrip(form: FormData) {
  const user = await currentUser(); requireRole(user, ["admin", "manager"]); const tripId = field(form, "tripId", 80); const db = getDb();
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.clinicId, user.clinicId), eq(trips.status, "travel"))).limit(1); if (!trip) throw new Error("Mala inválida.");
  const allocations = await db.select({ allocation: tripAllocations, balance: sql<number>`coalesce(sum(case when ${stockMovements.location} = 'trip' then ${stockMovements.deltaMilli} else 0 end), 0)` }).from(tripAllocations).leftJoin(stockMovements, and(eq(stockMovements.lotId, tripAllocations.lotId), eq(stockMovements.tripId, tripId))).where(eq(tripAllocations.tripId, tripId)).groupBy(tripAllocations.id);
  const commands: unknown[] = [];
  for (const row of allocations) { const actual = toMilli(form.get(`return_${row.allocation.id}`), "Retorno", true); const expected = Number(row.balance); if (actual > expected) throw new Error("O retorno não pode ser maior que o saldo na mala."); const difference = expected - actual; const reason = String(form.get(`reason_${row.allocation.id}`) ?? "").trim(); if (difference && reason.length < 5) throw new Error("Justifique toda diferença no retorno.");
    if (actual) { commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: row.allocation.lotId, tripId, location: "trip", type: "return", deltaMilli: -actual, reason: "Retorno da mala", createdAt: stamp(), createdBy: user.userId })); commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: row.allocation.lotId, tripId, location: "clinic", type: "return", deltaMilli: actual, reason: "Retorno da mala", createdAt: stamp(), createdBy: user.userId })); }
    if (difference) commands.push(db.insert(stockMovements).values({ id: id(), clinicId: user.clinicId, lotId: row.allocation.lotId, tripId, location: "trip", type: "loss", deltaMilli: -difference, reason, createdAt: stamp(), createdBy: user.userId }));
  }
  commands.push(db.update(trips).set({ status: "closed", closedAt: stamp() }).where(eq(trips.id, tripId))); await runBatch(db, commands); await audit(user, "trip.close", "trip", tripId, trip.destination); done();
}
