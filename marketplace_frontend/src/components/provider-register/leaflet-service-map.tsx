'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletServiceMapProps {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  onCenterChange: (lat: number, lng: number) => void;
}

export default function LeafletServiceMap({
  centerLat,
  centerLng,
  radiusKm,
  onCenterChange,
}: LeafletServiceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      [centerLat, centerLng],
      13,
    );
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #006948; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">
              📍
             </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker([centerLat, centerLng], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([centerLat, centerLng], {
      color: '#006948',
      fillColor: '#006948',
      fillOpacity: 0.15,
      radius: radiusKm * 1000,
    }).addTo(map);
    circleRef.current = circle;

    // Events
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      const lat = parseFloat(pos.lat.toFixed(6));
      const lng = parseFloat(pos.lng.toFixed(6));
      onCenterChange(lat, lng);
    });

    map.on('click', (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      onCenterChange(lat, lng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker & circle when props change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([centerLat, centerLng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([centerLat, centerLng]);
      circleRef.current.setRadius(radiusKm * 1000);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([centerLat, centerLng]);
    }
  }, [centerLat, centerLng, radiusKm]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-80 rounded-xl border border-border overflow-hidden shadow-inner relative z-0"
    />
  );
}

