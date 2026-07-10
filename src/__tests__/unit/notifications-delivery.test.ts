import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Hoisted mocks
// ============================================================

const { mockWebPush, mockServerActionClient } = vi.hoisted(() => {
  const mockWebPush = {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
  const mockServerActionClient = {
    schema: vi.fn(),
  };
  return { mockWebPush, mockServerActionClient };
});

vi.mock("web-push", () => ({
  default: mockWebPush,
}));

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));

import { dispatchNotificationChannels } from "@/lib/notificationsDelivery";
import type { NotificationDeliveryPayload, NotificationPreferences, NotificationChannelConfig } from "@/lib/notificationsDelivery";

// ============================================================
// Chain builders
// ============================================================

/**
 * Builds a fake Supabase client exposing only `.schema(name).from(table)`.
 * Mirrors the real call shape used by sendPushNotification:
 *   client.schema("crm").from("push_subscription").select(...).eq(...)
 *   client.schema("crm").from("push_subscription").delete().eq("id", ...)
 */
function makeClient(selectResult: { data: any; error: any }) {
  const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const deleteChain = { eq: deleteEq };
  const selectEq = vi.fn().mockResolvedValue(selectResult);
  const selectChain = { eq: selectEq };

  const table = {
    select: vi.fn().mockReturnValue(selectChain),
    delete: vi.fn().mockReturnValue(deleteChain),
  };
  const from = vi.fn().mockReturnValue(table);
  const schema = vi.fn().mockReturnValue({ from });
  const client: any = { schema, from: vi.fn() }; // bare .from should NOT be used by the delivery code
  return { client, schema, from, table, selectEq, deleteEq };
}

function basePayload(overrides: Partial<NotificationDeliveryPayload> = {}): NotificationDeliveryPayload {
  return {
    userId: "user-1",
    titulo: "Título",
    mensaje: "Mensaje",
    tipo: "sistema",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const prefs: NotificationPreferences = { pushEnabled: true, recordatoriosEnabled: true };

function pushConfig(): NotificationChannelConfig {
  return {
    push: {
      provider: "webpush",
      vapidPublicKey: "public-key",
      vapidPrivateKey: "private-key",
      subject: "mailto:test@example.com",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWebPush.sendNotification.mockResolvedValue(undefined);
});

describe("dispatchNotificationChannels — push_subscription schema", () => {
  it("queries push_subscription via .schema('crm'), not the client's default schema", async () => {
    const { client, schema, from } = makeClient({
      data: [{ id: "sub-1", endpoint: "https://push.example/1", p256dh: "p256", auth: "auth" }],
      error: null,
    });

    const result = await dispatchNotificationChannels(basePayload(), prefs, pushConfig(), {
      supabaseClient: client,
    });

    expect(schema).toHaveBeenCalledWith("crm");
    expect(from).toHaveBeenCalledWith("push_subscription");
    // The delivery code must never rely on the bare (unscoped) client.
    expect(client.from).not.toHaveBeenCalled();
    expect(result.push).toEqual({ attempted: 1, sent: 1, failed: 0, pruned: 0 });
  });

  it("prunes expired subscriptions (404/410) via .schema('crm') as well", async () => {
    mockWebPush.sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    const { client, schema, table, deleteEq } = makeClient({
      data: [{ id: "sub-expired", endpoint: "https://push.example/expired", p256dh: "p256", auth: "auth" }],
      error: null,
    });

    const result = await dispatchNotificationChannels(basePayload(), prefs, pushConfig(), {
      supabaseClient: client,
    });

    expect(schema).toHaveBeenCalledWith("crm");
    expect(table.delete).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("id", "sub-expired");
    expect(result.push).toEqual({ attempted: 1, sent: 0, failed: 0, pruned: 1 });
  });
});

describe("dispatchNotificationChannels — error surfacing", () => {
  it("throws when the push_subscription lookup errors, instead of silently reporting success", async () => {
    const { client } = makeClient({ data: null, error: { message: "relation does not exist" } });

    await expect(
      dispatchNotificationChannels(basePayload(), prefs, pushConfig(), { supabaseClient: client }),
    ).rejects.toThrow(/relation does not exist/);
  });

  it("returns truthful counts when a send fails without being pruned", async () => {
    mockWebPush.sendNotification.mockRejectedValueOnce({ statusCode: 500 });
    const { client } = makeClient({
      data: [{ id: "sub-1", endpoint: "https://push.example/1", p256dh: "p256", auth: "auth" }],
      error: null,
    });

    const result = await dispatchNotificationChannels(basePayload(), prefs, pushConfig(), {
      supabaseClient: client,
    });

    expect(result.push).toEqual({ attempted: 1, sent: 0, failed: 1, pruned: 0 });
  });

  it("returns attempted: 0 without error when the user has no subscriptions", async () => {
    const { client } = makeClient({ data: [], error: null });

    const result = await dispatchNotificationChannels(basePayload(), prefs, pushConfig(), {
      supabaseClient: client,
    });

    expect(result.push).toEqual({ attempted: 0, sent: 0, failed: 0, pruned: 0 });
  });
});

describe("dispatchNotificationChannels — gating", () => {
  it("does not attempt push (and returns no push key) when config.push is absent", async () => {
    const result = await dispatchNotificationChannels(basePayload(), prefs, undefined);
    expect(result.push).toBeUndefined();
  });

  it("does not attempt push when pushEnabled is false", async () => {
    const { client, from } = makeClient({ data: [], error: null });
    const result = await dispatchNotificationChannels(
      basePayload(),
      { pushEnabled: false, recordatoriosEnabled: true },
      pushConfig(),
      { supabaseClient: client },
    );
    expect(result.push).toBeUndefined();
    expect(from).not.toHaveBeenCalled();
  });
});
