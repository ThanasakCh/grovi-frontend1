import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sprout, LayoutDashboard, Tractor, Users, BellRing, Settings, LogOut, Search, Bell, Shield, Satellite } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("System Admin");
  const [searchQuery, setSearchQuery] = useState("");

  const { user, logout } = useAuth();
  
  useEffect(() => {
    if (user?.name) {
      setAdminName(user.name);
    }
  }, [user]);

  useEffect(() => {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      const originalOverflow = rootEl.style.overflowY;
      rootEl.style.overflowY = "hidden";
      return () => {
        rootEl.style.overflowY = originalOverflow;
      };
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="bg-[#0b1326] text-[#dae2fd] fixed inset-0 flex font-sans overflow-hidden">
      {/* Side Navigation (Desktop only, hidden on mobile) */}
      <nav className="hidden md:flex flex-col w-[280px] fixed inset-y-0 left-0 bg-[#171f33]/80 backdrop-blur-xl border-r border-white/10 shadow-xl z-50 py-6 px-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-lg bg-[#4edea3]/20 flex items-center justify-center">
            <Sprout className="text-[#4edea3] w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#4edea3]">Grovi</h1>
            <p className="text-[11px] text-[#bbcabf] font-semibold">AgTech Admin</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          <Link
            to="/admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/dashboard")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          <Link
            to="/admin/fields"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/fields")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <Tractor className="w-5 h-5" />
            <span className="text-sm font-medium">All Fields</span>
          </Link>

          <Link
            to="/admin/users"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/users")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Users Management</span>
          </Link>

          <Link
            to="/admin/alerts"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/alerts")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <BellRing className="w-5 h-5" />
            <span className="text-sm font-medium">Alerts</span>
          </Link>

          <Link
            to="/admin/security"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/security")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Security Logs</span>
          </Link>

          <Link
            to="/admin/gee-monitor"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/admin/gee-monitor")
                ? "text-[#4edea3] font-bold border-r-2 border-[#4edea3] bg-[#4edea3]/10"
                : "text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd]"
            }`}
          >
            <Satellite className="w-5 h-5" />
            <span className="text-sm font-medium">GEE Monitor</span>
          </Link>
        </div>

        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
          <button
            onClick={() => alert("แผงควบคุมระบบ (System Settings) อยู่ในช่วงการพัฒนาเพิ่มเติม")}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#bbcabf] hover:bg-[#31394d]/50 hover:text-[#dae2fd] transition-colors w-full text-left"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">System Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#ffb4ab] hover:bg-[#93000a]/10 hover:text-[#ffb4ab] transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-[280px] h-full overflow-hidden bg-[#0b1326]">
        {/* Top App Bar (Desktop and Mobile) */}
        <div role="banner" className="h-16 shrink-0 flex justify-between items-center px-4 md:px-8 bg-[#0b1326]/80 backdrop-blur-md border-b border-white/10 shadow-sm z-30">
          {/* Logo only on mobile */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#4edea3]/20 flex items-center justify-center">
              <Sprout className="text-[#4edea3] w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-[#4edea3]">Grovi</h1>
          </div>

          {/* Search bar - hidden on mobile to avoid overcrowding */}
          <div className="hidden md:flex items-center w-full max-w-md relative focus-within:ring-2 focus-within:ring-[#4edea3] rounded-lg">
            <Search className="w-4 h-4 absolute left-3 text-[#bbcabf] pointer-events-none" />
            <input
              className="w-full bg-[#171f33]/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-[#dae2fd] placeholder-[#bbcabf] focus:outline-none focus:border-[#4edea3]/50 transition-colors"
              placeholder="ค้นหาแปลง, เกษตรกร, หรือเซ็นเซอร์..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-4">
            <button 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-[#bbcabf] hover:text-[#4edea3] hover:bg-[#31394d]/50 transition-colors relative"
              onClick={() => alert("ระบบแจ้งเตือนหลักได้รับการยืนยันแล้ว")}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ffb4ab] rounded-full ring-2 ring-[#0b1326]"></span>
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 rounded-full bg-[#4edea3]/20 border border-white/10 group-hover:border-[#4edea3] transition-colors flex items-center justify-center text-[#4edea3] font-bold text-sm select-none">
                {adminName ? adminName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-[#dae2fd] group-hover:text-[#4edea3] transition-colors">
                  {adminName}
                </p>
                <p className="text-[10px] text-[#bbcabf]">System Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="md:hidden flex items-center justify-center text-[#ffb4ab] hover:bg-[#93000a]/10 p-2 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container for Page Content */}
        <div className="flex-grow overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          {/* Dynamic Inner Page Content */}
          <main className="p-4 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet context={{ searchQuery }} />
          </main>
        </div>

        {/* Bottom Navigation Bar (Mobile only) */}
        <nav className="w-full h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[#0b1326]/90 backdrop-blur-lg border-t border-white/10 z-50 md:hidden flex justify-around items-center px-2 shadow-lg shrink-0">
          <Link
            to="/admin/dashboard"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/dashboard") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/dashboard") ? "bg-[#4edea3]/20" : ""}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">Overview</span>
          </Link>

          <Link
            to="/admin/fields"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/fields") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/fields") ? "bg-[#4edea3]/20" : ""}`}>
              <Tractor className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">Fields</span>
          </Link>

          <Link
            to="/admin/users"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/users") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/users") ? "bg-[#4edea3]/20" : ""}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">Users</span>
          </Link>

          <Link
            to="/admin/alerts"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/alerts") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/alerts") ? "bg-[#4edea3]/20" : ""}`}>
              <BellRing className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">Alerts</span>
          </Link>

          <Link
            to="/admin/security"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/security") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/security") ? "bg-[#4edea3]/20" : ""}`}>
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">Security</span>
          </Link>

          <Link
            to="/admin/gee-monitor"
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive("/admin/gee-monitor") ? "text-[#4edea3]" : "text-[#bbcabf]"
            }`}
          >
            <div className={`w-10 h-8 flex items-center justify-center rounded-full mb-0.5 ${isActive("/admin/gee-monitor") ? "bg-[#4edea3]/20" : ""}`}>
              <Satellite className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-sans">GEE</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default AdminLayout;
