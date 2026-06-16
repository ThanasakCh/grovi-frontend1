import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getFieldsHealth } from "./services/adminApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminFieldsPage: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");

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
              <span className="material-symbols-outlined text-sm">warning</span>
            </div>
            <div>
              <div className="text-[10px] text-[#bbcabf]">Attention Needed</div>
              <div className="text-xs text-white font-bold">{warningCount + criticalCount} แปลง</div>
            </div>
          </div>
          <Link
            to="/dris_project"
            className="bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-[#4edea3]/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
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
                      <span className="material-symbols-outlined text-4xl">landscape</span>
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
                      <span className="material-symbols-outlined text-[12px]">person</span>
                      <span>เจ้าของ: {field.owner_name}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-white/5">
                    <Link
                      to={`/dris_project/field/${field.field_id}`}
                      className="w-full py-2 rounded-lg border border-[#4edea3]/30 text-[#4edea3] hover:bg-[#4edea3]/10 transition-colors text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <span>ดูรายละเอียดแปลง</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B]/40 border border-dashed border-white/10 rounded-xl p-12 text-center text-[#bbcabf]">
          <span className="material-symbols-outlined text-4xl mb-3 text-white/20">search_off</span>
          <p className="text-sm">ไม่พบแปลงเกษตรกรรมที่ตรงตามเงื่อนไขที่เลือก</p>
        </div>
      )}
    </div>
  );
};

export default AdminFieldsPage;
