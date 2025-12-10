/**
 * Unit tests for Google Maps hooks
 */

import { describe, it, expect } from '@jest/globals';
import { mapUtils } from '../useGoogleMaps';
import type { MapPoint } from '@/types/proyectos';

// Mock Google Maps API
const mockGoogle = {
  maps: {
    LatLng: class {
      constructor(private _lat: number, private _lng: number) {}
      lat() {
        return this._lat;
      }
      lng() {
        return this._lng;
      }
    },
    LatLngBounds: class {
      private bounds: Array<{ lat: number; lng: number }> = [];
      extend(point: any) {
        this.bounds.push({
          lat: typeof point.lat === "function" ? point.lat() : point.lat,
          lng: typeof point.lng === "function" ? point.lng() : point.lng,
        });
      }
      getCenter() {
        if (this.bounds.length === 0) return new mockGoogle.maps.LatLng(0, 0);
        const sumLat = this.bounds.reduce((sum, p) => sum + p.lat, 0);
        const sumLng = this.bounds.reduce((sum, p) => sum + p.lng, 0);
        return new mockGoogle.maps.LatLng(
          sumLat / this.bounds.length,
          sumLng / this.bounds.length
        );
      }
    },
    Polygon: class {
      private paths: any[];
      constructor(options: any) {
        this.paths = options.paths || [];
      }
      getPath() {
        return {
          getLength: () => this.paths.length,
          getAt: (index: number) => this.paths[index],
        };
      }
    },
    geometry: {
      spherical: {
        computeArea: (paths: any[]) => {
          // Simple area calculation for testing
          if (paths.length < 3) return 0;
          // Return a mock area (in reality this would be Haversine formula)
          return paths.length * 100;
        },
      },
    },
  },
};

// Set up global mock
(global as any).google = mockGoogle;
(global as any).window = { google: mockGoogle };

