import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProyectoSearchResult, LoteSearchResult } from '@/lib/search/fullTextSearch';
import {
  __setFullTextSearchClientFactory,
  searchProyectosFullText,
  searchLotesFullText,
} from '@/lib/search/fullTextSearch';

const mockRpc = vi.fn();

beforeEach(() => {
  mockRpc.mockReset();
  __setFullTextSearchClientFactory(async () => ({
    rpc: mockRpc,
  }) as any);
});

afterAll(() => {
  __setFullTextSearchClientFactory(null);
});

describe('Full-text search smoke tests', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns vacío cuando la consulta es vacía', async () => {
    const proyectos = await searchProyectosFullText('');
    const lotes = await searchLotesFullText('proyecto', '');

    expect(proyectos).toEqual([]);
    expect(lotes).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('invoca la RPC de proyectos y filtra por rank mínimo', async () => {
    const payload: ProyectoSearchResult[] = [
      { id: '1', nombre: 'Residencial Norte', ubicacion: 'Lima', estado: 'activo', tipo: 'residencial', rank: 0.7 },
      { id: '2', nombre: 'Residencial Sur', ubicacion: 'Cusco', estado: 'activo', tipo: 'residencial', rank: 0.01 },
    ];

    mockRpc.mockResolvedValue({ data: payload, error: null });

    const result = await searchProyectosFullText('residencial', { minRank: 0.2 });

    expect(mockRpc).toHaveBeenCalledWith('search_proyectos', expect.objectContaining({
      search_query: 'residencial',
      limit_count: 50,
      offset_count: 0,
    }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('invoca la RPC de lotes para un proyecto dado', async () => {
    const payload: LoteSearchResult[] = [
      { id: 'l-1', codigo: 'A-01', numero_lote: '01', estado: 'disponible', precio: 100, sup_m2: 120, rank: 0.5 },
    ];

    mockRpc.mockResolvedValue({ data: payload, error: null });

    const result = await searchLotesFullText('proyecto-123', 'manzana a');

    expect(mockRpc).toHaveBeenCalledWith('search_lotes', expect.objectContaining({
      proyecto_id_param: 'proyecto-123',
      search_query: 'manzana a',
    }));
    expect(result).toEqual(payload);
  });
});
