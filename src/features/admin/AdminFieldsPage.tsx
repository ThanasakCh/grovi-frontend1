import React, { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyles } from "../../config/mapConfig";
import { getFieldsHealth, getFieldSnapshots, analyzeFieldHistorical } from "./services/adminApi";
import { getImageUrl } from "../../config/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Plus, Mountain, User, ArrowRight, SearchX, X, Layers, RefreshCw, Check, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const viTypes = [
  { code: "NDVI", name: "NDVI", description: "Normalized Difference Vegetation Index" },
  { code: "EVI", name: "EVI", description: "Enhanced Vegetation Index" },
  { code: "GNDVI", name: "GNDVI", description: "Green NDVI" },
  { code: "NDWI", name: "NDWI", description: "Normalized Difference Water Index" },
  { code: "SAVI", name: "SAVI", description: "Soil Adjusted Vegetation Index" },
  { code: "VCI", name: "VCI", description: "Vegetation Condition Index" },
];

const AdminFieldsPage: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Modal states
  const [selectedField, setSelectedField] = useState<any>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedVI, setSelectedVI] = useState<string>("NDVI");
  const [showCarousel, setShowCarousel] = useState(false);
  const [showVISelector, setShowVISelector] = useState(false);

  // Snapshots states
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        const data = await getFieldsHealth();
        setFields(data);
      } catch (err) {
        console.error("Error fetching fields:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const getHealthDescription = (value: number, viType: string): string => {
    if (viType === "NDVI") {
      if (value < 0.2) return "สุขภาพพืชวิกฤต (เฉา/เสื่อมโทรม)";
      if (value < 0.45) return "สุขภาพพืชปานกลาง";
      return "สุขภาพพืชดีเยี่ยม (เขียวชอุ่ม)";
    }
    return `ค่าเฉลี่ย ${viType}: ${value.toFixed(3)}`;
  };

  useEffect(() => {
    if (!selectedField) {
      setSnapshots([]);
      setSelectedSnapshot(null);
      return;
    }

    const fetchSnapshots = async () => {
      try {
        setLoadingSnapshots(true);
        const data = await getFieldSnapshots(selectedField.field_id, selectedVI, 4);
        const sorted = data.sort(
          (a: any, b: any) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
        );
        setSnapshots(sorted);
        setSelectedSnapshot(sorted.length > 0 ? sorted[0] : null);
      } catch (err) {
        console.error("Failed to load snapshots:", err);
        setSnapshots([]);
        setSelectedSnapshot(null);
      } finally {
        setLoadingSnapshots(false);
      }
    };

    fetchSnapshots();
  }, [selectedField, selectedVI]);

  const handleAnalyze = async () => {
    if (!selectedField) return;
    try {
      setIsAnalyzing(true);
      await analyzeFieldHistorical(selectedField.field_id, selectedVI, 4);
      const data = await getFieldSnapshots(selectedField.field_id, selectedVI, 4);
      const sorted = data.sort(
        (a: any, b: any) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
      );
      setSnapshots(sorted);
      setSelectedSnapshot(sorted.length > 0 ? sorted[0] : null);
    } catch (err) {
      console.error("Historical analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter & Sort Logic
  const filteredFields = fields
    .filter((f) => {
      // Search filter
      const matchesSearch = searchQuery
        ? f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.crop_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      // Crop type filter
      const matchesCrop = selectedCrop ? f.crop_type === selectedCrop : true;

      // Status filter
      const matchesStatus = selectedStatus ? f.health_status === selectedStatus : true;

      return matchesSearch && matchesCrop && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "ndvi") {
        return (b.latest_ndvi || 0) - (a.latest_ndvi || 0);
      } else if (sortBy === "area") {
        return b.area_rai - a.area_rai;
      } else if (sortBy === "date") {
        const dateA = a.ndvi_date ? new Date(a.ndvi_date).getTime() : 0;
        const dateB = b.ndvi_date ? new Date(b.ndvi_date).getTime() : 0;
        return dateB - dateA;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  // Unique crop list for filter dropdown
  const cropsList = Array.from(new Set(fields.map((f) => f.crop_type).filter(Boolean)));

  // Warning metrics
  const warningCount = fields.filter((f) => f.health_status === "warning").length;
  const criticalCount = fields.filter((f) => f.health_status === "critical").length;

  // Initialize Map for Modal
  useEffect(() => {
    if (!selectedField || !mapContainerRef.current) {
      setMapLoaded(false);
      return;
    }

    const initMap = () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      setMapLoaded(false);

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: mapStyles.satellite,
        center: [selectedField.centroid_lng, selectedField.centroid_lat],
        zoom: 15,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        if (!selectedField.geometry) return;

        // Add field boundary
        map.addSource("field-boundary", {
          type: "geojson",
          data: selectedField.geometry,
        });

        // Add fill and outline
        const fillColor =
          selectedField.health_status === "healthy" ? "#4edea3" :
          selectedField.health_status === "warning" ? "#F59E0B" :
          selectedField.health_status === "critical" ? "#EF4444" : "#bbcabf";

        map.addLayer({
          id: "field-fill",
          type: "fill",
          source: "field-boundary",
          paint: {
            "fill-color": fillColor,
            "fill-opacity": 0.15,
          },
        });

        map.addLayer({
          id: "field-outline",
          type: "line",
          source: "field-boundary",
          paint: {
            "line-color": fillColor,
            "line-width": 2,
          },
        });

        // Fit map to boundary
        try {
          const bounds = new maplibregl.LngLatBounds();
          selectedField.geometry.coordinates[0].forEach((coord: number[]) => {
            bounds.extend(coord as [number, number]);
          });
          map.fitBounds(bounds, { padding: 40, animate: false });
        } catch (e) {
          console.error("Error fitting bounds:", e);
        }

        setMapLoaded(true);
      });

      mapRef.current = map;
    };

    // Small delay to ensure container is fully rendered
    setTimeout(initMap, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [selectedField]); // Only re-run when the selected field changes entirely

  // Handle overlay source/visibility changes dynamically
  useEffect(() => {
    if (!mapRef.current || !selectedField || !selectedField.geometry || !mapLoaded) return;
    const map = mapRef.current;
    
    // Toggle visibility
    if (map.getLayer("vi-overlay-layer")) {
      map.setPaintProperty("vi-overlay-layer", "raster-opacity", showOverlay ? 0.75 : 0);
    }
    
    // Change image source if active snapshot changes
    if (selectedSnapshot && selectedSnapshot.overlay_data) {
      const source = map.getSource("vi-overlay") as maplibregl.ImageSource;
      if (source) {
        source.updateImage({ url: getImageUrl(selectedSnapshot.overlay_data) });
      } else {
        // Source doesn't exist yet, create it
        const bbox = getBoundingBox(selectedField.geometry);
        map.addSource("vi-overlay", {
          type: "image",
          url: getImageUrl(selectedSnapshot.overlay_data),
          coordinates: [
            [bbox[0], bbox[3]],
            [bbox[2], bbox[3]],
            [bbox[2], bbox[1]],
            [bbox[0], bbox[1]],
          ],
        });
        map.addLayer({
          id: "vi-overlay-layer",
          type: "raster",
          source: "vi-overlay",
          paint: { "raster-opacity": showOverlay ? 0.75 : 0 },
        });
      }
    } else {
      // If no snapshot or overlay, make overlay layer transparent
      if (map.getLayer("vi-overlay-layer")) {
        map.setPaintProperty("vi-overlay-layer", "raster-opacity", 0);
      }
    }
  }, [showOverlay, selectedSnapshot, selectedField, mapLoaded]);

  // Helper function to calculate bounding box from GeoJSON polygon
  const getBoundingBox = (geometry: any) => {
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    geometry.coordinates[0].forEach((coord: number[]) => {
      minLng = Math.min(minLng, coord[0]);
      maxLng = Math.max(maxLng, coord[0]);
      minLat = Math.min(minLat, coord[1]);
      maxLat = Math.max(maxLat, coord[1]);
    });
    return [minLng, minLat, maxLng, maxLat];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#4edea3]">
        <div className="w-12 h-12 border-4 border-[#4edea3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[#bbcabf]">กำลังดึงข้อมูลแปลงทั้งหมด...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">All Fields</h2>
          <p className="text-sm text-[#bbcabf] mt-1">จัดการและติดตามสถานะแปลงเกษตรกรรมทั้งหมดในระบบ</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-3 w-full md:w-auto">
          <div className="bg-[#1E293B]/80 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3 backdrop-blur-md flex-1 md:flex-none">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-[#bbcabf]">Attention Needed</div>
              <div className="text-xs text-white font-bold">{warningCount + criticalCount} แปลง</div>
            </div>
          </div>
          <Link
            to="/Grovi-cropmonitoring"
            className="bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-[#4edea3]/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            เพิ่มแปลงใหม่
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Dropdown 1: Crop Type */}
          <div className="relative min-w-[150px] w-full sm:w-auto">
            <Select
              value={selectedCrop || "all"}
              onValueChange={(value) => setSelectedCrop(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full bg-[#171f33] border-white/10 text-white text-xs py-2.5 h-9 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                <SelectValue placeholder="Crop Type (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                <SelectItem value="all" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Crop Type (ทั้งหมด)</SelectItem>
                {cropsList.map((crop, idx) => (
                  <SelectItem key={idx} value={crop} className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">
                    {crop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown 2: Health Status */}
          <div className="relative min-w-[150px] w-full sm:w-auto">
            <Select
              value={selectedStatus || "all"}
              onValueChange={(value) => setSelectedStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full bg-[#171f33] border-white/10 text-white text-xs py-2.5 h-9 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                <SelectValue placeholder="Status (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                <SelectItem value="all" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Status (ทั้งหมด)</SelectItem>
                <SelectItem value="healthy" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Healthy (สุขภาพดี)</SelectItem>
                <SelectItem value="warning" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Warning (ปานกลาง)</SelectItem>
                <SelectItem value="critical" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Critical (วิกฤต)</SelectItem>
                <SelectItem value="no_data" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">No Data (ไม่มีข้อมูล)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown 3: Sort By */}
          <div className="relative min-w-[150px] w-full sm:w-auto">
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value)}
            >
              <SelectTrigger className="w-full bg-[#171f33] border-white/10 text-white text-xs py-2.5 h-9 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                <SelectValue placeholder="เรียงตาม..." />
              </SelectTrigger>
              <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                <SelectItem value="name" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">เรียงตาม ชื่อแปลง</SelectItem>
                <SelectItem value="ndvi" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">เรียงตาม NDVI</SelectItem>
                <SelectItem value="area" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">เรียงตาม ขนาดพื้นที่</SelectItem>
                <SelectItem value="date" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">เรียงตาม วันที่วิเคราะห์</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-[#bbcabf] self-end md:self-auto">
          พบทั้งหมด <span className="text-[#4edea3] font-bold">{filteredFields.length}</span> แปลง
        </div>
      </div>

      {/* Fields Grid / Stack */}
      {filteredFields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFields.map((field) => {
            const statusColor =
              field.health_status === "healthy" ? "text-[#4edea3] bg-[#4edea3]/10 border-[#4edea3]/30" :
              field.health_status === "warning" ? "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30" :
              field.health_status === "critical" ? "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30 animate-pulse" :
              "text-[#bbcabf] bg-white/5 border-white/10";
            
            const badgeLabel =
              field.health_status === "healthy" ? "HEALTHY" :
              field.health_status === "warning" ? "WARNING" :
              field.health_status === "critical" ? "CRITICAL" : "NO DATA";

            return (
              <div 
                key={field.field_id} 
                className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden group hover:-translate-y-1 hover:border-[#4edea3]/30 hover:shadow-lg hover:shadow-[#4edea3]/5 transition-all duration-300 flex flex-col"
              >
                {/* Field Image / Thumbnail */}
                <div className="relative h-44 overflow-hidden bg-[#171f33]">
                  {field.thumbnail ? (
                    <img 
                      alt={field.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={field.thumbnail} 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#bbcabf]/40 gap-2">
                      <Mountain className="w-10 h-10" />
                      <span className="text-[10px]">No Map Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-transparent to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 backdrop-blur-sm px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${statusColor}`}>
                    {badgeLabel}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex-1 flex flex-col gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white truncate">{field.name}</h3>
                    <p className="text-xs text-[#bbcabf] mt-0.5 truncate">
                      {field.crop_type || "ไม่ระบุประเภทพืช"} {field.variety ? `(${field.variety})` : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#171f33]/60 border border-white/5 rounded-lg p-2.5">
                      <div className="text-[10px] text-[#bbcabf]">Area Size</div>
                      <div className="text-white font-semibold mt-0.5 truncate">{field.area_rai} ไร่</div>
                    </div>
                    <div className="bg-[#171f33]/60 border border-white/5 rounded-lg p-2.5">
                      <div className="text-[10px] text-[#bbcabf]">NDVI Avg</div>
                      <div className={`font-bold mt-0.5 truncate ${
                        field.health_status === "healthy" ? "text-[#4edea3]" :
                        field.health_status === "warning" ? "text-[#F59E0B]" :
                        field.health_status === "critical" ? "text-[#EF4444]" : "text-[#bbcabf]"
                      }`}>
                        {field.latest_ndvi !== null ? field.latest_ndvi.toFixed(2) : "N/A"}
                      </div>
                    </div>
                  </div>

                  {field.owner_name && (
                    <div className="text-[10px] text-[#bbcabf] flex items-center gap-1 mt-auto border-t border-white/5 pt-3">
                      <User className="w-3.5 h-3.5" />
                      <span>เจ้าของ: {field.owner_name}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-white/5">
                    <button
                      onClick={() => {
                        setSelectedField(field);
                        setShowOverlay(true);
                        setSelectedVI("NDVI");
                        setShowCarousel(false);
                        setShowVISelector(false);
                      }}
                      className="w-full py-2 rounded-lg border border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <span>ดูรายละเอียดแปลง</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B]/40 border border-dashed border-white/10 rounded-xl p-12 text-center text-[#bbcabf]">
          <SearchX className="w-10 h-10 text-white/20 mb-3 mx-auto" />
          <p className="text-sm">ไม่พบแปลงเกษตรกรรมที่ตรงตามเงื่อนไขที่เลือก</p>
        </div>
      )}

      {/* Field Details Modal */}
      {selectedField && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#0B1120]/80 backdrop-blur-sm"
            onClick={() => setSelectedField(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#171f33]/50">
              <div className="max-w-[calc(100%-2.5rem)]">
                <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                  <span className="truncate max-w-[180px] sm:max-w-none">{selectedField.name}</span>
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                    selectedField.health_status === "healthy" ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3]" :
                    selectedField.health_status === "warning" ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]" :
                    selectedField.health_status === "critical" ? "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]" :
                    "bg-white/5 border-white/10 text-[#bbcabf]"
                  }`}>
                    {selectedField.health_status.toUpperCase()}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#bbcabf] mt-1 leading-relaxed">
                  เจ้าของ: {selectedField.owner_name || "ไม่ระบุ"} | พื้นที่: {selectedField.area_rai} ไร่ | พืช: {selectedField.crop_type || "ไม่ระบุ"}
                </p>
              </div>
              <button 
                onClick={() => setSelectedField(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-[#bbcabf] hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* Map Section */}
              <div className="h-[280px] md:h-auto w-full md:w-auto shrink-0 md:shrink md:flex-1 relative bg-[#0B1120] flex flex-col justify-between">
                {selectedField.geometry ? (
                  <>
                    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                    
                    {/* Top Controls Overlay */}
                    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                      {/* VI Type Selector (Top Left) */}
                      {!showVISelector ? (
                        <button
                          onClick={() => setShowVISelector(true)}
                          className="bg-[#1E293B]/95 hover:bg-[#1E293B] backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1 shadow-lg pointer-events-auto text-xs text-white font-bold transition-all shrink-0"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#4edea3]" />
                          <span>ดัชนี: {selectedVI}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                        </button>
                      ) : (
                        <div className="bg-[#1E293B]/95 backdrop-blur-md p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-lg pointer-events-auto animate-in slide-in-from-left duration-200 max-w-[calc(100vw-80px)] md:max-w-none overflow-x-auto no-scrollbar scroll-smooth">
                          <button
                            onClick={() => setShowVISelector(false)}
                            className="p-1 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-all mr-1 shrink-0"
                            title="พับเก็บ"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          {viTypes.map((vi) => (
                            <button
                              key={vi.code}
                              onClick={() => {
                                setSelectedVI(vi.code);
                                setShowOverlay(true);
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                selectedVI === vi.code 
                                  ? "bg-[#4edea3] text-[#0B1120] shadow-md" 
                                  : "text-[#bbcabf] hover:bg-white/5"
                              }`}
                            >
                              {vi.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div></div>
                    </div>

                    {/* Toggle Visibility (Bottom Left) */}
                    <button
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={`absolute ${showCarousel ? "bottom-[140px]" : "bottom-4"} left-4 z-10 pointer-events-auto flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all shadow-lg ${
                        showOverlay 
                          ? "bg-[#4edea3]/10 border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/20" 
                          : "bg-[#1E293B]/90 border-white/10 text-[#bbcabf] hover:text-white"
                      }`}
                      title={showOverlay ? "ซ่อนเลเยอร์" : "แสดงเลเยอร์"}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{showOverlay ? "ซ่อนเลเยอร์" : "แสดงเลเยอร์"}</span>
                    </button>

                    {/* Collapsible Carousel Overlay at Bottom of Map */}
                    <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                      {!showCarousel ? (
                        <div className="flex justify-end sm:justify-center">
                          <button
                            onClick={() => setShowCarousel(true)}
                            className="bg-[#1E293B]/95 hover:bg-[#1E293B] backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl pointer-events-auto flex items-center gap-1.5 text-white text-xs font-bold transition-all animate-in slide-in-from-bottom duration-200"
                          >
                            <ChevronUp className="w-4 h-4 text-[#4edea3]" />
                            <span className="hidden sm:inline">แสดงภาพประมวลผลประวัติศาสตร์ (4 ภาพล่าสุด)</span>
                            <span className="inline sm:hidden">ภาพประวัติศาสตร์ (4)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-[#1E293B]/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 max-w-lg mx-auto pointer-events-auto animate-in slide-in-from-bottom duration-200">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-white font-bold flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#4edea3]" />
                              <span className="hidden sm:inline">ภาพประมวลผลดัชนี {selectedVI} (ล่าสุด 4 ภาพ)</span>
                              <span className="inline sm:hidden">ดัชนี {selectedVI} (4 ภาพล่าสุด)</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {loadingSnapshots && (
                                <span className="text-[10px] text-[#4edea3] animate-pulse">กำลังโหลด...</span>
                              )}
                              <button
                                onClick={() => setShowCarousel(false)}
                                className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg transition-all"
                              >
                                <ChevronDown className="w-3 h-3" />
                                <span>พับเก็บ</span>
                              </button>
                            </div>
                          </div>

                          {loadingSnapshots ? (
                            <div className="h-16 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : snapshots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                              {snapshots.map((snap) => {
                                const isSelected = selectedSnapshot?.id === snap.id;
                                return (
                                  <button
                                    key={snap.id}
                                    onClick={() => setSelectedSnapshot(snap)}
                                    className={`flex flex-col items-center p-1 rounded-lg border transition-all text-left ${
                                      isSelected 
                                        ? "border-[#4edea3] bg-[#4edea3]/10 text-white shadow-md shadow-[#4edea3]/10" 
                                        : "border-white/10 bg-[#171f33]/60 hover:bg-[#171f33] text-[#bbcabf]"
                                    }`}
                                  >
                                    {/* Small Thumbnail Preview */}
                                    <div className="w-full aspect-video rounded overflow-hidden bg-black/40 mb-1 relative flex items-center justify-center">
                                      {snap.overlay_data ? (
                                        <img 
                                          src={getImageUrl(snap.overlay_data)} 
                                          alt="preview" 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Mountain className="w-4 h-4 text-white/20" />
                                      )}
                                      {isSelected && (
                                        <div className="absolute top-0 right-0 p-0.5 bg-[#4edea3] rounded-bl-md">
                                          <Check className="w-2.5 h-2.5 text-[#0B1120]" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[9px] font-bold text-center block w-full truncate">
                                      {formatDate(snap.snapshot_date)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-16 flex flex-col items-center justify-center gap-1.5 text-center p-2">
                              <span className="text-[10px] text-[#bbcabf]">ยังไม่มีข้อมูลประมวลผลดัชนี {selectedVI} สำหรับแปลงนี้</span>
                              <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="px-3 py-1 rounded-lg bg-[#4edea3] hover:bg-[#6ffbbe] text-[#0B1120] text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                                วิเคราะห์ดาวเทียมทันที
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#bbcabf]">
                    <Mountain className="w-12 h-12 mb-3 opacity-20" />
                    <p>ไม่มีข้อมูลพิกัด (Geometry) สำหรับแปลงนี้</p>
                  </div>
                )}
              </div>
              
              {/* Info Sidebar */}
              <div className="flex-1 md:flex-none w-full md:w-72 bg-[#171f33]/30 p-4 sm:p-5 flex flex-col gap-5 border-t md:border-t-0 md:border-l border-white/5 overflow-y-auto">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#bbcabf] tracking-wider mb-2">ดัชนีพืชพรรณ ({selectedVI})</h4>
                  <div className="bg-[#1E293B]/60 border border-white/5 rounded-xl p-4 text-center relative overflow-hidden group">
                    <div className={`text-3xl font-black ${
                      selectedSnapshot 
                        ? (selectedField.health_status === "healthy" ? "text-[#4edea3]" :
                           selectedField.health_status === "warning" ? "text-[#F59E0B]" : "text-[#EF4444]")
                        : "text-white"
                    }`}>
                      {selectedSnapshot ? selectedSnapshot.mean_value.toFixed(3) : "N/A"}
                    </div>
                    {selectedSnapshot ? (
                      <div className="text-[10px] text-[#bbcabf] mt-1">
                        วันที่บันทึก: {formatDate(selectedSnapshot.snapshot_date)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#bbcabf] mt-1">ไม่มีข้อมูลวิเคราะห์</div>
                    )}
                  </div>

                  {selectedSnapshot && (
                    <div className="mt-2 text-center p-2 rounded-lg bg-[#1E293B]/40 border border-white/5">
                      <p className="text-[11px] text-[#4edea3] font-medium">
                        {getHealthDescription(selectedSnapshot.mean_value, selectedVI)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] uppercase font-bold text-[#bbcabf] tracking-wider mb-2">ข้อมูลเพิ่มเติม</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[#bbcabf]">สายพันธุ์:</span>
                      <span className="text-white font-medium">{selectedField.variety || "-"}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                      <span className="text-[#bbcabf]">ที่อยู่:</span>
                      <span className="text-white font-medium text-sm break-words leading-relaxed">{selectedField.address || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full py-2 rounded-lg bg-[#4edea3] hover:bg-[#6ffbbe] text-[#0B1120] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors shadow-lg shadow-[#4edea3]/10"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                    <span>{isAnalyzing ? "กำลังประมวลผล..." : "ประมวลผลดัชนีใหม่ (GEE)"}</span>
                  </button>

                  <Link
                    to={`/Grovi-cropmonitoring/field/${selectedField.field_id}`}
                    className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    ดูประวัติแบบละเอียด
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFieldsPage;
