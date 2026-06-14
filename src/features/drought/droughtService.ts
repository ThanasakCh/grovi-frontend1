/**
 * Drought Risk Service
 * - ดึงข้อมูลฝนย้อนหลังจาก Open-Meteo API (ฟรี)
 * - คำนวณ drought risk score
 * - สร้าง hex grid (ใช้ turf.js) รอบแปลง
 */

import * as turf from "@turf/turf";

// ==================== Types ====================

export interface DroughtScore {
  score: number;        // 0-100
  level: DroughtLevel;
  color: string;
}

export type DroughtLevel = "low" | "moderate" | "high" | "severe" | "critical";

export interface HexCell {
  id: string;
  geometry: GeoJSON.Polygon;
  center: [number, number]; // [lng, lat]
  droughtScore: number;
  level: DroughtLevel;
  color: string;
  rainfall30d: number;
  rainfallAvg: number;
  rainfallDeficit: number;
}

export interface DailyRainfall {
  date: string;
  precipitation: number;
}

export interface DroughtData {
  fieldScore: DroughtScore;
  rainfall30d: number;
  rainfallAvg30d: number;
  rainfallDeficit: number;  // percentage deficit
  dailyRainfall: DailyRainfall[];
  hexCells: HexCell[];
  dataDate: string;
  fieldInsideRisk: DroughtLevel;
}

// ==================== Constants ====================

const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

const DROUGHT_COLORS: Record<DroughtLevel, string> = {
  low: "#fef08a",       // 0-49: light yellow (ไม่เสี่ยง)
  moderate: "#fcd34d",  // 50-59: yellow-orange (ต่ำ)
  high: "#fb923c",      // 60-69: orange (ปานกลาง)
  severe: "#f87171",    // 70-79: light red (สูง)
  critical: "#dc2626",  // 80-100: deep red (สูงมาก)
};

// Historical avg monthly rainfall for Northern Thailand (mm/month approx)
const HISTORICAL_MONTHLY_AVG: Record<number, number> = {
  1: 10,  2: 8,   3: 15,  4: 55,  5: 150,  6: 160,
  7: 170, 8: 220, 9: 250, 10: 130, 11: 40,  12: 15,
};

// ==================== Score Helpers ====================

export function getDroughtLevel(score: number): DroughtLevel {
  if (score < 50) return "low";
  if (score < 60) return "moderate";
  if (score < 70) return "high";
  if (score < 80) return "severe";
  return "critical";
}

export function getDroughtColor(score: number): string {
  return DROUGHT_COLORS[getDroughtLevel(score)];
}

export function getDroughtLevelLabel(level: DroughtLevel, lang: "TH" | "EN" = "TH"): string {
  const labels: Record<DroughtLevel, Record<string, string>> = {
    low:      { TH: "ไม่เสี่ยง",     EN: "No Risk" },
    moderate: { TH: "ต่ำ",         EN: "Low" },
    high:     { TH: "ปานกลาง",      EN: "Moderate" },
    severe:   { TH: "สูง",         EN: "High" },
    critical: { TH: "สูงมาก",       EN: "Very High" },
  };
  return labels[level][lang] || labels[level].TH;
}

// ==================== Rainfall Fetch ====================

