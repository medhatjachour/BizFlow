import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ACTIVITY_ACTIONS } from "@/lib/activity-actions";
import { AUDIT_EVENTS } from "@/lib/audit-events";

/**
 * Regression tests for the admin trail: what an admin does to an account or a
 * licence has to show up on the order page and in the customer's feed.
 *
 * Three real gaps are locked here. Licence actions (revoke / re-activate /
 * release the device) mutated state and recorded nothing, so an order page could
 * show a revoked licence whose last recorded event was the checkout. Re-sending
 * the key email recorded nothing either. And `readOrderDetail` matched support
 * tickets on the account id *or* the buyer's email instead of on both, so a
 * ticket raised from the public form before the buyer had an account vanished
 * from the order it belonged to.
 *
 * These run against the real database, like the other suites: every one of the
 * three bugs was in a query-writing or write-ordering decision, which a mock
 * would have reproduced faithfully instead of catching.
 */

const { prisma } = await import("@/lib/db");
const {
  readCustomerDetail,
  readOrderDetail,
  recordLicenseEmailResent,
  setCustomerStatus,
  updateLicenseAccess,
} = await import("@/lib/admin");

const SESSION_ID = "cs_test_trail_contract";
const BUYER_EMAIL = "trail-contract@example.com";
const LICENSE_KEY = "BIZ-TR41L-C0NTR-ACT00-00001";

async function clearDatabase() {
  await prisma.orderAudit.deleteMany();
  await prisma.accountActivity.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.license.deleteMany();
  await prisma.order.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.customer.deleteMany();
}

/** A buyer with an account, a paid order and an active, device-bound licence. */
async function seedBuyer() {
  const customer = await prisma.customer.create({
    data: {
      email: BUYER_EMAIL,
      fullName: "Trail Contract",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  const order = await prisma.order.create({
    data: {
      sessionId: SESSION_ID,
      customerId: customer.id,
      email: BUYER_EMAIL,
      itemId: "suite",
      amountTotal: 54000,
      paymentStatus: "paid",
    },
  });

  const license = await prisma.license.create({
    data: {
      customerId: customer.id,
      orderId: order.id,
      key: LICENSE_KEY,
      status: "ACTIVE",
      deviceFingerprint: "D7574401769BD1EF3F85AB6704BBFEF667802838AE14982CF01CFECF3AD00009",
      deviceName: "mga (win32-x64)",
      deviceActivatedAt: new Date(),
    },
  });

  return { customer, order, license };
}

async function auditEvents(orderId: string) {
  const rows = await prisma.orderAudit.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  return rows.map((row) => row.event);
}

async function activityActions(customerId: string) {
  const rows = await prisma.accountActivity.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.action);
}

beforeEach(clearDatabase);
afterAll(async () => {
  await clearDatabase();
  await prisma.$disconnect();
});

describe("admin licence actions", () => {
  it("records the action on the order and mirrors it into the customer's feed", async () => {
    const { customer, order, license } = await seedBuyer();

    expect(await updateLicenseAccess({ id: license.id, action: "revoke" })).toBe(true);

    expect(await auditEvents(order.id)).toEqual([AUDIT_EVENTS.licenseRevoked]);
    expect(await activityActions(customer.id)).toEqual([ACTIVITY_ACTIONS.licenseRevoked]);

    const stored = await prisma.license.findUniqueOrThrow({ where: { id: license.id } });
    expect(stored.status).toBe("REVOKED");
  });

  it("does not stack duplicate audit rows when the same action is repeated", async () => {
    const { order, license } = await seedBuyer();

    await updateLicenseAccess({ id: license.id, action: "revoke" });
    await updateLicenseAccess({ id: license.id, action: "revoke" });

    expect(await auditEvents(order.id)).toEqual([AUDIT_EVENTS.licenseRevoked]);
  });

  it("keeps a distinct entry for each real transition", async () => {
    const { customer, order, license } = await seedBuyer();

    await updateLicenseAccess({ id: license.id, action: "unlock_device" });
    await updateLicenseAccess({ id: license.id, action: "revoke" });
    await updateLicenseAccess({ id: license.id, action: "reactivate" });

    expect(await auditEvents(order.id)).toEqual([
      AUDIT_EVENTS.licenseDeviceReleased,
      AUDIT_EVENTS.licenseRevoked,
      AUDIT_EVENTS.licenseReactivated,
    ]);
    expect(await activityActions(customer.id)).toEqual([
      ACTIVITY_ACTIONS.deviceReleased,
      ACTIVITY_ACTIONS.licenseRevoked,
      ACTIVITY_ACTIONS.licenseReactivated,
    ]);

    const stored = await prisma.license.findUniqueOrThrow({ where: { id: license.id } });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.deviceFingerprint).toBeNull();
  });

  it("records that the key was emailed again, without touching access state", async () => {
    const { customer, order, license } = await seedBuyer();

    await recordLicenseEmailResent({
      orderId: order.id,
      customerId: customer.id,
      key: license.key,
    });

    expect(await auditEvents(order.id)).toEqual([AUDIT_EVENTS.licenseReissued]);
    expect(await activityActions(customer.id)).toEqual([ACTIVITY_ACTIONS.licenseReissued]);

    const stored = await prisma.license.findUniqueOrThrow({ where: { id: license.id } });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.deviceFingerprint).not.toBeNull();
  });
});

