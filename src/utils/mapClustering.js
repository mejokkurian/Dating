/**
 * Simple marker clustering utility for react-native-maps
 * Groups nearby markers when there are many markers on the map
 */

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Cluster markers based on distance threshold
 * @param {Array} markers - Array of marker objects with coordinate and data
 * @param {number} distanceThreshold - Distance in meters to cluster (default: 100m)
 * @param {number} minMarkersForClustering - Minimum markers to enable clustering (default: 20)
 * @returns {Array} - Array of clusters (each cluster has center, markers array, and count)
 */
export const clusterMarkers = (markers, distanceThreshold = 100, minMarkersForClustering = 20) => {
  // If we have fewer markers than threshold, return individual markers
  if (markers.length < minMarkersForClustering) {
    return markers.map(marker => ({
      ...marker,
      isCluster: false,
      clusterCount: 1,
    }));
  }

  const clusters = [];
  const processed = new Set();

  markers.forEach((marker, index) => {
    if (processed.has(index)) return;

    const cluster = {
      coordinate: {
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
      },
      markers: [marker],
      isCluster: false,
      clusterCount: 1,
      data: marker.data || marker,
    };

    // Find nearby markers to cluster
    markers.forEach((otherMarker, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return;

      const distance = getDistance(
        marker.coordinate.latitude,
        marker.coordinate.longitude,
        otherMarker.coordinate.latitude,
        otherMarker.coordinate.longitude
      );

      if (distance <= distanceThreshold) {
        cluster.markers.push(otherMarker);
        processed.add(otherIndex);
        
        // Update cluster center (average of all markers in cluster)
        const totalLat = cluster.markers.reduce((sum, m) => sum + m.coordinate.latitude, 0);
        const totalLon = cluster.markers.reduce((sum, m) => sum + m.coordinate.longitude, 0);
        cluster.coordinate.latitude = totalLat / cluster.markers.length;
        cluster.coordinate.longitude = totalLon / cluster.markers.length;
      }
    });

    processed.add(index);
    
    // Mark as cluster if it contains multiple markers
    if (cluster.markers.length > 1) {
      cluster.isCluster = true;
      cluster.clusterCount = cluster.markers.length;
    }

    clusters.push(cluster);
  });

  return clusters;
};

/**
 * Get adaptive distance threshold based on zoom level
 * @param {number} latitudeDelta - Map's latitude delta (zoom level indicator)
 * @returns {number} - Distance threshold in meters
 */
export const getAdaptiveThreshold = (latitudeDelta) => {
  // Larger latitudeDelta = more zoomed out = larger threshold
  // Smaller latitudeDelta = more zoomed in = smaller threshold
  if (latitudeDelta > 0.1) return 500; // Very zoomed out - cluster far apart markers
  if (latitudeDelta > 0.05) return 200; // Zoomed out - medium clustering
  if (latitudeDelta > 0.02) return 100; // Medium zoom - tight clustering
  return 50; // Zoomed in - very tight clustering or no clustering
};
