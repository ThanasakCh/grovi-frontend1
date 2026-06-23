import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useField } from "../../contexts/FieldContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useResponsive } from "../../hooks/useResponsive";
import WeatherSection from "./WeatherSection";

export default function WeatherPage() {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { fields, currentField, getField } = useField();
  const { isDesktop } = useResponsive();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const field = fields.find((f) => f.id === fieldId) || currentField;

  useEffect(() => {
    if (!fieldId) {
      navigate("/Grovi-cropmonitoring");
      return;
    }
    loadField();
  }, [fieldId]);

  useEffect(() => {
    if (field && mapContainerRef.current && !mapRef.current && !isLoading) {
      initializeMap();
    }
  }, [field, isLoading]);

  const loadField = async () => {
    if (!fieldId) return;
    try {
      setIsLoading(true);
      await getField(fieldId);
    } catch (error) {
      console.error("Failed to load field:", error);
      navigate("/Grovi-cropmonitoring");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || !field || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
        },
        layers: [{ id: "esri-layer", type: "raster", source: "esri" }],
      },
      center: [field.centroid_lng, field.centroid_lat],
      zoom: 15,
      interactive: true,
    });

    map.on("load", () => {
      // Add field boundary
      map.addSource("field", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: field.geometry,
          properties: {},
        },
      });

      map.addLayer({
        id: "field-fill",
        type: "fill",
        source: "field",
        paint: {
          "fill-color": "#fde047",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "field-outline",
        type: "line",
        source: "field",
        paint: {
          "line-color": "#ef4444",
          "line-width": 3,
        },
      });

      // Fit to field bounds
      const coords = field.geometry.coordinates[0] as [number, number][];
      const bounds = coords.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 5 });
    });

    mapRef.current = map;
  };

  // Desktop → redirect to field detail
  if (isDesktop) {
    navigate(`/Grovi-cropmonitoring/field/${fieldId}`, { replace: true });
    return null;
  }

  if (isLoading || !field) {
    return (
      <div
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center"
        style={{ background: "#f8fafc" }}
      >
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">{t("loading.message")}</p>
      </div>
    );
  }

  const addressText =
    (language === "EN" ? field.address_en : field.address) ||
    `${field.centroid_lat?.toFixed(4)}, ${field.centroid_lng?.toFixed(4)}`;

  // ========== MOBILE LAYOUT ==========
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#f4f3ef", zIndex: 9999 }}
    >
      {/* Header */}
      <header
        className="flex items-center px-4 py-3 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #43a047, #2e7d32)",
          color: "white",
          position: "relative",
          height: "auto",
          minHeight: "50px",
          border: "none",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <button
          onClick={() => navigate(`/Grovi-cropmonitoring/field/${fieldId}`)}
          className="w-9 h-9 rounded-full flex items-center justify-center mr-3 transition-colors"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 style={{ fontSize: "17px", fontWeight: 600 }}>
          {t("feature.weather")}
        </h1>
      </header>

      {/* Map Section — Same as Health/Analysis */}
      <div
        className="relative flex-shrink-0"
        style={{
          height: "37vh",
          minHeight: "180px",
          padding: "8px 12px",
          background: "#f4f3ef",
        }}
      >
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        />
      </div>

      {/* Weather Content — Scrollable */}
      <div
        className="flex-1 overflow-y-auto relative z-10"
        style={{ background: "#f4f3ef", paddingTop: "0" }}
      >
        <div className="px-3 pb-3">
          <WeatherSection
            lat={field.centroid_lat}
            lng={field.centroid_lng}
            address={addressText}
          />
        </div>
      </div>
    </div>
  );
}
