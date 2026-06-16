import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { verifyAdmin } from "./services/adminApi";

const AdminProtectedRoute: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setIsAdmin(false);
        return;
      }
      try {
        await verifyAdmin();
        setIsAdmin(true);
      } catch (err) {
        console.error("Admin verification failed:", err);
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_name");
        localStorage.removeItem("admin_role");
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [location.pathname]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0b1326] flex items-center justify-center text-primary font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-on-surface-variant font-medium">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
