import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Restaurant from '@/models/Restaurant';
import { API_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';

// Add Google Maps type declarations
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: any) => any;
        Marker: new (options: any) => any;
        InfoWindow: new (options: any) => any;
        LatLngBounds: new () => any;
      };
    };
  }
}

interface GoogleMapViewProps {
  items: Restaurant[]; // can be favorites or playlist items
}

export function GoogleMapView({ items }: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<any[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Helper to extract location from a restaurant
  const getRestaurantLocation = (restaurant: Restaurant) => {
    console.log('🗺️ Getting location for restaurant:', {
      name: restaurant.name,
      location: restaurant.location,
      raw: restaurant
    });
    
    // Check if we have valid location data
    if (restaurant.location?.latitude && restaurant.location?.longitude) {
      const location = {
        lat: restaurant.location.latitude,
        lng: restaurant.location.longitude
      };
      console.log('🗺️ Valid location found:', location);
      return location;
    }

    console.log('🗺️ No valid location found for restaurant:', restaurant.name);
    return null;
  };

  // Fetch the API key from the backend
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch(`${API_URL}/config/google-api-key`);
        if (!response.ok) {
          throw new Error('Failed to fetch Google API key');
        }
        const data = await response.json();
        setApiKey(data.apiKey);
      } catch (err) {
        console.error('Error fetching Google API key:', err);
        setError('Failed to load map: API key not available');
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, [user]);

  // Helper to load the Google Maps API script dynamically
  const loadScript = (url: string) => {
    return new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.body.appendChild(script);
      } else {
        resolve();
      }
    });
  };

  // Initialize the map and add markers for each item
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    console.log('🗺️ Initializing map with items:', items);

    // Create a bounds object to fit all markers
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidLocations = false;

    // Set a default center (will be adjusted by bounds if markers exist)
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
      zoom: 10,
    });

    // Clear any existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Add a marker for each item with valid location
    items.forEach((item) => {
      const location = getRestaurantLocation(item);
      if (location) {
        hasValidLocations = true;
        const marker = new window.google.maps.Marker({
          position: location,
          map,
          title: item.name,
        });

        // Extend bounds to include this marker
        bounds.extend(location);

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="color: #000;"><strong>${item.name}</strong><br/>${item.vicinity || ''}<br/><a href="https://www.google.com/maps/place/?q=place_id:${item.place_id}" target="_blank">View on Google Maps</a></div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      }
    });

    // If we have valid locations, fit the map to show all markers
    if (hasValidLocations) {
      console.log('🗺️ Adjusting map bounds to fit markers');
      map.fitBounds(bounds);
      // Adjust zoom if too far out
      const zoom = map.getZoom();
      if (zoom && zoom > 15) {
        map.setZoom(15);
      }
    } else {
      console.log('🗺️ No valid locations found for any items');
    }
  }, [items]);

  // Load the script on first render and initialize the map
  useEffect(() => {
    if (!apiKey) return;
    
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    loadScript(scriptUrl)
      .then(() => {
        initializeMap();
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err);
        setError('Failed to load Google Maps');
      });
  }, [apiKey, initializeMap]);

  // Re-initialize markers whenever items change
  useEffect(() => {
    if (window.google && window.google.maps && mapRef.current) {
      initializeMap();
    }
  }, [items, initializeMap]);

  if (loading) {
    return (
      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Map View</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.mapContainer}>
        <Text style={styles.mapTitle}>Map View</Text>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <Text style={styles.mapTitle}>Map View</Text>
      <div ref={mapRef} style={{ width: '100%', height: 400 }}></div>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    marginTop: 20,
    padding: 20,
  },
  mapTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SmileySans',
    marginBottom: 15,
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 10,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
}); 