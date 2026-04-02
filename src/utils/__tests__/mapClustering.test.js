import { clusterMarkers, getAdaptiveThreshold } from '../mapClustering';

describe('mapClustering', () => {
  describe('clusterMarkers', () => {
    const createMarker = (id, lat, lon) => ({
      coordinate: { latitude: lat, longitude: lon },
      data: { _id: id },
    });

    it('should return individual markers when count is below threshold', () => {
      const markers = [
        createMarker('1', 37.7749, -122.4194),
        createMarker('2', 37.7849, -122.4294),
      ];

      const result = clusterMarkers(markers, 100, 20);

      expect(result).toHaveLength(2);
      expect(result[0].isCluster).toBe(false);
      expect(result[0].clusterCount).toBe(1);
      expect(result[1].isCluster).toBe(false);
      expect(result[1].clusterCount).toBe(1);
    });

    it('should cluster nearby markers', () => {
      // Create markers that are close together (within 100m)
      const markers = [
        createMarker('1', 37.7749, -122.4194),
        createMarker('2', 37.7750, -122.4195), // ~100m away
        createMarker('3', 37.7751, -122.4196), // ~200m away from first
        createMarker('4', 37.8000, -122.4000), // Far away (>1km)
      ];

      const result = clusterMarkers(markers, 200, 2); // Lower threshold for testing

      // Should have at least one cluster
      const clusters = result.filter(m => m.isCluster);
      expect(clusters.length).toBeGreaterThan(0);
      
      // Check that clustered markers have correct count
      clusters.forEach(cluster => {
        expect(cluster.clusterCount).toBeGreaterThan(1);
        expect(cluster.isCluster).toBe(true);
      });
    });

    it('should calculate cluster center as average of markers', () => {
      const markers = [
        createMarker('1', 37.7749, -122.4194),
        createMarker('2', 37.7750, -122.4195),
      ];

      const result = clusterMarkers(markers, 200, 2);

      if (result[0].isCluster) {
        const centerLat = (37.7749 + 37.7750) / 2;
        const centerLon = (-122.4194 + -122.4195) / 2;
        
        expect(result[0].coordinate.latitude).toBeCloseTo(centerLat, 4);
        expect(result[0].coordinate.longitude).toBeCloseTo(centerLon, 4);
      }
    });

    it('should handle empty array', () => {
      const result = clusterMarkers([], 100, 20);
      expect(result).toEqual([]);
    });

    it('should handle single marker', () => {
      const markers = [createMarker('1', 37.7749, -122.4194)];
      const result = clusterMarkers(markers, 100, 20);

      expect(result).toHaveLength(1);
      expect(result[0].isCluster).toBe(false);
      expect(result[0].clusterCount).toBe(1);
    });
  });

  describe('getAdaptiveThreshold', () => {
    it('should return 500 for very zoomed out maps', () => {
      expect(getAdaptiveThreshold(0.2)).toBe(500);
      expect(getAdaptiveThreshold(0.15)).toBe(500);
    });

    it('should return 200 for zoomed out maps', () => {
      expect(getAdaptiveThreshold(0.08)).toBe(200);
      expect(getAdaptiveThreshold(0.06)).toBe(200);
    });

    it('should return 100 for medium zoom', () => {
      expect(getAdaptiveThreshold(0.04)).toBe(100);
      expect(getAdaptiveThreshold(0.03)).toBe(100);
    });

    it('should return 50 for zoomed in maps', () => {
      expect(getAdaptiveThreshold(0.01)).toBe(50);
      expect(getAdaptiveThreshold(0.005)).toBe(50);
    });

    it('should handle edge cases', () => {
      expect(getAdaptiveThreshold(0.1)).toBe(500);
      expect(getAdaptiveThreshold(0.05)).toBe(200);
      expect(getAdaptiveThreshold(0.02)).toBe(100);
    });
  });
});
