import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getDashboardSummary
} from "./services/adminApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Users, UserCheck, Ban, Trash2, SearchX, X } from "lucide-react";

const AdminUsersPage: React.FC = () => {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  const [users, setUsers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, summaryData] = await Promise.all([
        getAllUsers(),
        getDashboardSummary()
      ]);
      setUsers(usersData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "เปลี่ยนบทบาทสำเร็จ",
        showConfirmButton: false,
        timer: 2000,
        background: "#1E293B",
        color: "#fff"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเปลี่ยนบทบาทผู้ใช้ได้",
        confirmButtonColor: "#16a34a"
      });
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      await updateUserStatus(userId, newStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: newStatus ? "เปิดใช้งานบัญชีแล้ว" : "ปิดใช้งานบัญชีแล้ว",
        showConfirmButton: false,
        timer: 2000,
        background: "#1E293B",
        color: "#fff"
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเปลี่ยนสถานะผู้ใช้ได้",
        confirmButtonColor: "#16a34a"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบผู้ใช้ "${userName}" ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "ลบผู้ใช้",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        Swal.fire({
          icon: "success",
          title: "ลบผู้ใช้สำเร็จ",
          showConfirmButton: false,
          timer: 1500,
          background: "#1E293B",
          color: "#fff"
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: "เกิดข้อผิดพลาดระหว่างลบผู้ใช้รายนี้",
          confirmButtonColor: "#16a34a"
        });
      }
    }
  };

  const handleAddUserClick = () => {
    setIsAddUserModalOpen(true);
    setNewUserData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "user"
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createUser(newUserData);
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "สร้างผู้ใช้สำเร็จ",
        showConfirmButton: false,
        timer: 2000,
        background: "#1E293B",
        color: "#fff"
      });
      setIsAddUserModalOpen(false);
      loadData();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.response?.data?.detail || "ไม่สามารถสร้างผู้ใช้ได้",
        confirmButtonColor: "#16a34a",
        background: "#1E293B",
        color: "#fff"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = searchQuery
      ? u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesRole = selectedRole === "all" ? true : u.role === selectedRole;

    const matchesStatus =
      selectedStatus === "all"
        ? true
        : selectedStatus === "active"
        ? u.is_active === true
        : u.is_active === false;

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#4edea3]">
        <div className="w-12 h-12 border-4 border-[#4edea3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-[#bbcabf]">กำลังดึงข้อมูลสมาชิก...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Users Management</h2>
          <p className="text-sm text-[#bbcabf] mt-1">จัดการบทบาท เปิด/ปิดใช้งาน และลบข้อมูลผู้ดูแลระบบและสมาชิกฟาร์ม</p>
        </div>
        <button
          onClick={handleAddUserClick}
          className="flex items-center justify-center gap-2 bg-[#4edea3]/10 hover:bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/20 px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Add New User
        </button>
      </div>

      {/* Statistical Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#4edea3]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#4edea3]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Total Registered</p>
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#4edea3]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">{summary?.total_users || users.length}</h3>
          <p className="text-[10px] text-[#bbcabf] mt-2">สมาชิกผู้ใช้งานในระบบทั้งหมด</p>
        </div>

        {/* Active Now */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#60A5FA]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#60A5FA]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Active Status</p>
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#60A5FA]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">{summary?.active_users || users.filter(u => u.is_active).length}</h3>
          <p className="text-[10px] text-[#bbcabf] mt-2">สมาชิกที่เปิดใช้งานอยู่ขณะนี้</p>
        </div>

        {/* Inactive users */}
        <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Disabled Accounts</p>
            <div className="w-9 h-9 rounded-lg bg-[#171f33] flex items-center justify-center text-[#F59E0B]">
              <Ban className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">{users.filter(u => !u.is_active).length}</h3>
          <p className="text-[10px] text-[#bbcabf] mt-2">บัญชีผู้ใช้ที่ถูกระงับชั่วคราว</p>
        </div>
      </div>

      {/* Table & Controls Container */}
      <div className="bg-[#1E293B]/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0b1326]/30">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filter by Role */}
            <div className="relative w-full sm:w-auto min-w-[150px]">
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value)}>
                <SelectTrigger className="w-full bg-[#171f33] border-white/10 text-white text-xs h-9 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                  <SelectValue placeholder="Roles (ทั้งหมด)" />
                </SelectTrigger>
                <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                  <SelectItem value="all" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Roles (ทั้งหมด)</SelectItem>
                  <SelectItem value="admin" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Admin</SelectItem>
                  <SelectItem value="staff" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Staff</SelectItem>
                  <SelectItem value="farmer" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Farmer</SelectItem>
                  <SelectItem value="user" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Normal User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Status */}
            <div className="relative w-full sm:w-auto min-w-[140px]">
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value)}>
                <SelectTrigger className="w-full bg-[#171f33] border-white/10 text-white text-xs h-9 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                  <SelectValue placeholder="Status (ทั้งหมด)" />
                </SelectTrigger>
                <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                  <SelectItem value="all" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Status (ทั้งหมด)</SelectItem>
                  <SelectItem value="active" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Active Only</SelectItem>
                  <SelectItem value="inactive" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-xs text-white">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-xs text-[#bbcabf] self-end sm:self-auto">
            พบสมาชิก <span className="text-[#4edea3] font-bold">{filteredUsers.length}</span> ราย
          </div>
        </div>

        {/* User Table (Desktop & Tablet) / Cards list (Mobile) */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#060e20]/20">
                <th className="py-4 px-6 text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">User / ชื่อผู้ใช้</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Role / หน้าที่</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Status / สถานะ</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">แปลงที่ครอบครอง</th>
                <th className="py-4 px-6 text-right text-[10px] font-bold text-[#bbcabf] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#171f33] overflow-hidden border border-white/10 flex items-center justify-center text-[#4edea3] font-bold">
                        {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{user.name}</p>
                        <p className="text-[10px] text-[#bbcabf]">{user.email || user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="relative inline-block min-w-[110px]">
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="h-7 bg-[#171f33] border-white/10 text-white text-[11px] px-2.5 py-1 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                          <SelectItem value="admin" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Admin</SelectItem>
                          <SelectItem value="staff" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Staff</SelectItem>
                          <SelectItem value="farmer" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Farmer</SelectItem>
                          <SelectItem value="user" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Normal User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleStatusToggle(user.id, user.is_active)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
                        user.is_active
                          ? "bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30"
                          : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-[#4edea3]" : "bg-[#EF4444]"}`}></span>
                      <span>{user.is_active ? "Active" : "Disabled"}</span>
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                      {user.fields_count || 0} แปลง
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#ffb4ab] hover:bg-[#93000a]/20 hover:text-[#ffb4ab] transition-all"
                      title="Delete User"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User list (Mobile View) */}
        <div className="divide-y divide-white/5 sm:hidden">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 flex flex-col gap-3 hover:bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#171f33] overflow-hidden border border-white/10 flex items-center justify-center text-[#4edea3] font-bold text-xs">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{user.name}</p>
                    <p className="text-[10px] text-[#bbcabf]">{user.email || user.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteUser(user.id, user.name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ffb4ab] hover:bg-[#93000a]/20"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex justify-between items-center mt-1 pt-2 border-t border-white/5 text-xs">
                <div className="flex flex-col gap-1 min-w-[100px]">
                  <span className="text-[10px] text-[#bbcabf]">Role</span>
                  <Select
                    value={user.role || "user"}
                    onValueChange={(value) => handleRoleChange(user.id, value)}
                  >
                    <SelectTrigger className="h-7 bg-[#171f33] border-white/10 text-white text-[11px] px-2 py-0.5 focus:ring-[#4edea3] focus:border-[#4edea3] outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[99999]">
                      <SelectItem value="admin" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Admin</SelectItem>
                      <SelectItem value="staff" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Staff</SelectItem>
                      <SelectItem value="farmer" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Farmer</SelectItem>
                      <SelectItem value="user" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-[11px] text-white">Normal User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] text-[#bbcabf]">Status</span>
                  <button
                    onClick={() => handleStatusToggle(user.id, user.is_active)}
                    className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                      user.is_active
                        ? "bg-[#4edea3]/10 text-[#4edea3] border-[#4edea3]/30"
                        : "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                    }`}
                  >
                    {user.is_active ? "Active" : "Disabled"}
                  </button>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] text-[#bbcabf]">Fields</span>
                  <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[10px] font-mono">
                    {user.fields_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-[#bbcabf] bg-[#1E293B]/40">
            <SearchX className="w-10 h-10 text-white/20 mb-2 mx-auto" />
            <p className="text-xs">ไม่พบรายชื่อผู้ใช้งานที่ตรงตามเงื่อนไขที่ระบุ</p>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-[#171f33] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#1E293B]/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#4edea3]/20 flex items-center justify-center text-[#4edea3]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-white">Add New User</h3>
              </div>
              <button 
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-[#bbcabf] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#bbcabf]">ชื่อ-นามสกุล (Name)</label>
                <input 
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                  className="w-full bg-[#0b1326] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 transition-all placeholder:text-[#bbcabf]/50"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#bbcabf]">ชื่อผู้ใช้ (Username)</label>
                <input 
                  type="text"
                  required
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                  className="w-full bg-[#0b1326] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 transition-all placeholder:text-[#bbcabf]/50"
                  placeholder="เช่น somchai123"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#bbcabf]">อีเมล (Email)</label>
                <input 
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full bg-[#0b1326] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 transition-all placeholder:text-[#bbcabf]/50"
                  placeholder="เช่น somchai@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#bbcabf]">รหัสผ่าน (Password)</label>
                <input 
                  type="password"
                  required
                  minLength={6}
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  className="w-full bg-[#0b1326] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4edea3]/50 focus:ring-1 focus:ring-[#4edea3]/50 transition-all placeholder:text-[#bbcabf]/50"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#bbcabf]">บทบาท (Role)</label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value) => setNewUserData({...newUserData, role: value})}
                >
                  <SelectTrigger className="w-full bg-[#0b1326] border-white/10 text-white text-sm h-10 focus:ring-[#4edea3]/50 focus:border-[#4edea3]/50 outline-none">
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#171f33] border border-white/10 text-white z-[100001]">
                    <SelectItem value="user" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-sm text-white">Normal User</SelectItem>
                    <SelectItem value="farmer" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-sm text-white">Farmer</SelectItem>
                    <SelectItem value="staff" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-sm text-white">Staff</SelectItem>
                    <SelectItem value="admin" className="hover:bg-[#31394d]/50 focus:bg-[#31394d]/50 text-sm text-white text-[#4edea3] font-bold">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-[#bbcabf] hover:text-white hover:bg-white/5 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-sm font-bold bg-[#4edea3] text-[#0b1326] hover:bg-[#3bce93] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-[#0b1326] border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  ยืนยันการสร้าง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsersPage;
