import { useState, useEffect } from "react";
import { CloudRain, Droplets, TrendingDown, AlertTriangle, X, MapPin, Activity } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  fetchDroughtData,
  getDroughtColor,
  type DroughtData,
  type HexCell,
} from "./droughtService";
import "./DroughtSection.css";

interface DroughtSectionProps {
  lat: number;
  lng: number;
  geometry?: any;
  onHexCellsReady?: (hexCells: HexCell[]) => void;
  selectedHex?: HexCell | null;
  onClearSelectedHex?: () => void;
}

export default function DroughtSection({
  lat,
  lng,
  geometry,
  onHexCellsReady,
  selectedHex,
  onClearSelectedHex,
}: DroughtSectionProps) {
  const { t, language } = useLanguage();
  const [data, setData] = useState<DroughtData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDroughtData();
  }, [lat, lng]);

  const loadDroughtData = async () => {
    try {
      setLoading(true);
      setError(null);
      const droughtData = await fetchDroughtData(lat, lng, geometry);
      setData(droughtData);

      // Send hex cells to parent for map overlay
      if (onHexCellsReady) {
        onHexCellsReady(droughtData.hexCells);
      }
    } catch (err) {
      setError(
        language === "TH"
          ? "ไม่สามารถโหลดข้อมูลภัยแล้งได้"
          : "Failed to load drought data"
      );
      console.error("Drought data error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="drought-loading">
        <div className="drought-loading-spinner" />
        <span className="drought-loading-text">
          {t("drought.loading")}
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="drought-loading">
        <AlertTriangle size={32} style={{ color: "#ef4444" }} />
        <span className="drought-loading-text">{error}</span>
      </div>
    );
  }

  const { fieldScore, rainfall30d, rainfallAvg30d, rainfallDeficit, dailyRainfall } = data;

  // SVG Gauge constants
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const progress = fieldScore.score / 100;
  const dashOffset = circumference * (1 - progress);

  // Max rainfall for chart scaling
  const maxRainfall = Math.max(...dailyRainfall.map((d) => d.precipitation), 1);

  const levelLabels: Record<string, Record<string, string>> = {
    low:      { TH: "ความเสี่ยงต่ำ",     EN: "Low Risk" },
    moderate: { TH: "ปานกลาง",           EN: "Moderate" },
    high:     { TH: "ความเสี่ยงสูง",      EN: "High Risk" },
    severe:   { TH: "รุนแรง",            EN: "Severe" },
    critical: { TH: "วิกฤต",            EN: "Critical" },
  };

  const levelBgColors: Record<string, string> = {
    low: "#fefce8",       // tailwind yellow-50
    moderate: "#fef9c3",  // tailwind yellow-100
    high: "#ffedd5",      // tailwind orange-100
    severe: "#fee2e2",    // tailwind red-100
    critical: "#fecaca",  // tailwind red-200
  };

  return (
    <div className="drought-section">
      {/* ===== Gauge ===== */}
      <div className="drought-gauge-container">
        <div className="drought-gauge">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle
              className="drought-gauge-bg"
              cx="80"
              cy="80"
              r={radius}
            />
            <circle
              className="drought-gauge-fill"
              cx="80"
              cy="80"
              r={radius}
              stroke={fieldScore.color}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="drought-gauge-center">
            <div
              className="drought-gauge-score"
              style={{ color: fieldScore.color }}
            >
              {fieldScore.score}
            </div>
            <div className="drought-gauge-label">{t("drought.riskScore")}</div>
          </div>
        </div>

        <div
          className="drought-level-badge"
          style={{
            background: levelBgColors[fieldScore.level],
            color: fieldScore.color,
          }}
        >
          <Droplets size={14} />
          {levelLabels[fieldScore.level]?.[language] || levelLabels[fieldScore.level]?.TH}
        </div>

        <div className="drought-data-date">
          {t("drought.dataDate")}: {data.dataDate}
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      <div className="drought-stats-row">
        <div className="drought-stat-card">
          <div
            className="drought-stat-icon"
            style={{ background: "#dbeafe" }}
          >
            <CloudRain size={18} style={{ color: "#3b82f6" }} />
          </div>
          <div className="drought-stat-value">
            {rainfall30d}
            <span className="drought-stat-unit">mm</span>
          </div>
          <div className="drought-stat-label">{t("drought.rainfall30d")}</div>
          <div className="drought-stat-sublabel">
            {t("drought.avg")}: {rainfallAvg30d} mm
          </div>
        </div>

        <div className="drought-stat-card">
          <div
            className="drought-stat-icon"
            style={{ background: rainfallDeficit > 0 ? "#fee2e2" : "#dcfce7" }}
          >
            <TrendingDown
              size={18}
              style={{ color: rainfallDeficit > 0 ? "#ef4444" : "#22c55e" }}
            />
          </div>
          <div
            className="drought-stat-value"
            style={{ color: rainfallDeficit > 0 ? "#ef4444" : "#22c55e" }}
          >
            {rainfallDeficit > 0 ? "-" : "+"}
            {Math.abs(rainfallDeficit)}
            <span className="drought-stat-unit">%</span>
          </div>
          <div className="drought-stat-label">{t("drought.vsAverage")}</div>
          <div className="drought-stat-sublabel">
            {t("drought.rainfallDeficit")}
          </div>
        </div>
      </div>

      <div className="drought-stats-row">
        <div className="drought-stat-card">
          <div
            className="drought-stat-icon"
            style={{ background: "#e0f2fe" }}
          >
            <CloudRain size={18} style={{ color: "#0ea5e9" }} />
          </div>
          <div className="drought-stat-value">{dailyRainfall.filter(d => d.precipitation > 0).length} <span className="drought-stat-unit">{language === "TH" ? "วัน" : "Days"}</span></div>
          <div className="drought-stat-label">{language === "TH" ? "วันที่ฝนตก" : "Rainy Days"}</div>
          <div className="drought-stat-sublabel">
            {language === "TH" ? "ย้อนหลัง 14 วัน" : "Last 14 days"}
          </div>
        </div>

        <div className="drought-stat-card">
          <div
            className="drought-stat-icon"
            style={{ background: levelBgColors[data.fieldInsideRisk] }}
          >
            <AlertTriangle
              size={18}
              style={{ color: getDroughtColor(fieldScore.score) }}
            />
          </div>
          <div
            className="drought-stat-value"
            style={{
              color: getDroughtColor(fieldScore.score),
              fontSize: 16,
            }}
          >
            {levelLabels[data.fieldInsideRisk]?.[language]}
          </div>
          <div className="drought-stat-label">{t("drought.insideField")}</div>
        </div>
      </div>

      {/* ===== Rainfall Chart ===== */}
      <div className="drought-chart-container">
        <div className="drought-chart-title">
          <CloudRain size={16} style={{ color: "#3b82f6" }} />
          {t("drought.rainfallChart")}
        </div>
        <div className="drought-chart-bars">
          {dailyRainfall.map((day, i) => {
            const barHeight = (day.precipitation / maxRainfall) * 80;
            const dayNum = new Date(day.date).getDate();
            return (
              <div key={i} className="drought-chart-bar-wrapper">
                <div className="drought-chart-bar-value">
                  {day.precipitation > 0 ? day.precipitation.toFixed(0) : ""}
                </div>
                <div
                  className="drought-chart-bar"
                  style={{
                    height: `${Math.max(barHeight, 2)}px`,
                    background:
                      day.precipitation > 10
                        ? "#3b82f6"
                        : day.precipitation > 0
                        ? "#93c5fd"
                        : "#e5e7eb",
                  }}
                  title={`${day.date}: ${day.precipitation} mm`}
                />
                <div className="drought-chart-bar-date">{dayNum}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Selected Hex Info ===== */}
      {selectedHex && (
        <div className="drought-hex-info">
          <div className="drought-hex-info-header">
            <div className="drought-hex-info-title">
              <MapPin size={16} style={{ color: "#3b82f6", marginRight: "6px" }} className="inline-block" /> 
              {t("drought.hexDetail")}
            </div>
            {onClearSelectedHex && (
              <button
                onClick={onClearSelectedHex}
                style={{ cursor: "pointer", border: "none", background: "none" }}
              >
                <X size={16} style={{ color: "#9ca3af" }} />
              </button>
            )}
          </div>
          <div className="drought-hex-info-row">
            <span className="drought-hex-info-label">
              {t("drought.riskScore")}
            </span>
            <span
              className="drought-hex-info-value"
              style={{ color: getDroughtColor(selectedHex.droughtScore) }}
            >
              {selectedHex.droughtScore} / 100
            </span>
          </div>
          <div className="drought-hex-info-row">
            <span className="drought-hex-info-label">
              {t("drought.riskLevel")}
            </span>
            <span className="drought-hex-info-value">
              {levelLabels[selectedHex.level]?.[language]}
            </span>
          </div>
          <div className="drought-hex-info-row">
            <span className="drought-hex-info-label">
              {t("drought.rainfall30d")}
            </span>
            <span className="drought-hex-info-value">
              {selectedHex.rainfall30d} mm
            </span>
          </div>

          <div className="drought-hex-info-row">
            <span className="drought-hex-info-label">
              {t("drought.rainfallDeficit")}
            </span>
            <span
              className="drought-hex-info-value"
              style={{
                color: selectedHex.rainfallDeficit > 0 ? "#ef4444" : "#22c55e",
              }}
            >
              {selectedHex.rainfallDeficit > 0 ? "-" : "+"}
              {Math.abs(selectedHex.rainfallDeficit)}%
            </span>
          </div>
        </div>
      )}

      {/* ===== Risk Legend ===== */}
      <div className="drought-legend-container">
        <div className="drought-legend-title">
          <AlertTriangle size={16} />
          {t("drought.riskLegend")}
        </div>
        <div className="drought-legend-items">
          {[
            { range: "0-49", color: "#fef08a", label: t("drought.legendLow") },
            { range: "50-59", color: "#fcd34d", label: t("drought.legendModerate") },
            { range: "60-69", color: "#fb923c", label: t("drought.legendHigh") },
            { range: "70-79", color: "#f87171", label: t("drought.legendSevere") },
            { range: "80-100", color: "#dc2626", label: t("drought.legendCritical") },
          ].map((item, i) => (
            <div key={i} className="drought-legend-item">
              <div
                className="drought-legend-color"
                style={{ background: item.color }}
              />
              <span className="drought-legend-range">{item.range}</span>
              <span className="drought-legend-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Risk Factors ===== */}
      <div className="drought-factors-container">
        <div className="drought-chart-title">
          <Activity size={18} style={{ color: "#8b5cf6", marginRight: "6px" }} className="inline-block" /> 
          {t("drought.riskFactors")}
        </div>

        {/* Rainfall Factor */}
        <div className="drought-factor-item">
          <div
            className="drought-factor-icon"
            style={{ background: "#dbeafe" }}
          >
            <CloudRain size={16} style={{ color: "#3b82f6" }} />
          </div>
          <div className="drought-factor-content">
            <div className="drought-factor-name">
              {t("drought.rainfallFactor")}
            </div>
            <div className="drought-factor-value">
              {rainfall30d} / {rainfallAvg30d} mm ({t("drought.weight")}: 100%)
            </div>
            <div className="drought-factor-bar">
              <div
                className="drought-factor-bar-fill"
                style={{
                  width: `${Math.min(100, (rainfall30d / rainfallAvg30d) * 100)}%`,
                  background: "#3b82f6",
                }}
              />
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