describe('Google Maps Utilities', () => {
  describe('mapUtils.calculatePolygonArea', () => {
    it('should calculate area for a valid polygon', () => {
      const polygon: MapPoint[] = [
        { lat: -12.0464, lng: -77.0428 },
        { lat: -12.0465, lng: -77.0428 },
        { lat: -12.0465, lng: -77.0429 },
        { lat: -12.0464, lng: -77.0429 },
      ];

      const area = mapUtils.calculatePolygonArea(polygon);
      expect(area).toBeGreaterThan(0);
    });

    it('should return 0 for polygon with less than 3 points', () => {
      const invalidPolygon: MapPoint[] = [
        { lat: -12.0464, lng: -77.0428 },
        { lat: -12.0465, lng: -77.0428 },
      ];

      const area = mapUtils.calculatePolygonArea(invalidPolygon);
      expect(area).toBe(0);
    });

    it('should return 0 for empty polygon', () => {
      const emptyPolygon: MapPoint[] = [];
      const area = mapUtils.calculatePolygonArea(emptyPolygon);
      expect(area).toBe(0);
    });
  });

  describe('mapUtils.calculatePolygonCenter', () => {
    it('should calculate center point of a polygon', () => {
      const polygon: MapPoint[] = [
        { lat: -12.0, lng: -77.0 },
        { lat: -12.0, lng: -78.0 },
        { lat: -13.0, lng: -78.0 },
        { lat: -13.0, lng: -77.0 },
      ];

      const center = mapUtils.calculatePolygonCenter(polygon);
      expect(center).toHaveProperty('lat');
      expect(center).toHaveProperty('lng');
      expect(typeof center.lat).toBe('number');
      expect(typeof center.lng).toBe('number');
    });

    it('should handle single point', () => {
      const singlePoint: MapPoint[] = [{ lat: -12.0464, lng: -77.0428 }];
      const center = mapUtils.calculatePolygonCenter(singlePoint);
      expect(center.lat).toBeCloseTo(-12.0464, 4);
      expect(center.lng).toBeCloseTo(-77.0428, 4);
    });
  });

  describe('mapUtils.polygonToGeoJSON', () => {
    it('should convert Google Maps polygon to GeoJSON coordinates', () => {
      const mockPaths = [
        new mockGoogle.maps.LatLng(-12.0464, -77.0428),
        new mockGoogle.maps.LatLng(-12.0465, -77.0428),
        new mockGoogle.maps.LatLng(-12.0465, -77.0429),
      ];

      const mockPolygon = new mockGoogle.maps.Polygon({ paths: mockPaths }) as any;
      const geoJSON = mapUtils.polygonToGeoJSON(mockPolygon);

      expect(Array.isArray(geoJSON)).toBe(true);
      expect(geoJSON.length).toBe(1);
      expect(Array.isArray(geoJSON[0])).toBe(true);

      // Check that polygon is closed
      const coordinates = geoJSON[0];
      expect(coordinates.length).toBe(mockPaths.length + 1); // +1 for closing point
      expect(coordinates[0]).toEqual(coordinates[coordinates.length - 1]);
    });

    it('should handle empty polygon', () => {
      const mockPolygon = new mockGoogle.maps.Polygon({ paths: [] }) as any;
      const geoJSON = mapUtils.polygonToGeoJSON(mockPolygon);

      expect(Array.isArray(geoJSON)).toBe(true);
      expect(geoJSON.length).toBe(1);
      expect(geoJSON[0].length).toBe(1); // Just the closing point
    });
  });

  describe('mapUtils.geoJSONToMapPaths', () => {
    it('should convert GeoJSON coordinates to Map paths', () => {
      const geoJSON: number[][][] = [
        [
          [-77.0428, -12.0464],
          [-77.0428, -12.0465],
          [-77.0429, -12.0465],
          [-77.0429, -12.0464],
          [-77.0428, -12.0464], // Closing point
        ],
      ];

      const paths = mapUtils.geoJSONToMapPaths(geoJSON);

      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(5);
      paths.forEach((point) => {
        expect(point).toHaveProperty('lat');
        expect(point).toHaveProperty('lng');
      });

      // Verify coordinate conversion (lng, lat) -> (lat, lng)
      expect(paths[0].lat).toBe(-12.0464);
      expect(paths[0].lng).toBe(-77.0428);
    });

    it('should handle empty coordinates', () => {
      const emptyGeoJSON: number[][][] = [[]];
      const paths = mapUtils.geoJSONToMapPaths(emptyGeoJSON);

      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(0);
    });

    it('should handle missing outer array', () => {
      const invalidGeoJSON: number[][][] = [];
      const paths = mapUtils.geoJSONToMapPaths(invalidGeoJSON);

      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(0);
    });
  });

  describe('Coordinate conversion roundtrip', () => {
    it('should maintain coordinates through conversion roundtrip', () => {
      const originalPaths = [
        new mockGoogle.maps.LatLng(-12.0464, -77.0428),
        new mockGoogle.maps.LatLng(-12.0465, -77.0428),
        new mockGoogle.maps.LatLng(-12.0465, -77.0429),
        new mockGoogle.maps.LatLng(-12.0464, -77.0429),
      ];

      const mockPolygon = new mockGoogle.maps.Polygon({ paths: originalPaths }) as any;

      // Convert to GeoJSON
      const geoJSON = mapUtils.polygonToGeoJSON(mockPolygon);

      // Convert back to paths
      const convertedPaths = mapUtils.geoJSONToMapPaths(geoJSON);

      // Verify (excluding the closing point that gets added)
      expect(convertedPaths.length).toBe(originalPaths.length + 1);

      for (let i = 0; i < originalPaths.length; i++) {
        expect(convertedPaths[i].lat).toBeCloseTo(originalPaths[i].lat(), 6);
        expect(convertedPaths[i].lng).toBeCloseTo(originalPaths[i].lng(), 6);
      }
    });
  });
});
