import React, { useState, useEffect, useCallback } from 'react';
import {
  Satellite, RefreshCw, Play, CheckCircle2, XCircle, Clock,
  CloudOff, Zap, BarChart3, CalendarDays, Globe2, Layers,
  ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Activity,
  Server, Database, Cpu
} from 'lucide-react';
import { getGeeMonitorStatus, getGeeViHistory, triggerGeeExport } from './services/adminApi';

// ---- Types ----
interface ViStatus {
  vi_type: string;
  available: boolean;
  latest_date: string | null;
  total_assets: number;
  north_asset: string;
  south_asset: string;
  error?: string;
}
interface AssetsInfo {
  total_vi_types: number;
  available_vi_types: number;
  coverage_percent: number;
  vi_status: ViStatus[];
}
interface SchedulerInfo {
  running: boolean;
  next_run: string | null;
  last_run: string | null;
  schedule_days: number;
  schedule_hour: number;
}
interface StatusData {
  scheduler: SchedulerInfo;
  assets: AssetsInfo;
  gee_connected: boolean;
  generated_at: string;
}

// ---- Helpers ----
const VI_META: Record<string, { label: string; desc: string; color: string; gradient: string }> = {
  NDVI: { label: 'NDVI', desc: 'Normalized Difference Vegetation Index', color: '#4edea3', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  EVI: { label: 'EVI', desc: 'Enhanced Vegetation Index', color: '#34d399', gradient: 'from-teal-500/20 to-teal-500/5' },
  GNDVI: { label: 'GNDVI', desc: 'Green NDVI', color: '#86efac', gradient: 'from-green-400/20 to-green-400/5' },
  NDWI: { label: 'NDWI', desc: 'Normalized Difference Water Index', color: '#60a5fa', gradient: 'from-blue-500/20 to-blue-500/5' },
  SAVI: { label: 'SAVI', desc: 'Soil Adjusted Vegetation Index', color: '#fbbf24', gradient: 'from-amber-500/20 to-amber-500/5' },
  VCI: { label: 'VCI', desc: 'Vegetation Condition Index', color: '#f472b6', gradient: 'from-pink-500/20 to-pink-500/5' },
};

function formatNextRun(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.round(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.round(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.round(diff / 86400)} วันที่แล้ว`;
  } catch {
    return iso;
  }
}

// ---- Sub-components ----

function StatCard({ icon, label, value, sub, color = '#4edea3', pulse = false }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; color?: string; pulse?: boolean;
}) {
  return (
    <div className="relative bg-[#171f33]/80 border border-white/10 rounded-2xl p-5 flex items-center gap-4 overflow-hidden group hover:border-white/20 transition-all duration-300">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${color}10, transparent 70%)` }} />
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20` }}>
        {pulse ? (
          <span className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: `${color}40` }} />
            <span className="relative" style={{ color }}>{icon}</span>
          </span>
        ) : (
          <span style={{ color }}>{icon}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#bbcabf] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xl font-bold text-[#dae2fd] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[#bbcabf] mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function CoverageRing({ percent }: { percent: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const stroke = (percent / 100) * circ;
  const color = percent >= 80 ? '#4edea3' : percent >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#ffffff10" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${stroke} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-in-out' }} />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{percent}%</span>
        <span className="text-[10px] text-[#bbcabf]">ครบถ้วน</span>
      </div>
    </div>
  );
}

function ViCard({ vi, onTrigger }: { vi: ViStatus; onTrigger: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const meta = VI_META[vi.vi_type] || { label: vi.vi_type, desc: '', color: '#4edea3', gradient: 'from-emerald-500/20 to-emerald-500/5' };

  const loadHistory = useCallback(async () => {
    if (history.length > 0) return;
    setLoadingHistory(true);
    try {
      const res = await getGeeViHistory(vi.vi_type);
      setHistory(res.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [vi.vi_type, history.length]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadHistory();
  };

  return (
    <div className={`bg-[#171f33]/80 border rounded-2xl overflow-hidden transition-all duration-300 
      ${vi.available ? 'border-white/10 hover:border-white/20' : 'border-[#f87171]/20'}`}>
      {/* Card Header */}
      <div className={`bg-gradient-to-r ${meta.gradient} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}30` }}>
              <Layers className="w-5 h-5" style={{ color: meta.color }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: meta.color }}>{meta.label}</h3>
              <p className="text-[10px] text-[#bbcabf]">{meta.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vi.available ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                พร้อมใช้
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                <XCircle className="w-3 h-3" /> ยังไม่มีข้อมูล
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0b1326]/60 rounded-xl p-3">
            <p className="text-[10px] text-[#bbcabf] mb-1">ข้อมูลล่าสุด</p>
            <p className="text-sm font-semibold text-[#dae2fd]">{vi.latest_date ?? '—'}</p>
          </div>
          <div className="bg-[#0b1326]/60 rounded-xl p-3">
            <p className="text-[10px] text-[#bbcabf] mb-1">Assets สะสม</p>
            <p className="text-sm font-semibold text-[#dae2fd]">{vi.total_assets} รอบ</p>
          </div>
        </div>

        {/* Regions */}
        <div className="flex gap-2">
          {['north', 'south'].map((r) => {
            const has = r === 'north' ? !!vi.north_asset : !!vi.south_asset;
            return (
              <div key={r} className={`flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs
                ${has ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-400'}`}>
                {has ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
                <span className="font-medium">{r === 'north' ? 'ภาคเหนือ' : 'ภาคใต้'}</span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleExpand}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#bbcabf] hover:text-[#dae2fd] bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
          </button>
          <button
            onClick={() => onTrigger(vi.vi_type)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}30` }}
          >
            <Play className="w-3 h-3" /> ประมวลผล
          </button>
        </div>

        {/* Expanded History */}
        {expanded && (
          <div className="border-t border-white/5 pt-3 space-y-2">
            <p className="text-xs font-semibold text-[#bbcabf] mb-2 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> ประวัติการ Export
            </p>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-4 h-4 animate-spin text-[#bbcabf]" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-[#bbcabf] text-center py-3">ไม่มีประวัติ</p>
            ) : (
              history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-[#0b1326]/50 rounded-lg px-3 py-2">
                  <span className="text-[#dae2fd] font-medium">{h.date}</span>
                  <div className="flex gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${h.north_available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-400'}`}>N</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${h.south_available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-400'}`}>S</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main Page ----
const AdminGeeMonitorPage: React.FC = () => {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading && !status) {
      setLoadProgress(0);
      timer = setInterval(() => {
        setLoadProgress(p => {
          if (p < 40) return p + Math.floor(Math.random() * 5) + 5; // Fast to 40
          if (p < 70) return p + Math.floor(Math.random() * 3) + 2; // Medium to 70
          if (p < 95) return p + 1; // Slow to 95
          return p;
        });
      }, 300);
    } else if (!loading && status) {
      setLoadProgress(100);
    }
    return () => clearInterval(timer);
  }, [loading, status]);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGeeMonitorStatus();
      setStatus(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Failed to fetch GEE status', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTriggerAll = async () => {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      await triggerGeeExport('ALL');
      setTriggerMsg({ type: 'success', text: 'ส่งคำสั่ง Export ทุก VI เรียบร้อยแล้ว! ระบบกำลังประมวลผลบน Google Cloud' });
      fetchStatus();
    } catch {
      setTriggerMsg({ type: 'error', text: 'ไม่สามารถส่งคำสั่งได้ โปรดลองใหม่อีกครั้ง' });
    } finally {
      setTriggering(false);
      setTimeout(() => setTriggerMsg(null), 5000);
    }
  };

  const handleTriggerOne = async (viType: string) => {
    setTriggerMsg(null);
    try {
      await triggerGeeExport(viType);
      setTriggerMsg({ type: 'success', text: `ส่งคำสั่ง Export ${viType} เรียบร้อยแล้ว!` });
    } catch {
      setTriggerMsg({ type: 'error', text: `ไม่สามารถส่งคำสั่ง Export ${viType} ได้` });
    }
    setTimeout(() => setTriggerMsg(null), 5000);
  };

  const sched = status?.scheduler;
  const assets = status?.assets;
  const coveragePct = assets?.coverage_percent ?? 0;

  return (
    <div className="min-h-full space-y-6 pb-8">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#4edea3]/20 flex items-center justify-center">
              <Satellite className="w-5 h-5 text-[#4edea3]" />
            </div>
            <h2 className="text-xl font-bold text-[#dae2fd]">GEE Asset Monitor</h2>
          </div>
          <p className="text-sm text-[#bbcabf]">
            ติดตามสถานะการประมวลผลภาพดาวเทียมล่วงหน้าทั้งประเทศแบบเรียลไทม์
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#bbcabf]">อัปเดตล่าสุด: {timeAgo(lastRefresh.toISOString())}</span>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171f33] border border-white/10 text-sm text-[#dae2fd] hover:border-[#4edea3]/50 hover:text-[#4edea3] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
          <button
            onClick={handleTriggerAll}
            disabled={triggering || !status?.gee_connected}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4edea3]/20 border border-[#4edea3]/40 text-sm text-[#4edea3] font-semibold hover:bg-[#4edea3]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {triggering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            ประมวลผลทั้งหมด
          </button>
        </div>
      </div>

      {/* Trigger message */}
      {triggerMsg && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
          triggerMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {triggerMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {triggerMsg.text}
        </div>
      )}

      {/* ===== Loading UI ===== */}
      {loading && !status && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-28 h-28 mb-6">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff10" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#4edea3" strokeWidth="8"
                strokeDasharray={`${(loadProgress / 100) * 263.89} 263.89`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.3s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-[#4edea3]">{loadProgress}%</span>
            </div>
          </div>
          <p className="text-[#dae2fd] font-medium text-lg">กำลังเชื่อมต่อ Google Earth Engine...</p>
          <p className="text-[#bbcabf] text-sm mt-2">อาจใช้เวลาสักครู่ในการตรวจสอบ Asset ล่าสุดจากดาวเทียม</p>
        </div>
      )}

      {status && (
        <>
          {/* ===== Stat Cards Row ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Scheduler"
              value={sched?.running ? 'กำลังทำงาน' : 'หยุดทำงาน'}
              sub={sched?.running ? `ทุก ${sched.schedule_days} วัน เวลา ${sched.schedule_hour}:00 น.` : 'ไม่ได้ใช้งาน'}
              color={sched?.running ? '#4edea3' : '#f87171'}
              pulse={sched?.running}
            />
            <StatCard
              icon={<Database className="w-5 h-5" />}
              label="VI ที่พร้อมใช้"
              value={`${assets?.available_vi_types ?? 0} / ${assets?.total_vi_types ?? 6}`}
              sub="ดัชนีพืชพรรณที่มี Asset พร้อมแล้ว"
              color="#60a5fa"
            />
            <StatCard
              icon={<Globe2 className="w-5 h-5" />}
              label="ครอบคลุม"
              value={`${coveragePct}%`}
              sub="ของดัชนีทั้งหมดมีข้อมูลพร้อม"
              color={coveragePct === 100 ? '#4edea3' : coveragePct >= 50 ? '#fbbf24' : '#f87171'}
            />
            <StatCard
              icon={<Server className="w-5 h-5" />}
              label="GEE Connection"
              value={status.gee_connected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
              sub={status.gee_connected ? 'Google Earth Engine พร้อมใช้งาน' : 'กรุณาตรวจสอบ Service Account'}
              color={status.gee_connected ? '#4edea3' : '#f87171'}
            />
          </div>

          {/* ===== Center Panel: Coverage Ring + Scheduler Details ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coverage Ring */}
            <div className="bg-[#171f33]/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
              <CoverageRing percent={coveragePct} />
              <div className="text-center">
                <p className="text-sm font-semibold text-[#dae2fd]">ความครบถ้วนของข้อมูล</p>
                <p className="text-xs text-[#bbcabf] mt-1">
                  {assets?.available_vi_types ?? 0} จาก {assets?.total_vi_types ?? 6} ดัชนีพืชพรรณมีข้อมูลพร้อมใช้งาน
                </p>
              </div>
            </div>

            {/* Scheduler Card */}
            <div className="lg:col-span-2 bg-[#171f33]/80 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-[#4edea3]" />
                <h3 className="text-base font-bold text-[#dae2fd]">ตารางการประมวลผล</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0b1326]/60 rounded-xl p-4">
                  <p className="text-xs text-[#bbcabf] mb-1">รันครั้งถัดไป</p>
                  <p className="text-sm font-semibold text-[#dae2fd]">
                    {formatNextRun(sched?.next_run ?? null)}
                  </p>
                </div>
                <div className="bg-[#0b1326]/60 rounded-xl p-4">
                  <p className="text-xs text-[#bbcabf] mb-1">รอบการทำงาน</p>
                  <p className="text-sm font-semibold text-[#dae2fd]">
                    ทุก {sched?.schedule_days ?? 5} วัน เวลา {sched?.schedule_hour ?? 2}:00 น.
                  </p>
                </div>
                <div className="bg-[#0b1326]/60 rounded-xl p-4">
                  <p className="text-xs text-[#bbcabf] mb-1">รัน Export ล่าสุด</p>
                  <p className="text-sm font-semibold text-[#dae2fd]">
                    {sched?.last_run ? formatNextRun(sched.last_run) : '—'}
                  </p>
                </div>
                <div className="bg-[#0b1326]/60 rounded-xl p-4">
                  <p className="text-xs text-[#bbcabf] mb-1">เก็บข้อมูลสะสม</p>
                  <p className="text-sm font-semibold text-[#dae2fd]">4 รอบล่าสุด</p>
                </div>
              </div>

              {/* Timeline visual */}
              <div className="mt-2">
                <p className="text-xs text-[#bbcabf] mb-3">รอบการประมวลผล (ย้อนหลัง 4 รอบ)</p>
                <div className="flex items-center gap-1">
                  {[...Array(4)].map((_, i) => {
                    const viList = assets?.vi_status ?? [];
                    const allReady = viList.every((v) => v.available);
                    const filled = i === 0 && allReady;
                    return (
                      <React.Fragment key={i}>
                        <div className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                          i === 0 ? (allReady ? 'bg-[#4edea3]' : 'bg-[#fbbf24]') : 'bg-white/10'
                        }`} />
                        {i < 3 && <div className="w-1 h-1 rounded-full bg-white/20" />}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#4edea3] font-semibold">ล่าสุด</span>
                  <span className="text-[10px] text-[#bbcabf]">15 วันที่แล้ว</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== VI Cards Grid ===== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-[#4edea3]" />
              <h3 className="text-base font-bold text-[#dae2fd]">สถานะรายดัชนีพืชพรรณ</h3>
              <span className="ml-2 text-xs bg-[#4edea3]/10 text-[#4edea3] px-2 py-0.5 rounded-full border border-[#4edea3]/20">
                {assets?.available_vi_types ?? 0}/{assets?.total_vi_types ?? 6} พร้อมใช้
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {(assets?.vi_status ?? []).map((vi) => (
                <ViCard key={vi.vi_type} vi={vi} onTrigger={handleTriggerOne} />
              ))}
            </div>
          </div>

          {/* ===== Footer info ===== */}
          <div className="flex items-center gap-2 text-xs text-[#bbcabf] pt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ข้อมูล ณ {new Date(status.generated_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false })}</span>
            <span className="mx-2">·</span>
            <Cpu className="w-3.5 h-3.5" />
            <span>Export ทำงานบน Google Cloud (ไม่กินทรัพยากรเซิร์ฟเวอร์)</span>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminGeeMonitorPage;
