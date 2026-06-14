import { useState, useCallback } from "react";
import {
  ChevronLeft,
  Grid3X3,
  Pencil,
  Trash2,
  Download,
  MapPin,
  LocateFixed,
  RefreshCw,
  Copy,
  Flame,
  Sprout
} from "lucide-react";
import Swal from "sweetalert2";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useFieldActions } from "../../../hooks/useFieldActions";
import DroughtSection from "../DroughtSection";
import type { HexCell } from "../droughtService";
import type { Map as MaplibreMap } from "maplibre-gl";

// Custom VectorSquare Icon
const VectorSquareIcon = ({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19.5 7a24 24 0 0 1 0 10" />
    <path d="M4.5 7a24 24 0 0 0 0 10" />
    <path d="M7 19.5a24 24 0 0 0 10 0" />
    <path d="M7 4.5a24 24 0 0 1 10 0" />
    <rect x="17" y="17" width="5" height="5" rx="1" />
    <rect x="17" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="17" width="5" height="5" rx="1" />
    <rect x="2" y="2" width="5" height="5" rx="1" />
  </svg>
);

interface Field {
  id: string;
  name: string;
  area_m2: number;
  address?: string;
  centroid_lat: number;
  centroid_lng: number;
  geometry: any;
  variety?: string;
  planting_date?: string;
  planting_season?: string;
}

interface DesktopDroughtPanelProps {
  field: Field;
  thumbnail: string | null;
  onBack: () => void;
  mapRef?: React.MutableRefObject<MaplibreMap | null>;
}

export default function DesktopDroughtPanel({
  field,
  thumbnail,
  onBack,
  mapRef,
}: DesktopDroughtPanelProps) {
  const { t, language } = useLanguage();
  const fieldActions = useFieldActions(field, onBack);

  const [showAreaInSqm, setShowAreaInSqm] = useState(false);
  const [showCoordsInUTM, setShowCoordsInUTM] = useState(false);
  const [selectedHex, setSelectedHex] = useState<HexCell | null>(null);

  // Format area
  const formatArea = (areaM2: number) => {
    const rai = Math.floor(areaM2 / 1600);
    const ngan = Math.floor((areaM2 % 1600) / 400);
    const tarangwa = Math.floor((areaM2 % 400) / 4);
    return { rai, ngan, tarangwa };
  };
  const area = formatArea(field.area_m2 || 0);

  // Convert LatLng to UTM
  const latLngToUTM = (lat: number, lng: number) => {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? "N" : "S";
    const a = 6378137;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e = Math.sqrt(2 * f - f * f);
    const e2 = e * e;
    const ep2 = e2 / (1 - e2);
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const lng0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
    const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
    const T = Math.tan(latRad) ** 2;
    const C = ep2 * Math.cos(latRad) ** 2;
    const A = (lngRad - lng0) * Math.cos(latRad);
    const M =
      a *
      ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * latRad -
        ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) *
          Math.sin(2 * latRad) +
        ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * latRad) -
        ((35 * e2 ** 3) / 3072) * Math.sin(6 * latRad));
    const easting =
      k0 *
        N *
        (A +
          ((1 - T + C) * A ** 3) / 6 +
          ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) +
      500000;
    let northing =
      k0 *
      (M +
        N *
          Math.tan(latRad) *
          (A ** 2 / 2 +
            ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
            ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
    if (lat < 0) northing += 10000000;
    return { zone, hemisphere, easting: Math.round(easting), northing: Math.round(northing) };
  };

  const utm = latLngToUTM(field.centroid_lat || 0, field.centroid_lng || 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: t("copy.success"),
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
        });
      })
      .catch(() => {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: t("copy.failed"),
          showConfirmButton: false,
          timer: 1500,
        });
      });
  };

  // Clean up hex layers from map
  const cleanupHexLayers = useCallback(() => {
    const map = mapRef?.current;
    if (!map) return;

    try {
      if (map.getLayer("drought-hex-fill")) map.removeLayer("drought-hex-fill");
      if (map.getLayer("drought-hex-outline")) map.removeLayer("drought-hex-outline");
      if (map.getLayer("drought-hex-highlight")) map.removeLayer("drought-hex-highlight");
      if (map.getSource("drought-hex-source")) map.removeSource("drought-hex-source");
      if (map.getSource("drought-hex-highlight-source")) map.removeSource("drought-hex-highlight-source");
    } catch (e) {
      // ignore
    }
  }, [mapRef]);

  // Render hex grid on map
  const handleHexCellsReady = useCallback(
    (hexCells: HexCell[]) => {
      const map = mapRef?.current;
      if (!map || !map.isStyleLoaded()) return;

      // Clean up previous layers
      cleanupHexLayers();

      // Create GeoJSON for hex cells
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: hexCells.map((hex) => ({
          type: "Feature",
          properties: {
            id: hex.id,
            score: hex.droughtScore,
            color: hex.color,
            level: hex.level,
            rainfall30d: hex.rainfall30d,
            rainfallAvg: hex.rainfallAvg,
            rainfallDeficit: hex.rainfallDeficit,
          },
          geometry: hex.geometry,
        })),
      };

      // Add source
      map.addSource("drought-hex-source", {
        type: "geojson",
        data: geojson,
      });

      // Add fill layer
      map.addLayer({
        id: "drought-hex-fill",
        type: "fill",
        source: "drought-hex-source",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.4,
        },
      });

      // Add outline layer
      map.addLayer({
        id: "drought-hex-outline",
        type: "line",
        source: "drought-hex-source",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
      });

      // Click handler for hex cells
      map.on("click", "drought-hex-fill", (e: any) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const hex: HexCell = {
            id: props.id,
            geometry: e.features[0].geometry as GeoJSON.Polygon,
            center: [0, 0],
            droughtScore: props.score,
            level: props.level,
            color: props.color,
            rainfall30d: props.rainfall30d,
            rainfallAvg: props.rainfallAvg,
            rainfallDeficit: props.rainfallDeficit,
          };
          setSelectedHex(hex);

          // Highlight this hex
          try {
            if (map.getLayer("drought-hex-highlight")) map.removeLayer("drought-hex-highlight");
            if (map.getSource("drought-hex-highlight-source")) map.removeSource("drought-hex-highlight-source");
          } catch (err) { /* ignore */ }

          map.addSource("drought-hex-highlight-source", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: e.features[0].geometry,
              properties: {},
            },
          });

          map.addLayer({
            id: "drought-hex-highlight",
            type: "line",
            source: "drought-hex-highlight-source",
            paint: {
              "line-color": "#ffffff",
              "line-width": 3,
            },
          });
        }
      });

      // Cursor change
      map.on("mouseenter", "drought-hex-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "drought-hex-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    },
    [mapRef, cleanupHexLayers]
  );

  // Handle back — clean up map layers
  const handleBack = () => {
    cleanupHexLayers();
    onBack();
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        bottom: 16,
        zIndex: 30,
        width: 350,
      }}
    >
      <div className="w-full h-full bg-gray-50 rounded-[32px] shadow-xl pointer-events-auto relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-gray-700 hover:text-green-600 hover:border-green-600 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 flex-1 text-center">
              {t("field.details")}
            </h2>
            <div className="w-12 h-12" />
          </div>
        </div>

        {/* Fixed Content — Field Info Card */}
        <div className="shrink-0 px-4">
          {/* Field Info Card */}
          <div className="bg-white rounded-3xl p-3.5 mb-3 shadow-sm border border-gray-100">
            <div className="flex gap-2.5">
              {/* Thumbnail */}
              <div className="shrink-0">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="Field thumbnail"
                    className="w-[94px] h-[94px] rounded-3xl object-cover shadow-sm"
                    style={{ border: "1px solid #e5e7eb" }}
                  />
                ) : (
                  <div
                    className="w-[94px] h-[94px] rounded-3xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-inner"
                  >
                    <Sprout className="text-gray-300" size={36} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                {/* Name + Buttons */}
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xl font-bold text-gray-800 leading-none">
                    {field.name}
                  </h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={fieldActions.handleEdit}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-200 shadow-sm"
                      title={t("action.edit")}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={fieldActions.handleDelete}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-200 shadow-sm"
                      title={t("action.delete")}
                    >
                      <Trash2 size={10} />
                    </button>
                    <button
                      onClick={fieldActions.handleDownload}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-200 shadow-sm"
                      title={t("action.download")}
                    >
                      <Download size={10} />
                    </button>
                  </div>
                </div>

                {/* Info Lines */}
                <div className="flex flex-col gap-1">
                  {/* Area */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <VectorSquareIcon size={11} color="#F6B010" />
                      <span className="text-[11px] text-gray-600 leading-none">
                        {showAreaInSqm
                          ? `${(field.area_m2 || 0).toFixed(2)} ${t("unit.sqm")}`
                          : `${area.rai} ${t("field.rai")} ${area.ngan} ${t("field.ngan")} ${area.tarangwa} ${t("field.sqWa")}`}
                      </span>
                    </div>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowAreaInSqm(!showAreaInSqm)}
                      title={showAreaInSqm ? t("unit.changeToRai") : t("unit.changeToSqm")}
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-1.5">
                    <MapPin
                      size={11}
                      style={{ color: "#F6B010" }}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-[11px] text-gray-600 leading-tight">
                      {field.address || t("field.addressFallback")}
                    </span>
                  </div>

                  {/* Coordinates */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <LocateFixed size={11} style={{ color: "#F6B010" }} />
                      <span className="text-[11px] text-gray-600 leading-none">
                        {showCoordsInUTM
                          ? `${utm.zone}${utm.hemisphere} ${utm.easting}E ${utm.northing}N`
                          : `${field.centroid_lat?.toFixed(4)} ${field.centroid_lng?.toFixed(4)}`}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() =>
                          copyToClipboard(
                            showCoordsInUTM
                              ? `${utm.zone}${utm.hemisphere} ${utm.easting}E ${utm.northing}N`
                              : `${field.centroid_lat}, ${field.centroid_lng}`
                          )
                        }
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowCoordsInUTM(!showCoordsInUTM)}
                        title={showCoordsInUTM ? t("unit.changeToLatLng") : t("unit.changeToUTM")}
                      >
                        <RefreshCw size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drought Section Title Bar */}
          <div className="flex items-center justify-between py-2 px-1 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-sm border border-orange-200">
                <Flame className="text-orange-500" size={18} strokeWidth={2} />
              </div>
              <span className="text-[16px] font-bold text-gray-800 tracking-tight">
                {t("feature.droughtRisk")}
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span style={{ fontSize: 12, color: "#073B1A" }}>
                {language === "TH" ? "เมนู" : "Menu"}
              </span>
              <button
                type="button"
                onClick={handleBack}
                style={{
                  width: 40,
                  height: 40,
                  background: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  marginLeft: 8,
                }}
              >
                <Grid3X3 size={16} style={{ color: "#073B1A" }} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Drought Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <DroughtSection
            lat={field.centroid_lat}
            lng={field.centroid_lng}
            geometry={field.geometry}
            onHexCellsReady={handleHexCellsReady}
            selectedHex={selectedHex}
            onClearSelectedHex={() => setSelectedHex(null)}
          />
        </div>
      </div>

      {/* Modals */}
      {fieldActions?.EditModal}
      {fieldActions?.DownloadPanel}
    </div>
  );
}
