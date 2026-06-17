import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from './services/adminApi';
import './AdminLoginPage.css';
import {
  Satellite,
  Sprout,
  Activity,
  AlertTriangle,
  Tractor,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

const AdminLoginPage: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(usernameOrEmail, password);
      localStorage.setItem('admin_token', data.access_token);
      localStorage.setItem('admin_name', data.admin_name);
      localStorage.setItem('admin_role', data.role);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      {/* Background ambient orbs */}
      <div className="ambient-glow orb-1"></div>
      <div className="ambient-glow orb-2"></div>
      <div className="ambient-glow orb-3"></div>

      <div className="login-split-layout">
        
        {/* Left Side: AgTech Visual Showcase (Hidden on Mobile) */}
        <div className="login-showcase-panel">
          <div className="showcase-content">
            <div className="showcase-badge">
              <Satellite className="w-4 h-4 icon-spin" />
              <span>Grovi Satellite Systems v2.4</span>
            </div>
            
            <h1 className="showcase-title">
              ระบบวิเคราะห์ข้อมูล <br />
              <span className="gradient-text">การเกษตรอัจฉริยะ</span>
            </h1>
            
            <p className="showcase-description">
              แพลตฟอร์มบริหารจัดการและติดตามสุขภาพพืชผลผ่านภาพถ่ายดาวเทียมความละเอียดสูง (NDVI Telemetry) และการตรวจจับความผิดปกติแบบเรียลไทม์
            </p>

            {/* Simulated Live AgTech Widgets */}
            <div className="telemetry-widgets">
              <div className="telemetry-card">
                <div className="telemetry-icon green">
                  <Sprout className="w-5 h-5" />
                </div>
                <div className="telemetry-info">
                  <span className="telemetry-label">ความสมบูรณ์เฉลี่ย</span>
                  <span className="telemetry-value">0.78 NDVI</span>
                </div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-icon cyan">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="telemetry-info">
                  <span className="telemetry-label">พื้นที่วิเคราะห์ผล</span>
                  <span className="telemetry-value">1,420 ไร่</span>
                </div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-icon orange">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="telemetry-info">
                  <span className="telemetry-label">ตรวจพบความแห้งแล้ง</span>
                  <span className="telemetry-value">3 จุดวิกฤต</span>
                </div>
              </div>
            </div>

            {/* Tech Scan Line Overlay / Radar Simulation */}
            <div className="radar-simulation">
              <div className="radar-grid"></div>
              <div className="radar-sweep"></div>
              <div className="radar-ping ping-1"></div>
              <div className="radar-ping ping-2"></div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Panel */}
        <div className="login-form-panel">
          <div className="login-glass-card">
            
            <header className="login-card-header">
              <div className="logo-glow-wrapper">
                <div className="logo-badge">
                  <Tractor className="w-6 h-6" />
                </div>
              </div>
              <h2 className="login-title">แผงควบคุมระบบ</h2>
              <p className="login-subtitle">ลงชื่อเข้าใช้สำหรับผู้ดูแลระบบ Grovi</p>
            </header>

            <form onSubmit={handleLogin} className="login-form">
              {/* Username Input */}
              <div className="input-group">
                <label className="input-label" htmlFor="username">ชื่อผู้ใช้งาน หรือ อีเมล</label>
                <div className="input-field-wrapper">
                  <User className="input-icon" />
                  <input
                    className="login-input"
                    id="username"
                    name="username"
                    type="text"
                    placeholder="admin@grovi.co.th"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                  />
                  <span className="input-border-glow"></span>
                </div>
              </div>

              {/* Password Input */}
              <div className="input-group">
                <label className="input-label" htmlFor="password">รหัสผ่าน</label>
                <div className="input-field-wrapper">
                  <Lock className="input-icon" />
                  <input
                    className="login-input"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="password-toggle-icon-btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                  <span className="input-border-glow"></span>
                </div>
              </div>

              {/* Error Alert Block */}
              {error && (
                <div className="login-error-alert">
                  <ShieldAlert className="error-icon" />
                  <div className="error-text">{error}</div>
                </div>
              )}

              {/* Glowing Login Button */}
              <button
                className="btn-submit-premium"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-loader"></span>
                    <span>กำลังตรวจสอบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบแดชบอร์ด</span>
                    <ArrowRight className="btn-arrow" />
                  </>
                )}
              </button>
            </form>

            <footer className="login-card-footer">
              <span className="material-symbols-outlined shield-icon">verified_user</span>
              <span>การเชื่อมต่อปลอดภัยระดับ SSL 256-bit</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
