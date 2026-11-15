import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, clinics, lots, memberInvites, members, products, stockMovements, tripAllocations, tripItems, trips } from "@/db/schema";
import { getChatGPTUser, requireChatGPTUser } from "./chatgpt-auth";

export type Role = "admin" | "manager" | "doctor" | "viewer";
export type ClinicUser = { userId: string; clinicId: string; displayName: string; email: string; role: Role };

const now = () => new Date();
const id = () => crypto.randomUUID();

export function toMilli(value: FormDataEntryValue | null, label: string, zero = false) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || (!zero && parsed <= 0) || parsed > 1_000_000) throw new Error(`${label}: informe uma quantidade válida.`);
  return Math.round(parsed * 1000);
}

export const fromMilli = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value / 1000);

export async function currentUser(): Promise<ClinicUser> {
  const identity = await requireChatGPTUser("/entrar");
  const db = getDb();
  let [member] = await db.select().from(members).where(eq(members.userId, identity.userId)).limit(1);
  if (!member) {
    const existing = await db.select({ id: clinics.id }).from(clinics).limit(1);
    if (existing.length) {
      const [invite] = await db.select().from(memberInvites).where(eq(memberInvites.email, identity.email.toLowerCase())).limit(1);
      if (!invite) throw new Error("Seu acesso ainda não foi liberado pela administradora da clínica.");
      await db.batch([
        db.insert(members).values({ userId: identity.userId, clinicId: invite.clinicId, displayName: invite.displayName, email: invite.email, role: invite.role, active: true, createdAt: now() }),
        db.delete(memberInvites).where(eq(memberInvites.email, invite.email)),
      ]);
      [member] = await db.select().from(members).where(eq(members.userId, identity.userId)).limit(1);
      return member as ClinicUser;
    }
    const clinicId = id();
    await db.batch([
      db.insert(clinics).values({ id: clinicId, name: "Minha Clínica", createdAt: now() }),
      db.insert(members).values({ userId: identity.userId, clinicId, displayName: identity.displayName.slice(0, 120), email: identity.email.toLowerCase(), role: "admin", active: true, createdAt: now() }),
    ]);
    [member] = await db.select().from(members).where(eq(members.userId, identity.userId)).limit(1);
  }
  if (!member.active) throw new Error("Seu acesso está desativado.");
  return member as ClinicUser;
}

export async function optionalIdentity() { return getChatGPTUser(); }

export function canManage(role: Role) { return role === "admin" || role === "manager"; }

export function requireRole(user: ClinicUser, roles: Role[]) {
  if (!roles.includes(user.role)) throw new Error("Você não tem permissão para esta ação.");
}

export async function audit(user: ClinicUser, action: string, entityType: string, entityId: string, detail?: string) {
  await getDb().insert(auditEvents).values({ id: id(), clinicId: user.clinicId, actorId: user.userId, action, entityType, entityId, detail: detail?.slice(0, 1000) ?? null, createdAt: now() });
}

export async function dashboardData(user: ClinicUser) {
  const db = getDb();
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, user.clinicId)).limit(1);
  const productRows = await db.select({ product: products, balance: sql<number>`coalesce(sum(case when ${stockMovements.location} = 'clinic' then ${stockMovements.deltaMilli} else 0 end), 0)` })
    .from(products).leftJoin(lots, eq(lots.productId, products.id)).leftJoin(stockMovements, eq(stockMovements.lotId, lots.id))
    .where(and(eq(products.clinicId, user.clinicId), eq(products.active, true))).groupBy(products.id).orderBy(asc(products.name));
  const tripRows = await db.select({ trip: trips, responsible: members.displayName }).from(trips).innerJoin(members, eq(members.userId, trips.responsibleId))
    .where(eq(trips.clinicId, user.clinicId)).orderBy(desc(trips.createdAt));
  const pendingItems = await db.select({ item: tripItems, product: products }).from(tripItems)
    .innerJoin(products, eq(products.id, tripItems.productId))
    .innerJoin(trips, eq(trips.id, tripItems.tripId))
    .where(eq(trips.clinicId, user.clinicId));
  const allocations = await db.select({ allocation: tripAllocations, lot: lots, product: products,
    balance: sql<number>`coalesce(sum(case when ${stockMovements.location} = 'trip' then ${stockMovements.deltaMilli} else 0 end), 0)` })
    .from(tripAllocations).innerJoin(trips, eq(trips.id, tripAllocations.tripId)).innerJoin(lots, eq(lots.id, tripAllocations.lotId)).innerJoin(products, eq(products.id, tripAllocations.productId))
    .leftJoin(stockMovements, and(eq(stockMovements.lotId, tripAllocations.lotId), eq(stockMovements.tripId, tripAllocations.tripId)))
    .where(eq(trips.clinicId, user.clinicId)).groupBy(tripAllocations.id);
  const team = await db.select().from(members).where(and(eq(members.clinicId, user.clinicId), eq(members.active, true))).orderBy(asc(members.displayName));
  const invitations = await db.select().from(memberInvites).where(eq(memberInvites.clinicId, user.clinicId)).orderBy(asc(memberInvites.displayName));
  const ledger = await db.select({ movement: stockMovements, product: products, lot: lots, trip: trips }).from(stockMovements)
    .innerJoin(lots, eq(lots.id, stockMovements.lotId)).innerJoin(products, eq(products.id, lots.productId)).leftJoin(trips, eq(trips.id, stockMovements.tripId))
    .where(eq(stockMovements.clinicId, user.clinicId)).orderBy(desc(stockMovements.createdAt)).limit(100);
  return { clinic, products: productRows, trips: tripRows, pendingItems, allocations, team, invitations, ledger };
}
