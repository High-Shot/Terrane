import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Tile source config by (mode, style)
const TILES = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
    maxNativeZoom: 19,
  },
  relief: {
    harbor: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
      attribution: "USGS 3DEP, NOAA · Esri",
      maxNativeZoom: 13,
    },
    chart: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: "© OpenTopoMap (CC-BY-SA)",
      subdomains: "abc",
      maxNativeZoom: 17,
    },
    basalt: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri World Imagery",
      maxNativeZoom: 19,
    },
  },
};

const OVERLAY = {
  harbor: "linear-gradient(160deg, rgba(14,34,49,0.35), rgba(11,28,41,0.55))",
  chart: "linear-gradient(160deg, rgba(205,123,65,0.10), rgba(11,28,41,0.30))",
  basalt: "linear-gradient(160deg, rgba(0,0,0,0.35), rgba(11,28,41,0.55))",
};

function Recenter({ lat, lng, routeBounds }) {
  const map = useMap();
  useEffect(() => {
    if (routeBounds && routeBounds.length === 2) {
      map.flyToBounds(routeBounds, { padding: [40, 40], maxZoom: 13, duration: 0.8 });
    } else {
      map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
    }
  }, [lat, lng, routeBounds, map]);
  return null;
}

export default function MapPreview({ lat, lng, mode, style, mapRef, routePoints, routeColor = "#cd7b41", routeBounds }) {
  const config = mode === "streets" ? TILES.streets : (TILES.relief[style] || TILES.relief.harbor);
  const overlay = mode === "streets" ? "linear-gradient(160deg, rgba(14,34,49,0.15), rgba(11,28,41,0.35))" : (OVERLAY[style] || OVERLAY.harbor);
  const hasRoute = Array.isArray(routePoints) && routePoints.length > 1;

  return (
    <div className="absolute inset-0">
      <MapContainer
        ref={mapRef}
        center={[lat, lng]}
        zoom={11}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#0e2231" }}
        className={mode === "relief" && style === "basalt" ? "terrane-dark" : ""}
      >
        <TileLayer key={`${mode}-${style}`} url={config.url} subdomains={config.subdomains || "abc"} maxNativeZoom={config.maxNativeZoom || 18} maxZoom={19} />
        {hasRoute && (
          <>
            <Polyline positions={routePoints} pathOptions={{ color: "#0b1c29", weight: 6, opacity: 0.6 }} />
            <Polyline positions={routePoints} pathOptions={{ color: routeColor, weight: 3.5, opacity: 1 }} />
            <CircleMarker center={routePoints[0]} radius={5} pathOptions={{ color: "#f2ead6", fillColor: routeColor, fillOpacity: 1, weight: 2 }} />
            <CircleMarker center={routePoints[routePoints.length - 1]} radius={5} pathOptions={{ color: "#f2ead6", fillColor: "#0b1c29", fillOpacity: 1, weight: 2 }} />
          </>
        )}
        <Recenter lat={lat} lng={lng} routeBounds={routeBounds} />
      </MapContainer>
      <div className="absolute inset-0 pointer-events-none" style={{ background: overlay }} />
    </div>
  );
}
