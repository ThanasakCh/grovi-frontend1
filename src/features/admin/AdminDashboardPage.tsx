import React, { useState, useEffect, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import ReactEcharts from "echarts-for-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getDashboardSummary,
  getFieldsHealth,
  getVITrendAll,
  getDashboardAlerts,
  getActivityLog
} from "./services/adminApi";
import { mapStyles } from "../../config/mapConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGrid,
  TrendingUp,
  Map,
  Sprout,
  AlertTriangle,
  Layers,
  Filter,
  Plus,
  Minus,
  AlertCircle,
  Info,
  PlusSquare,
  Satellite,
  LogIn,
  FileText
} from "lucide-react";

const AdminDashboardPage: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  // State variables
  const [summary, setSummary] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Map reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [sumData, fieldsData, trendRes, alertsData, logsData] = await Promise.all([
          getDashboardSummary(),
          getFieldsHealth(),
          getVITrendAll("NDVI", "6m"),
          getDashboardAlerts(),
          getActivityLog(6)
        ]);

        setSummary(sumData);
        setFields(fieldsData);
        setTrendData(trendRes);
        setAlerts(alertsData);
        setActivities(logsData);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Initialize Maplibre Map
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current || fields.length === 0) return;

    // Filter fields that have valid lat/lng centroids
    const validFields = fields.filter((f) => f.centroid_lat && f.centroid_lng);
    const center: [number, number] = validFields.length > 0 
      ? [validFields[0].centroid_lng, validFields[0].centroid_lat]
      : [100.5, 13.75]; // default Thailand center

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyles?.satellite || {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            ],
            tileSize: 256
          }
        },
        layers: [{ id: "esri-layer", type: "raster", source: "esri" }]
      },
      center: center,
      zoom: validFields.length > 0 ? 12 : 5,
      attributionControl: false
    });

    map.on("load", () => {
      // Add markers / circles for fields
      validFields.forEach((field, i) => {
        const markerColor = 
          field.health_status === "healthy" ? "#4edea3" : 
          field.health_status === "warning" ? "#F59E0B" : 
          field.health_status === "critical" ? "#EF4444" : "#bbcabf";

        // Create HTML element for custom marker
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = markerColor + "33"; // opacity 20%
        el.style.border = `2px solid ${markerColor}`;
        el.style.cursor = "pointer";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        
        const innerDot = document.createElement("div");
        innerDot.style.width = "8px";
        innerDot.style.height = "8px";
        innerDot.style.borderRadius = "50%";
        innerDot.style.backgroundColor = markerColor;
        el.appendChild(innerDot);

        // Add popup
        const popupHtml = `
          <div style="color: #0b1326; padding: 4px; font-family: sans-serif;">
            <strong style="display:block; font-size:12px;">${field.name}</strong>
            <span style="font-size:11px; color:#666;">NDVI: ${field.latest_ndvi || "N/A"} (${field.crop_type || "ไม่ระบุ"})</span>
          </div>
        `;
        const popup = new maplibregl.Popup({ offset: 10 }).setHTML(popupHtml);

        new maplibregl.Marker({ element: el })
          .setLngLat([field.centroid_lng, field.centroid_lat])
          .setPopup(popup)
          .addTo(map);
      });

      // Fit map bounds to contain all fields
      if (validFields.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        validFields.forEach((f) => bounds.extend([f.centroid_lng, f.centroid_lat]));
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, fields]);

  // ECharts Trend Option
  const getTrendChartOption = () => {
    if (!trendData || !trendData.fields || trendData.fields.length === 0) {
      return {};
    }

    // Average the NDVI across all fields by date to create an "All Fields" average line
    const dateMap: { [date: string]: { sum: number; count: number } } = {};
    trendData.fields.forEach((field: any) => {
      if (field.data) {
        field.data.forEach((pt: any) => {
          if (!dateMap[pt.date]) {
            dateMap[pt.date] = { sum: 0, count: 0 };
          }
          dateMap[pt.date].sum += pt.value;
          dateMap[pt.date].count += 1;
        });
      }
    });

    const dates = Object.keys(dateMap).sort();
    const avgNDVIValues = dates.map(d => Number((dateMap[d].sum / dateMap[d].count).toFixed(3)));

    return {
      tooltip: {
        trigger: "axis",
        textStyle: { fontFamily: "inherit" },
        formatter: (params: any) => {
          const item = params[0];
          return `${item.name}<br/>NDVI Average: ${item.value.toFixed(3)}`;
        }
      },
      grid: {
        left: "4%",
        right: "4%",
        top: "12%",
        bottom: "8%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: dates.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString("th-TH", { month: "short" });
        }),
        axisLabel: { color: "#bbcabf" },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 1,
        axisLabel: { color: "#bbcabf" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } }
      },
      series: [
        {
          name: "NDVI (Average)",
          type: "line",
          data: avgNDVIValues,
          smooth: true,
          lineStyle: { color: "#4edea3", width: 3 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(78, 222, 163, 0.3)" },
                { offset: 1, color: "rgba(78, 222, 163, 0)" }
              ]
            }
          },
          itemStyle: { color: "#4edea3" },
          symbol: "circle",
          symbolSize: 6
        }
      ]
    };
  };

  // Filter fields based on search query
  const filteredFields = fields.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.crop_type?.toLowerCase().includes(q) ||
      f.owner_name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#4edea3]">
        <div className="w-12 h-12 border-4 border-[#4edea3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[#bbcabf]">กำลังดึงข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">System Overview</h2>
          <p className="text-sm text-[#bbcabf] mt-1">ภาพรวมระบบและการติดตามสถานะแปลงเกษตรแบบเรียลไทม์</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1E293B]/80 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2 text-xs backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span className="text-[#bbcabf]">Live Sync: Just now</span>
          </div>
          <Link
            to="/admin/fields"
            className="bg-[#4edea3]/10 hover:bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/20 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            ดูแปลงทั้งหมด
          </Link>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fields */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#4edea3]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#4edea3]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#4edea3]">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[#4edea3] text-[10px] bg-[#4edea3]/10 px-2 py-0.5 rounded-full font-bold">
              <TrendingUp className="w-3 h-3" /> 12%
            </span>
          </div>
          <p className="text-xs text-[#bbcabf] mb-1">จำนวนแปลงทั้งหมด</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{summary?.total_fields || 0}</h3>
        </div>

        {/* Card 2: Total Area */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#adc6ff]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#adc6ff]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#adc6ff]">
              <Map className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-[#bbcabf] mb-1">พื้นที่รวม (Rai)</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{summary?.total_area_rai || 0}</h3>
        </div>

        {/* Card 3: Avg NDVI */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#4edea3]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#4edea3]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#4edea3]">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[#4edea3] text-[10px] bg-[#4edea3]/10 px-2 py-0.5 rounded-full font-bold">
              <TrendingUp className="w-3 h-3" /> 0.05
            </span>
          </div>
          <p className="text-xs text-[#bbcabf] mb-1">ค่าเฉลี่ย NDVI</p>
          <h3 className="text-3xl font-bold text-[#4edea3] tracking-tight">{summary?.avg_ndvi || "N/A"}</h3>
          <p className="text-[10px] text-[#bbcabf] mt-1">Healthy Range (0.6 - 0.9)</p>
        </div>

        {/* Card 4: Critical Fields */}
        <div className="bg-[#EF4444]/5 backdrop-blur-xl border border-[#EF4444]/20 rounded-xl p-5 relative overflow-hidden group hover:border-[#EF4444]/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#EF4444]/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[#EF4444] text-[10px] bg-[#EF4444]/10 px-2 py-0.5 rounded-full font-bold">
              <TrendingUp className="w-3 h-3" /> 1
            </span>
          </div>
          <p className="text-xs text-[#bbcabf] mb-1">แปลงที่ต้องดูแลด่วน</p>
          <h3 className="text-3xl font-bold text-[#EF4444] tracking-tight">{summary?.fields_critical || 0}</h3>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Map & Chart */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Farm Map preview */}
          <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col h-[400px] relative">
            <div className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-[#0b1326]/50">
              <h3 className="text-sm font-semibold text-white">Field Topography &amp; Health</h3>
              <div className="flex gap-2">
                <button 
                  className="w-8 h-8 rounded bg-[#171f33] flex items-center justify-center text-[#dae2fd] hover:text-[#4edea3] transition-colors border border-white/10" 
                  onClick={() => alert("สลับชั้นข้อมูล (Layers) อยู่ระหว่างพัฒนา")}
                  title="Layers"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button 
                  className="w-8 h-8 rounded bg-[#171f33] flex items-center justify-center text-[#dae2fd] hover:text-[#4edea3] transition-colors border border-white/10" 
                  onClick={() => alert("กรองข้อมูลแปลงอยู่ระหว่างพัฒนา")}
                  title="Filter"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Map Container */}
            <div ref={mapContainerRef} className="flex-1 w-full h-full bg-[#0b1326]" />

            {/* Map Legend (Bottom Left overlay) */}
            <div className="absolute bottom-4 left-4 bg-[#0b1326]/90 border border-white/10 px-3 py-2 rounded-lg flex items-center gap-4 text-[10px] z-10 backdrop-blur-md">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4edea3]"></span><span className="text-[#dae2fd]">Healthy</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span><span className="text-[#dae2fd]">Warning</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span><span className="text-[#dae2fd]">Critical</span></div>
            </div>

            {/* Map Controls (Bottom Right overlay) */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button 
                className="w-8 h-8 rounded-lg bg-[#0b1326]/90 border border-white/10 flex items-center justify-center text-[#dae2fd] hover:text-[#4edea3] transition-colors backdrop-blur-md" 
                onClick={() => alert("ฟังก์ชันขยายแผนที่")}
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                className="w-8 h-8 rounded-lg bg-[#0b1326]/90 border border-white/10 flex items-center justify-center text-[#dae2fd] hover:text-[#4edea3] transition-colors backdrop-blur-md" 
                onClick={() => alert("ฟังก์ชันย่อแผนที่")}
              >
                <Minus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-white">NDVI/EVI Trends</h3>
                <p className="text-xs text-[#bbcabf] mt-0.5">แนวโน้มความอุดมสมบูรณ์ของภาพรวมทั้งระบบในช่วง 6 เดือนที่ผ่านมา</p>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px] h-8 bg-[#171f33] border-white/10 text-[#dae2fd] text-xs focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                  <SelectValue placeholder="All Fields (Avg)" />
                </SelectTrigger>
                <SelectContent className="bg-[#171f33] border border-white/10 text-[#dae2fd] z-[99999]">
                  <SelectItem value="all" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-[#dae2fd]">All Fields (Avg)</SelectItem>
                  <SelectItem value="north" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-[#dae2fd]">Northern Region</SelectItem>
                  <SelectItem value="central" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-[#dae2fd]">Central Region</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {trendData && trendData.fields && trendData.fields.length > 0 ? (
              <ReactEcharts option={getTrendChartOption()} style={{ height: "220px", width: "100%" }} />
            ) : (
              <div className="h-[220px] flex items-center justify-center border border-dashed border-white/10 rounded-lg text-xs text-[#bbcabf]">
                ไม่มีข้อมูลแนวโน้มในช่วงนี้
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Activity Feed & Alerts */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col h-full max-h-[720px] overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Activity &amp; Alerts</h3>
            <Link to="/admin/alerts" className="text-[#4edea3] hover:text-[#6ffbbe] text-xs font-semibold transition-colors">
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 hide-scrollbar">
            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-[#bbcabf] tracking-wider">Recent Alerts</p>
                {alerts.slice(0, 3).map((alert, i) => {
                  const severityStyle = 
                    alert.severity === "critical" ? "bg-[#EF4444]/10 border-[#EF4444]/20 text-[#ffb4ab]" :
                    alert.severity === "warning" ? "bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#f6db97]" :
                    "bg-[#60A5FA]/10 border-[#60A5FA]/20 text-[#d0e4ff]";
                  const badgeColor =
                    alert.severity === "critical" ? "bg-[#EF4444]" :
                    alert.severity === "warning" ? "bg-[#F59E0B]" : "bg-[#60A5FA]";
                  
                  return (
                    <div key={i} className={`border rounded-lg p-3 flex gap-3 items-start ${severityStyle}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${badgeColor}/20`}>
                        {alert.severity === "critical" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : alert.severity === "warning" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                           <h4 className="text-xs font-semibold truncate text-white">{alert.field_name}</h4>
                          <span className="text-[9px] text-[#bbcabf] whitespace-nowrap ml-1">
                            {alert.days_since_analysis ? `${alert.days_since_analysis}d ago` : "new"}
                          </span>
                        </div>
                        <p className="text-xs text-[#bbcabf] mt-1 break-words">{alert.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Activities Section */}
            <div className="space-y-3 mt-6">
              <p className="text-[10px] uppercase font-bold text-[#bbcabf] tracking-wider">System Activity Log</p>
              {activities.length > 0 ? (
                activities.map((act, i) => (
                  <div key={i} className="bg-[#171f33]/40 border border-white/5 rounded-lg p-3 flex gap-3 items-start hover:bg-[#171f33]/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] shrink-0 mt-0.5">
                      {act.action_type === "create_field" ? (
                        <PlusSquare className="w-4 h-4" />
                      ) : act.action_type === "analyze_vi" ? (
                        <Satellite className="w-4 h-4" />
                      ) : act.action_type === "login" ? (
                        <LogIn className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-semibold text-white capitalize">
                          {act.action_type.replace("_", " ")}
                        </h4>
                        <span className="text-[9px] text-[#bbcabf] whitespace-nowrap ml-1">
                          {new Date(act.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-[#bbcabf] mt-1 break-words">
                        {act.description || `กิจกรรม ${act.action_type}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#bbcabf] text-center py-4">ไม่มีบันทึกกิจกรรมล่าสุด</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
