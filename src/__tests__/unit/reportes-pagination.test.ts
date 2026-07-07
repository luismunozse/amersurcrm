import { describe, it, expect, vi } from "vitest";
import { fetchAllRows } from "@/lib/reportes/pagination";

describe("fetchAllRows", () => {
  it("returns all rows from a single undersized page without a second call", async () => {
    const queryFactory = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "1" }, { id: "2" }], error: null });

    const rows = await fetchAllRows(queryFactory, 1000);

    expect(rows).toEqual([{ id: "1" }, { id: "2" }]);
    expect(queryFactory).toHaveBeenCalledTimes(1);
    expect(queryFactory).toHaveBeenCalledWith(0);
  });

  it("loops and concatenates correctly across a mocked 2-page response totaling >1000 rows", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}` }));
    const page2 = Array.from({ length: 50 }, (_, i) => ({ id: `c${1000 + i}` }));
    const queryFactory = vi
      .fn()
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null });

    const rows = await fetchAllRows(queryFactory, 1000);

    expect(rows).toHaveLength(1050);
    expect(rows[0]).toEqual({ id: "c0" });
    expect(rows[1049]).toEqual({ id: "c1049" });
    expect(queryFactory).toHaveBeenCalledTimes(2);
    expect(queryFactory).toHaveBeenNthCalledWith(1, 0);
    expect(queryFactory).toHaveBeenNthCalledWith(2, 1000);
  });

  it("stops on the first empty page without an extra call", async () => {
    const queryFactory = vi.fn().mockResolvedValue({ data: [], error: null });

    const rows = await fetchAllRows(queryFactory, 1000);

    expect(rows).toEqual([]);
    expect(queryFactory).toHaveBeenCalledTimes(1);
  });

  it("treats a null data page as empty and stops", async () => {
    const queryFactory = vi.fn().mockResolvedValue({ data: null, error: null });

    const rows = await fetchAllRows(queryFactory, 1000);

    expect(rows).toEqual([]);
    expect(queryFactory).toHaveBeenCalledTimes(1);
  });

  it("propagates the first query's error instead of swallowing it", async () => {
    const boom = new Error("boom");
    const queryFactory = vi.fn().mockResolvedValue({ data: null, error: boom });

    await expect(fetchAllRows(queryFactory, 1000)).rejects.toThrow("boom");
    expect(queryFactory).toHaveBeenCalledTimes(1);
  });
});