describe("account suspension", () => {
  it("records the transition once and reports success idempotently", async () => {
    const { customer } = await seedBuyer();

    expect(await setCustomerStatus(customer.id, "SUSPENDED")).toEqual({
      ok: true,
      changed: true,
      previousStatus: "ACTIVE",
    });
    expect(await setCustomerStatus(customer.id, "SUSPENDED")).toEqual({
      ok: true,
      changed: false,
      previousStatus: "SUSPENDED",
    });

    expect(await activityActions(customer.id)).toEqual([ACTIVITY_ACTIONS.accountSuspended]);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).status).toBe(
      "SUSPENDED"
    );
  });

  it("tells a never-verified sign-up they were activated, not re-activated", async () => {
    const { customer } = await seedBuyer();

    // A sign-up that never finished verification starts PENDING, which is what
    // the admin drill-down's primary button has to be able to clear.
    await prisma.customer.update({ where: { id: customer.id }, data: { status: "PENDING" } });

    expect(await setCustomerStatus(customer.id, "ACTIVE")).toEqual({
      ok: true,
      changed: true,
      previousStatus: "PENDING",
    });

    const activity = await prisma.accountActivity.findMany({
      where: { customerId: customer.id },
      select: { action: true, summary: true },
    });
    expect(activity).toEqual([
      { action: ACTIVITY_ACTIONS.accountReactivated, summary: "Account activated by a manager" },
    ]);
    expect(await setCustomerStatus("no-such-customer", "ACTIVE")).toEqual({
      ok: false,
      changed: false,
      previousStatus: null,
    });
  });
});

describe("order detail ticket linking", () => {
  it("shows a ticket raised from the public form before the account existed", async () => {
    const { customer, order } = await seedBuyer();

    // What the public support form writes: the buyer's address, no account link.
    const ticket = await prisma.supportTicket.create({
      data: {
        publicId: "BF-9001",
        customerId: null,
        email: BUYER_EMAIL,
        subject: "Thermal printer drops every third receipt",
        category: "hardware",
        priority: "high",
        status: "IN_PROGRESS",
        messages: {
          create: [
            { senderType: "customer", body: "It prints 2 and skips the 3rd, every time." },
            { senderType: "support", body: "Please send us the printer model." },
          ],
        },
      },
    });

    const detail = await readOrderDetail(order.sessionId);

    expect(detail).not.toBeNull();
    expect(detail?.tickets.map((row) => row.publicId)).toEqual([ticket.publicId]);
    expect(detail?.tickets[0]?.messages).toHaveLength(2);
    // The page offers whichever account link it can resolve: here the ticket has
    // no customer id, so the address is what has to produce the offer.
    expect(detail?.tickets[0]?.customerId).toBeNull();
    expect(detail?.tickets[0]?.accountId).toBe(customer.id);
  });

  it("keeps a ticket that is only linked by the account id", async () => {
    const { customer, order } = await seedBuyer();

    await prisma.supportTicket.create({
      data: {
        publicId: "BF-9002",
        customerId: customer.id,
        email: "someone-else@example.com",
        subject: "Invoice address is wrong",
        category: "billing",
        status: "OPEN",
      },
    });

    const detail = await readOrderDetail(order.sessionId);

    expect(detail?.tickets.map((row) => row.publicId)).toEqual(["BF-9002"]);
  });

  it("suppresses neither the account's tickets nor the email's on the customer page", async () => {
    const { customer } = await seedBuyer();

    await prisma.supportTicket.createMany({
      data: [
        {
          publicId: "BF-9003",
          customerId: customer.id,
          email: "an-old-address@example.com",
          subject: "Old address ticket",
          category: "billing",
          status: "OPEN",
        },
        {
          publicId: "BF-9004",
          customerId: null,
          email: BUYER_EMAIL,
          subject: "Pre-account ticket",
          category: "installation",
          status: "RESOLVED",
        },
      ],
    });

    const detail = await readCustomerDetail(customer.id);

    const tickets = [...(detail?.tickets ?? [])].sort((a, b) => a.publicId.localeCompare(b.publicId));
    expect(tickets.map((row) => row.publicId)).toEqual(["BF-9003", "BF-9004"]);
    expect(tickets.map((row) => row.customerId)).toEqual([customer.id, null]);
  });
});
