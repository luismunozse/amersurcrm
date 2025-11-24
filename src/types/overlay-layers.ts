export type LatLngTuple = [number, number];

export type OverlayBoundsTuple =
  | [LatLngTuple, LatLngTuple]
  | [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple];

export interface OverlayLayerConfig {
  id: string;
  name?: string | null;
  url: string | null;
  bounds?: OverlayBoundsTuple | null;
  opacity?: number | null;
  visible?: boolean | null;
  isPrimary?: boolean | null;
  order?: number | null;
}

export type OverlayLayerInput = Omit<OverlayLayerConfig, 'id'> & { id?: string };
