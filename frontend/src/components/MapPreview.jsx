import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Tile source config by (mode, style)
const TILES = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
  },
  relief: {
    harbor: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
      attribution: "USGS 3DEP, NOAA · Esri",
    },
    chart: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: "© OpenTopoMap (CC-BY-SA)",
      subdomains: "abc",
    },
    basalt: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Esri World Imagery",
    },
  },
};

const OVERLAY = {
  harbor: "linear-gradient(160deg, rgba(14,34,49,0.35), rgba(11,28,41,0.55))",
  chart: "linear-gradient(160deg, rgba(205,123,65,0.10), rgba(11,28,41,0.30))",
  basalt: "linear-gradient(160deg, rgba(0,0,0,0.35), rgba(11,28,41,0.55))",
};

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

export default function MapPreview({ lat, lng, mode, style, mapRef }) {
  const config = mode === "streets" ? TILES.streets : (TILES.relief[style] || TILES.relief.harbor);
  const overlay = mode === "streets" ? "linear-gradient(160deg, rgba(14,34,49,0.15), rgba(11,28,41,0.35))" : (OVERLAY[style] || OVERLAY.harbor);

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
        <TileLayer key={`${mode}-${style}`} url={config.url} subdomains={config.subdomains || "abc"} />
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
      <div className="absolute inset-0 pointer-events-none" style={{ background: overlay }} />
    </div>
  );
}
