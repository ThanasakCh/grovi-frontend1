import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Swal from "sweetalert2";
import { getDashboardAlerts } from "./services/adminApi";
import {
  Inbox,
  AlertOctagon,
  AlertTriangle,
  Info,
  CloudSun,
  Droplet,
  Thermometer,
  RefreshCw,
  CheckCircle
} from "lucide-react";

const AdminAlertsPage: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await getDashboardAlerts();
      setAlerts(data);
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = (fieldId: string, alertMsg: string) => {
    Swal.fire({
      title: "รับทราบการแจ้งเตือน?",
      text: `ต้องการทำเครื่องหมายว่าตรวจสอบแล้วสำหรับการแจ้งเตือนนี้ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก"
    }).then((result) => {
      if (result.isConfirmed) {
        // Remove from local state
        setAlerts((prev) => prev.filter((a) => a.field_id !== fieldId || a.message !== alertMsg));
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "บันทึกข้อมูลเรียบร้อย",
          showConfirmButton: false,
          timer: 1500,
          background: "#1E293B",
          color: "#fff"
        });
      }
    });
  };

  // Filter & Search Logic
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = searchQuery
      ? alert.field_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesTab = activeTab === "all" ? true : alert.severity === activeTab;

    return matchesSearch && matchesTab;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#4edea3]">
        <div className="w-12 h-12 border-4 border-[#4edea3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[#bbcabf]">กำลังดึงข้อมูลการแจ้งเตือน...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">System Alerts</h2>
        <p className="text-sm text-[#bbcabf] mt-1">
          ระบบวิเคราะห์และตรวจสอบความสมบูรณ์ ความชื้น และความเสี่ยงภัยแล้งในระบบแปลงเกษตรกรรมของคุณ
        </p>
      </div>

      {/* Tabs & Weather Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Navigation Tabs */}
        <div className="lg:col-span-2 bg-[#1E293B]/80 border border-white/10 rounded-xl p-2 flex space-x-2 overflow-x-auto backdrop-blur-md">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "all"
                ? "bg-[#4edea3]/20 text-[#4edea3]"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-white"
            }`}
          >
            <Inbox className="w-4.5 h-4.5" />
            All Alerts ({alerts.length})
          </button>
          
          <button
            onClick={() => setActiveTab("critical")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
              activeTab === "critical"
                ? "bg-[#EF4444]/20 text-[#EF4444]"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-white"
            }`}
          >
            <AlertOctagon className="w-4.5 h-4.5" />
            Critical ({criticalCount})
            {criticalCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("warning")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "warning"
                ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-4.5 h-4.5" />
            Warnings ({warningCount})
          </button>

          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "info"
                ? "bg-[#60A5FA]/20 text-[#60A5FA]"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-white"
            }`}
          >
            <Info className="w-4.5 h-4.5" />
            Information ({infoCount})
          </button>
        </div>

        {/* Weather Integration Widget */}
        <div className="bg-[#1E293B]/80 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex gap-3 items-center">
            <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#bbcabf] uppercase tracking-wider font-bold">Drought Index</div>
              <div className="text-xs text-white font-bold mt-0.5">ภัยแล้ง: <span className="text-[#F59E0B]">ปานกลาง-สูง</span></div>
            </div>
          </div>
          <div className="text-right border-l border-white/5 pl-4">
            <div className="text-sm font-bold text-[#60A5FA]">0 mm</div>
            <div className="text-[9px] text-[#bbcabf]">Rainfall 48h</div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, idx) => {
            // Severity Styles
            const severityColor = 
              alert.severity === "critical" ? "bg-[#EF4444]" :
              alert.severity === "warning" ? "bg-[#F59E0B]" : "bg-[#60A5FA]";
            
            const severityBox =
              alert.severity === "critical" ? "bg-[#EF4444]/5 border-[#EF4444]/20" :
              alert.severity === "warning" ? "bg-[#F59E0B]/5 border-[#F59E0B]/20" :
              "bg-[#60A5FA]/5 border-[#60A5FA]/20";
            
            const severityBadge =
              alert.severity === "critical" ? "bg-[#EF4444]/20 text-[#ffb4ab] border-[#EF4444]/30" :
              alert.severity === "warning" ? "bg-[#F59E0B]/20 text-[#f6db97] border-[#F59E0B]/30" :
              "bg-[#60A5FA]/20 text-[#d0e4ff] border-[#60A5FA]/30";

            return (
              <div
                key={idx}
                className={`bg-[#1E293B]/80 backdrop-blur-md border rounded-xl p-5 relative overflow-hidden group flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all hover:border-white/20 ${severityBox}`}
              >
                {/* Accent Color Left Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${severityColor}`}></div>

                {/* Left Alert Details */}
                <div className="flex gap-4">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${severityColor}/10 border border-${severityColor}/20`}>
                    {alert.severity === "critical" ? (
                      <Droplet className="w-5 h-5 text-[#EF4444]" />
                    ) : alert.severity === "warning" ? (
                      <Thermometer className="w-5 h-5 text-[#F59E0B]" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-[#60A5FA]" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${severityBadge}`}>
                        {alert.severity}
                      </span>
                      {alert.created_at && (
                        <span className="text-[10px] text-[#bbcabf]">
                          {new Date(alert.created_at).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      {alert.field_name} {alert.ndvi ? `(NDVI: ${alert.ndvi.toFixed(2)})` : ""}
                    </h3>
                    <p className="text-xs text-[#bbcabf] leading-relaxed break-words">{alert.message}</p>
                  </div>
                </div>

                {/* Actions Buttons */}
                <div className="flex md:flex-col gap-2 shrink-0 md:w-32 mt-2 md:mt-0">
                  <button
                    onClick={() => handleAcknowledge(alert.field_id, alert.message)}
                    className={`flex-1 md:w-full px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                      alert.severity === "critical"
                        ? "bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#ffb4ab] border-[#EF4444]/30"
                        : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    }`}
                  >
                    Acknowledge
                  </button>
                  <Link
                    to={`/dris_project/field/${alert.field_id}`}
                    className="flex-1 md:w-full px-3 py-2 border border-white/10 hover:border-[#4edea3] text-white hover:text-[#4edea3] rounded-lg text-xs font-semibold transition-colors flex items-center justify-center"
                  >
                    View Field
                  </Link>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#1E293B]/40 border border-dashed border-white/10 rounded-xl p-12 text-center text-[#bbcabf]">
            <CheckCircle className="w-10 h-10 text-white/20 mb-3 mx-auto" />
            <p className="text-sm">ทุกอย่างเรียบร้อยดี! ไม่มีรายการแจ้งเตือนในขณะนี้</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAlertsPage;
