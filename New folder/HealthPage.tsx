import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import L from "leaflet";
import { useField } from "../contexts/FieldContext";
import axios from "../config/axios";
import { getImageUrl } from "../config/api";
import { ChevronLeft, BarChart3, ScanSearch, Activity } from "lucide-react";

interface VISnapshot {
  id: string;
  field_id: string;
  user_id: string;
  vi_type: string;
  snapshot_date: string;
  mean_value: number;
  min_value?: number;
  max_value?: number;
  overlay_data?: string;
  status_message?: string;
  created_at: string;
}

const HealthPage: React.FC = () => {
  const { fieldId } = useParams<{ fieldId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  const { getField, currentField } = useField();
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedVI, setSelectedVI] = useState("NDVI");
  const [snapshots, setSnapshots] = useState<VISnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<VISnapshot | null>(
    null
  );

  const viTypes = [
    {
      code: "NDVI",
      name: "NDVI",
      description: "Normalized Difference Vegetation Index",
      range: { min: 0, max: 1, label: "ความหนาแน่นพืช", color: "#4CAF50" },
    },
    {
      code: "EVI",
      name: "EVI",
      description: "Enhanced Vegetation Index",
      range: { min: 0, max: 1, label: "การเจริญเติบโต", color: "#8BC34A" },
    },
    {
      code: "GNDVI",
      name: "GNDVI",
      description: "Green Normalized Difference Vegetation Index",
      range: { min: 0, max: 1, label: "ใบสีเขียว", color: "#CDDC39" },
    },
    {
      code: "NDWI",
      name: "NDWI",
      description: "Normalized Difference Water Index",
      range: { min: -0.5, max: 0.5, label: "ความชื้น", color: "#2196F3" },
    },
    {
      code: "SAVI",
      name: "SAVI",
      description: "Soil Adjusted Vegetation Index",
      range: { min: 0, max: 1, label: "พืชปรับดิน", color: "#FF9800" },
    },
    {
      code: "VCI",
      name: "VCI",
      description: "Vegetation Condition Index",
      range: { min: 0, max: 100, label: "สภาพพืช (%)", color: "#9C27B0" },
    },
  ];

  useEffect(() => {
    if (!fieldId) {
      navigate("/map");
      return;
    }
    loadField();
  }, [fieldId]);

  useEffect(() => {
    if (currentField && mapContainerRef.current && !mapRef.current) {
      initializeMap();
    }
  }, [currentField]);

  useEffect(() => {
    if (currentField) {
      loadSnapshots();
    }
  }, [currentField, selectedVI]);

  const loadField = async () => {
    if (!fieldId) return;

    try {
      setIsLoading(true);
      await getField(fieldId);
    } catch (error: any) {
      console.error("Failed to load field:", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลแปลงได้: " + error.message,
        icon: "error",
        confirmButtonText: "ตกลง",
      });
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainerRef.current || !currentField || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([currentField.centroid_lat, currentField.centroid_lng], 15);

    const esriSatellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          'Tiles © <a href="https://www.esri.com/" target="_blank">Esri</a> — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    ).addTo(map);

    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }
    );

    L.control
      .layers(
        {
          "Esri Satellite": esriSatellite,
          OpenStreetMap: osmLayer,
        },
        {},
        {
          position: "topleft",
        }
      )
      .addTo(map);

    if (currentField.geometry) {
      const fieldLayer = L.geoJSON(currentField.geometry, {
        style: {
          color: "#ff0000",
          weight: 2,
          fillOpacity: 0.05,
        },
      }).addTo(map);

      map.fitBounds(fieldLayer.getBounds(), { padding: [20, 20] });
    }

    map.on("mouseover", () => {
      if (overlayRef.current) {
        map.getContainer().style.cursor = "crosshair";
      }
    });

    map.on("mouseout", () => {
      map.getContainer().style.cursor = "";
    });

    mapRef.current = map;
  };

  const loadSnapshots = async () => {
    if (!fieldId) return;

    try {
      console.log(
        `Loading snapshots for field ${fieldId}, VI type: ${selectedVI}`
      );
      const response = await axios.get(`/vi-analysis/snapshots/${fieldId}`, {
        params: { vi_type: selectedVI, limit: 4 },
      });

      console.log("Snapshots response:", response.data);
      const sortedSnapshots = response.data.sort(
        (a: VISnapshot, b: VISnapshot) =>
          new Date(b.snapshot_date).getTime() -
          new Date(a.snapshot_date).getTime()
      );

      setSnapshots(sortedSnapshots);

      // Auto-select latest snapshot
      if (sortedSnapshots.length > 0) {
        setSelectedSnapshot(sortedSnapshots[0]);
        displayOverlay(sortedSnapshots[0]);
      } else {
        setSelectedSnapshot(null);
        clearOverlay();
      }
    } catch (error) {
      console.error("Failed to load snapshots:", error);
      setSnapshots([]);
      setSelectedSnapshot(null);
    }
  };

  const displayOverlay = (snapshot: VISnapshot) => {
    if (!mapRef.current || !currentField || !snapshot.overlay_data) {
      console.log("❌ Cannot display overlay:", {
        hasMap: !!mapRef.current,
        hasField: !!currentField,
        hasOverlayData: !!snapshot.overlay_data,
        overlayData: snapshot.overlay_data,
      });
      return;
    }

    console.log("🎯 Displaying overlay for snapshot:", {
      snapshotId: snapshot.id,
      overlayData: snapshot.overlay_data,
      imageUrl: getImageUrl(snapshot.overlay_data),
    });

    clearOverlay();
    const fieldLayer = L.geoJSON(currentField.geometry);
    const bounds = fieldLayer.getBounds();

    console.log("📍 Field bounds:", bounds);

    overlayRef.current = L.imageOverlay(
      getImageUrl(snapshot.overlay_data),
      bounds,
      {
        opacity: 0.8,
      }
    ).addTo(mapRef.current);

    console.log("✅ Overlay added to map");
  };

  const clearOverlay = () => {
    if (overlayRef.current && mapRef.current) {
      mapRef.current.removeLayer(overlayRef.current);
      overlayRef.current = null;
    }
  };

  const handleAnalyze = async () => {
    if (!fieldId) return;

    try {
      setIsAnalyzing(true);
      console.log("Starting analysis to fetch latest 4 cloud-masked images...");

      // Clear old snapshots before fetching new ones
      try {
        console.log("🗑️ Clearing old snapshots...");
        await axios.delete(`/vi-analysis/snapshots/${fieldId}`, {
          params: { vi_type: selectedVI },
        });
        console.log("✅ Old snapshots cleared");
      } catch (clearError) {
        console.warn(
          "Failed to clear old snapshots, continuing...",
          clearError
        );
      }

      // Fetch latest cloud-masked images
      const response = await axios.post(
        `/vi-analysis/${fieldId}/analyze-historical`,
        null,
        {
          params: {
            vi_type: selectedVI,
            count: 4, // Request 4 unique images
            clear_old: true, // Ensure clean data
          },
        }
      );

      const data = response.data;
      console.log("Historical analysis completed:", data);

      // Reload snapshots to show all new ones
      await loadSnapshots();

      if (data.snapshots_created === 0) {
        Swal.fire({
          title: "แจ้งเตือน",
          text: `⚠️ ไม่สามารถดึงข้อมูลดาวเทียมได้\n\nสาเหตุที่เป็นไปได้:\n• ไม่มีข้อมูลดาวเทียมใสสำหรับพื้นที่นี้\n• Google Earth Engine ยังไม่ได้ตั้งค่า\n• การเชื่อมต่ออินเทอร์เน็ตมีปัญหา\n\nกรุณาลองใหม่อีกครั้ง`,
          icon: "warning",
          confirmButtonText: "ตกลง",
        });
      } else {
        Swal.fire({
          title: "สำเร็จ",
          text: `วิเคราะห์เสร็จสิ้น!\n\nได้ข้อมูล ${selectedVI} จริงจากดาวเทียม:\n• ${data.snapshots_created} ภาพ\n• ${data.unique_dates} วันที่แตกต่างกัน\n• ข้อมูลใสไร้เมฆ`,
          icon: "success",
          confirmButtonText: "ตกลง",
        });
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text:
          "การวิเคราะห์ไม่สำเร็จ: " +
          (error.response?.data?.detail || error.message),
        icon: "error",
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScorePercentage = (): number => {
    if (!selectedSnapshot) return 0;
    const viConfig = viTypes.find((v) => v.code === selectedVI);
    const range = viConfig?.range || { min: 0, max: 1 };
    return Math.max(
      0,
      Math.min(
        100,
        ((selectedSnapshot.mean_value - range.min) / (range.max - range.min)) *
          100
      )
    );
  };

  const getHealthStatus = (
    value: number,
    viType: string
  ): { status: string; color: string; description: string } => {
    const viConfig = viTypes.find((v) => v.code === viType);
    if (!viConfig)
      return {
        status: "ไม่ทราบ",
        color: "#6b7280",
        description: "ไม่สามารถประเมินได้",
      };

    const percentage =
      ((value - viConfig.range.min) /
        (viConfig.range.max - viConfig.range.min)) *
      100;

    if (viType === "NDWI") {
      if (percentage < 30)
        return {
          status: "แห้งแล้ง",
          color: "#ef4444",
          description: "ความชื้นในดินต่ำ",
        };
      if (percentage < 70)
        return {
          status: "พอเหมาะ",
          color: "#f59e0b",
          description: "ความชื้นปานกลาง",
        };
      return {
        status: "ชุ่มชื้น",
        color: "#10b981",
        description: "ความชื้นสูง",
      };
    }

    if (percentage < 30)
      return { status: "ต่ำ", color: "#ef4444", description: "ต้องปรับปรุง" };
    if (percentage < 60)
      return { status: "ปานกลาง", color: "#f59e0b", description: "สภาพพอใช้" };
    if (percentage < 80)
      return { status: "ดี", color: "#10b981", description: "สภาพดี" };
    return { status: "ดีเยี่ยม", color: "#059669", description: "สภาพดีมาก" };
  };

  const handleSnapshotClick = (snapshot: VISnapshot) => {
    setSelectedSnapshot(snapshot);
    displayOverlay(snapshot);
  };

  const handleBackClick = () => {
    navigate(`/field/${fieldId}`);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = (date.getFullYear() + 543).toString().slice(-2); // Buddhist year
    return `${day}/${month}/${year}`;
  };

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <section className="page active">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ fontSize: "48px" }}>🛰️</div>
          <div style={{ fontSize: "18px", color: "#6b7280" }}>
            กำลังโหลดข้อมูลแปลง...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active health-page">
      <div className="work">
        {/* Map Section */}
        <div className="map-pane">
          <div ref={mapContainerRef} className="map" />

          {/* Map Toolbar */}
          <div
            className="toolbar"
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              zIndex: 1000,
              marginTop: "50px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              backgroundColor: "transparent",
              padding: "0px",
            }}
          >
            {/* Zoom Control */}
            <div
              style={{
                width: "40px",
                height: "80px",
                backgroundColor: "#FFFFFF",
                borderRadius: "20px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "none",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <button
                className="toolbtn-zoom"
                title="ซูมเข้า"
                onClick={() => mapRef.current?.zoomIn()}
                style={{
                  flex: 1,
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#006400",
                }}
              >
                +
              </button>
              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "rgba(0, 100, 0, 0.2)",
                }}
              ></div>
              <button
                className="toolbtn-zoom"
                title="ซูมออก"
                onClick={() => mapRef.current?.zoomOut()}
                style={{
                  flex: 1,
                  border: "none",
                  backgroundColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#006400",
                }}
              >
                −
              </button>
            </div>

            {/* Compass Button */}
            <button
              className="toolbtn-circle"
              title="เข็มทิศ"
              onClick={() =>
                Swal.fire({
                  title: "กำลังพัฒนา",
                  text: "เข็มทิศ (จะพัฒนาในเวอร์ชันถัดไป)",
                  icon: "info",
                  confirmButtonText: "ตกลง",
                })
              }
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
                  fill="#006400"
                />
                <circle cx="12" cy="12" r="2" fill="#006400" />
              </svg>
            </button>

            {/* Measurement Button */}
            <button
              className="toolbtn-circle"
              title="วัดระยะทาง"
              onClick={() =>
                Swal.fire({
                  title: "กำลังพัฒนา",
                  text: "โหมดวัดระยะ (จะพัฒนาในเวอร์ชันถัดไป)",
                  icon: "info",
                  confirmButtonText: "ตกลง",
                })
              }
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 21L21 3" stroke="#006400" strokeWidth="2" />
                <path d="M3 3h6v6" stroke="#006400" strokeWidth="2" />
                <path d="M15 15h6v6" stroke="#006400" strokeWidth="2" />
                <circle cx="6" cy="6" r="1" fill="#006400" />
                <circle cx="18" cy="18" r="1" fill="#006400" />
              </svg>
            </button>

            {/* Location Button */}
            <button
              className="toolbtn-circle"
              title="ตำแหน่งของฉัน"
              onClick={() =>
                mapRef.current?.locate({
                  setView: true,
                  maxZoom: 19,
                  enableHighAccuracy: true,
                })
              }
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#006400" />
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="#006400"
                  strokeWidth="2"
                  fill="none"
                />
                <path d="M12 2v4" stroke="#006400" strokeWidth="2" />
                <path d="M12 18v4" stroke="#006400" strokeWidth="2" />
                <path d="M2 12h4" stroke="#006400" strokeWidth="2" />
                <path d="M18 12h4" stroke="#006400" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {/* VI Legend - Bottom Right */}
          {selectedSnapshot && (
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.95)",
                padding: "12px 16px",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                fontSize: "12px",
                minWidth: "180px",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#1a1a1a",
                  fontSize: "13px",
                }}
              >
                {selectedVI} Scale
              </div>

              {/* Color gradient bar */}
              <div
                style={{
                  height: "20px",
                  background:
                    "linear-gradient(to right, #d73027, #fc8d59, #fee08b, #d9ef8b, #91cf60, #1a9850)",
                  borderRadius: "4px",
                  marginBottom: "6px",
                  border: "1px solid #ddd",
                }}
              />

              {/* Value labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                <span>ต่ำ (0.0)</span>
                <span>สูง (1.0)</span>
              </div>

              {/* Current value */}
              {selectedSnapshot.mean_value !== undefined && (
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px solid #e0e0e0",
                    fontSize: "11px",
                    color: "#444",
                  }}
                >
                  <strong>ค่าเฉลี่ย:</strong>{" "}
                  {selectedSnapshot.mean_value.toFixed(3)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="sidebar" style={{ background: "#f8f9fa" }}>
          {/* Header */}
          <div
            className="backbar"
            style={{
              background: "white",
              color: "#374151",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              margin: "0 0 20px 0",
            }}
          >
            <button
              className="backbtn"
              onClick={handleBackClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              ติดตามความสมบูรณ์ข้าว
            </h3>
          </div>

          {/* VI Selector */}
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "16px",
              marginBottom: "24px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "2px solid #e5e7eb",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={24} color="white" />
              </div>
              <div>
                <h4
                  style={{
                    margin: "0 0 4px 0",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  เลือกดัชนีพืช
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  เลือกดัชนีที่ต้องการวิเคราะห์
                </p>
              </div>
            </div>

            {/* Select Dropdown */}
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="viSelect"
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                ดัชนีพืช:
              </label>
              <select
                id="viSelect"
                value={selectedVI}
                onChange={(e) => setSelectedVI(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                  fontSize: "14px",
                  background: "white",
                  color: "#374151",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#10b981";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(16, 185, 129, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              >
                {viTypes.map((vi) => (
                  <option key={vi.code} value={vi.code}>
                    {vi.name} - {vi.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "12px",
                border: "none",
                background: isAnalyzing
                  ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                  : "linear-gradient(135deg, #10b981, #059669)",
                color: "white",
                fontWeight: "700",
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                fontSize: "16px",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                boxShadow: isAnalyzing
                  ? "0 2px 8px rgba(156, 163, 175, 0.3)"
                  : "0 4px 16px rgba(16, 185, 129, 0.3)",
                transform: isAnalyzing ? "none" : "translateY(0)",
              }}
              onMouseEnter={(e) => {
                if (!isAnalyzing) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(16, 185, 129, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isAnalyzing) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(16, 185, 129, 0.3)";
                }
              }}
            >
              {isAnalyzing ? (
                <>
                  <Activity className="animate-spin" size={20} />
                  กำลังวิเคราะห์...
                </>
              ) : (
                <>
                  <ScanSearch size={20} />
                  วิเคราะห์ข้อมูลดาวเทียม
                </>
              )}
            </button>
          </div>

          {/* Current Stats */}
          {selectedSnapshot && (
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "20px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "8px",
                  }}
                >
                  ค่าเฉลี่ย {selectedVI} ณ วันที่
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "16px",
                  }}
                >
                  {formatFullDate(selectedSnapshot.snapshot_date)}
                </div>

                <div
                  style={{
                    fontSize: "36px",
                    fontWeight: "bold",
                    color:
                      viTypes.find((v) => v.code === selectedVI)?.range.color ||
                      "#4CAF50",
                    marginBottom: "8px",
                  }}
                >
                  {selectedSnapshot.mean_value.toFixed(3)}
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    background: "#f3f4f6",
                    borderRadius: "10px",
                    height: "8px",
                    marginBottom: "12px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${getScorePercentage()}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${
                        viTypes.find((v) => v.code === selectedVI)?.range.color
                      }dd, ${
                        viTypes.find((v) => v.code === selectedVI)?.range.color
                      })`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Health Status */}
                {(() => {
                  const health = getHealthStatus(
                    selectedSnapshot.mean_value,
                    selectedVI
                  );
                  return (
                    <div
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        background: health.color + "20",
                        border: `1px solid ${health.color}40`,
                        color: health.color,
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {health.status} • {health.description}
                    </div>
                  );
                })()}

                {selectedSnapshot.status_message && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "12px",
                      padding: "8px",
                      background: "#f9fafb",
                      borderRadius: "6px",
                    }}
                  >
                    {selectedSnapshot.status_message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Snapshots Grid */}
          <div
            style={{
              background: "white",
              padding: "16px",
              borderRadius: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "#374151",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                ภาพติดตาม 4 ครั้งล่าสุด
              </h4>
            </div>

            {snapshots.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                }}
              >
                {snapshots.slice(0, 4).map((snapshot) => (
                  <div
                    key={snapshot.id}
                    onClick={() => handleSnapshotClick(snapshot)}
                    style={{
                      borderRadius: "10px",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      border:
                        selectedSnapshot?.id === snapshot.id
                          ? `2px solid ${
                              viTypes.find((v) => v.code === selectedVI)?.range
                                .color || "#4CAF50"
                            }`
                          : "1px solid #e5e7eb",
                      boxShadow:
                        selectedSnapshot?.id === snapshot.id
                          ? "0 4px 12px rgba(0,0,0,0.15)"
                          : "0 2px 4px rgba(0,0,0,0.1)",
                      transform:
                        selectedSnapshot?.id === snapshot.id
                          ? "translateY(-2px)"
                          : "none",
                    }}
                  >
                    {snapshot.overlay_data ? (
                      <img
                        src={getImageUrl(snapshot.overlay_data)}
                        style={{
                          width: "100%",
                          height: "80px",
                          objectFit: "cover",
                          display: "block",
                        }}
                        alt={`${snapshot.vi_type} snapshot`}
                        onError={(e) => {
                          console.error(
                            "Failed to load image:",
                            getImageUrl(snapshot.overlay_data!)
                          );
                          // Hide the broken image and show fallback
                          e.currentTarget.style.display = "none";
                          // Try to reload after a short delay
                          setTimeout(() => {
                            if (
                              e.currentTarget.src !==
                              getImageUrl(snapshot.overlay_data!)
                            ) {
                              e.currentTarget.src = getImageUrl(
                                snapshot.overlay_data!
                              );
                              e.currentTarget.style.display = "block";
                            }
                          }, 1000);
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "80px",
                          background:
                            "linear-gradient(135deg, #6b7280, #4b5563)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ fontSize: "16px" }}>🛰️</div>
                        <div style={{ fontSize: "8px", textAlign: "center" }}>
                          {snapshot.vi_type}
                        </div>
                      </div>
                    )}

                    {/* Snapshot Info */}
                    <div style={{ padding: "8px" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "2px",
                        }}
                      >
                        {formatDate(snapshot.snapshot_date)}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color:
                            viTypes.find((v) => v.code === selectedVI)?.range
                              .color || "#4CAF50",
                          fontWeight: "600",
                        }}
                      >
                        {snapshot.mean_value.toFixed(3)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  padding: "40px 20px",
                  border: "2px dashed #d1d5db",
                  borderRadius: "12px",
                  background: "#f9fafb",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🛰️</div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    color: "#374151",
                  }}
                >
                  ยังไม่มีข้อมูล {selectedVI}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginBottom: "16px",
                  }}
                >
                  ระบบจะดึงข้อมูลใสไร้เมฆล่าสุด 4 ภาพจากวันที่แตกต่างกัน
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  style={{
                    padding: "10px 20px",
                    background: isAnalyzing
                      ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                      : "var(--brand)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: isAnalyzing ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {isAnalyzing
                    ? "🔍 กำลังดึงข้อมูล..."
                    : "🔍 ดึงข้อมูลจากดาวเทียม"}
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default HealthPage;
