import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Hoisted mocks
// ============================================================

const {
  mockGetUser,
  mockServerActionClient,
  mockServiceRoleClient,
  mockCreateServiceRoleClient,
  mockDispatch,
  createChainMock,
} = vi.hoisted(() => {
  function createChainMock(finalResult: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "eq", "neq", "is", "or", "order", "range", "single", "in", "limit", "maybeSingle"];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.single.mockImplementation(() => Promise.resolve(finalResult));
    chain.maybeSingle.mockImplementation(() => Promise.resolve(finalResult));
    return chain;
  }

  const mockGetUser = vi.fn();
  // Session-bound (RLS) client — used for auth + the in-app `notificacion` insert.
  const mockServerActionClient = {
    auth: { getUser: mockGetUser },
    schema: vi.fn(),
  };

  // Service-role client — must be used for reading configuracion_sistema
  // (RLS on that table only grants SELECT to admins) and passed through as
  // the push dispatch context (push_subscription RLS is per-owner, so a
  // non-self target needs a privileged client to find its subscriptions).
  const mockServiceRoleClient = {
    schema: vi.fn(),
  };
  const mockCreateServiceRoleClient = vi.fn(() => mockServiceRoleClient);

  const mockDispatch = vi.fn().mockResolvedValue({});

  return {
    mockGetUser,
    mockServerActionClient,
    mockServiceRoleClient,
    mockCreateServiceRoleClient,
    mockDispatch,
    createChainMock,
  };
});

vi.mock("@/lib/supabase.server-actions", () => ({
  createServerActionClient: vi.fn().mockImplementation(() => Promise.resolve(mockServerActionClient)),
}));
vi.mock("@/lib/supabase.server", () => ({
  createServiceRoleClient: mockCreateServiceRoleClient,
}));
vi.mock("@/lib/notificationsDelivery", () => ({
  dispatchNotificationChannels: mockDispatch,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { crearNotificacion } from "@/app/_actionsNotifications";

describe("crearNotificacion — config read uses the service-role client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "actor-1", email: "actor@example.com" } } });
    mockDispatch.mockResolvedValue({});

    const notifInsertChain = createChainMock({
      data: { id: "notif-1", tipo: "sistema", titulo: "t", mensaje: "m", data: null, created_at: "2026-07-07T00:00:00Z" },
      error: null,
    });
    mockServerActionClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(notifInsertChain) });

    const configChain = createChainMock({
      data: {
        notificaciones_push: true,
        notificaciones_recordatorios: true,
        push_provider: "webpush",
        push_vapid_public: "pub",
        push_vapid_private: "priv",
        push_vapid_subject: null,
      },
      error: null,
    });
    mockServiceRoleClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(configChain) });
  });

  it("reads configuracion_sistema via createServiceRoleClient().schema('crm'), not the session client", async () => {
    await crearNotificacion("target-user", "sistema", "Título", "Mensaje");

    expect(mockCreateServiceRoleClient).toHaveBeenCalled();
    expect(mockServiceRoleClient.schema).toHaveBeenCalledWith("crm");

    // The session (RLS-bound) client must not be used to read the config
    // table — that's exactly the bug: non-admin actors get RLS-filtered
    // nulls back from that table.
    const sessionSchemaFromCalls = mockServerActionClient.schema.mock.results.map((r) => r.value.from.mock.calls);
    const sessionTouchedConfigTable = sessionSchemaFromCalls.some((calls: any[]) =>
      calls.some(([table]) => table === "configuracion_sistema"),
    );
    expect(sessionTouchedConfigTable).toBe(false);
  });

  it("passes the service-role client through as push dispatch context (push_subscription RLS is per-owner)", async () => {
    await crearNotificacion("target-user", "sistema", "Título", "Mensaje");

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const [, , , context] = mockDispatch.mock.calls[0];
    expect(context?.supabaseClient).toBe(mockServiceRoleClient);
  });
});

describe("crearNotificacion — in-app notification survives a push dispatch failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "actor-1", email: "actor@example.com" } } });

    const notifInsertChain = createChainMock({
      data: { id: "notif-1", tipo: "sistema", titulo: "t", mensaje: "m", data: null, created_at: "2026-07-07T00:00:00Z" },
      error: null,
    });
    mockServerActionClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(notifInsertChain) });

    const configChain = createChainMock({
      data: {
        notificaciones_push: true,
        notificaciones_recordatorios: true,
        push_provider: "webpush",
        push_vapid_public: "pub",
        push_vapid_private: "priv",
        push_vapid_subject: null,
      },
      error: null,
    });
    mockServiceRoleClient.schema.mockReturnValue({ from: vi.fn().mockReturnValue(configChain) });
  });

  it("still creates and returns the in-app notification row when dispatchNotificationChannels throws", async () => {
    mockDispatch.mockRejectedValueOnce(new Error("push_subscription lookup boom"));

    const result = await crearNotificacion("target-user", "sistema", "Título", "Mensaje");

    expect(result).toEqual(
      expect.objectContaining({ id: "notif-1", titulo: "t", mensaje: "m" }),
    );
  });
});