async function fetchRainfallHistory(lat: number, lng: number): Promise<DailyRainfall[]> {
  // Fetch last 30 days of rainfall
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: formatDate(start),
    end_date: formatDate(end),
    daily: "precipitation_sum",
    timezone: "Asia/Bangkok",
  });

  try {
    const response = await fetch(`${OPEN_METEO_ARCHIVE}?${params.toString()}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    const dailyRainfall: DailyRainfall[] = [];
    if (data.daily?.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        dailyRainfall.push({
          date: data.daily.time[i],
          precipitation: data.daily.precipitation_sum[i] || 0,
        });
      }
    }
    return dailyRainfall;
  } catch (error) {
    console.error("Failed to fetch rainfall from archive API:", error);
    throw new Error("Unable to fetch real rainfall data. Please try again later.");
  }
}

// ==================== Drought Score Calculation ====================

function calculateDroughtScore(
  rainfall30d: number,
  historicalAvg: number
): number {
  // Rainfall component (100% weight since we only use real data)
  // If rainfall is 0% of average → score = 100 (critical)
  // If rainfall is 100%+ of average → score = 0 (low risk)
  const rainfallRatio = historicalAvg > 0 ? rainfall30d / historicalAvg : 1;
  const rainfallScore = Math.max(0, Math.min(100, (1 - rainfallRatio) * 100));

  return Math.round(rainfallScore);
}

// ==================== Hex Grid Generation ====================

function generateHexGrid(
  centerLat: number,
  centerLng: number,
  fieldRainfall: number,
  radiusKm: number = 2
): HexCell[] {
  // Create bounding box around center
  const bbox: [number, number, number, number] = [
    centerLng - (radiusKm / 111),
    centerLat - (radiusKm / 111),
    centerLng + (radiusKm / 111),
    centerLat + (radiusKm / 111),
  ];

  // Generate hex grid using turf (cellSide in km) - GISTDA uses roughly 1.0-1.5km width
  const cellSide = 1.2; 
  const hexGrid = turf.hexGrid(bbox, cellSide, { units: "kilometers" });

  const hexCells: HexCell[] = [];
  
  hexGrid.features.forEach((feature, index) => {
    const center = turf.centroid(feature);
    const coords = center.geometry.coordinates as [number, number];

    // Distance from field center affects how much the value drifts
    const distFromCenter = turf.distance(
      turf.point([centerLng, centerLat]),
      turf.point(coords),
      { units: "kilometers" }
    );

    // Filter to make realistic circular cluster shape rather than a hard rectangle
    if (distFromCenter > radiusKm) return;

    // We assign consistent values to the hexagon because the OpenMeteo grid format (11km) 
    // literally encompasses all these hexcells. Real meteorology considers them the same space.
    const rainfallForHex = fieldRainfall;

    // Get current month's avg rainfall
    const currentMonth = new Date().getMonth() + 1;
    const monthAvg = HISTORICAL_MONTHLY_AVG[currentMonth] || 50;

    const score = calculateDroughtScore(rainfallForHex, monthAvg);
    const level = getDroughtLevel(score);
    const color = getDroughtColor(score);

    hexCells.push({
      id: `hex-${index}`,
      geometry: feature.geometry as GeoJSON.Polygon,
      center: coords,
      droughtScore: score,
      level,
      color,
      rainfall30d: Math.round(rainfallForHex * 10) / 10,
      rainfallAvg: monthAvg,
      rainfallDeficit: monthAvg > 0 ? Math.round(((monthAvg - rainfallForHex) / monthAvg) * 100) : 0,
    });
  });

  return hexCells;
}

// ==================== Main Function ====================

export async function fetchDroughtData(
  lat: number,
  lng: number,
  _geometry?: any
): Promise<DroughtData> {
  // 1. Fetch real rainfall data
  const dailyRainfall = await fetchRainfallHistory(lat, lng);

  // 2. Calculate total 30-day rainfall
  const rainfall30d = dailyRainfall.reduce((sum, d) => sum + d.precipitation, 0);
  const rainfall30dRounded = Math.round(rainfall30d * 10) / 10;

  // 3. Historical average for current month
  const currentMonth = new Date().getMonth() + 1;
  const rainfallAvg30d = HISTORICAL_MONTHLY_AVG[currentMonth] || 50;

  // 4. Rainfall deficit
  const rainfallDeficit = Math.round(((rainfallAvg30d - rainfall30d) / rainfallAvg30d) * 100);

  // 5. Calculate field drought score
  const fieldScoreValue = calculateDroughtScore(rainfall30d, rainfallAvg30d);
  const fieldScore: DroughtScore = {
    score: fieldScoreValue,
    level: getDroughtLevel(fieldScoreValue),
    color: getDroughtColor(fieldScoreValue),
  };

  // 6. Generate hex grid around field using actual field rainfall.
  // Using 4.5km radius to create ~2 rings of 1.2km hexagons, matching GISTDA's blob size.
  const hexCells = generateHexGrid(lat, lng, rainfall30d, 4.5); 

  // 7. Field inside risk — same as field score
  const fieldInsideRisk = fieldScore.level;

  // 8. Data date
  const dataDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    fieldScore,
    rainfall30d: rainfall30dRounded,
    rainfallAvg30d,
    rainfallDeficit,
    dailyRainfall: dailyRainfall.slice(-14), // last 14 days for chart
    hexCells,
    dataDate,
    fieldInsideRisk,
  };
}
