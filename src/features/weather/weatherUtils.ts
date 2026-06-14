/**
 * Weather Utilities
 * WMO Weather Code mapping to icons and descriptions (Thai/English)
 * Wind direction conversion, date formatting
 */

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
interface WeatherCodeInfo {
  icon: string;
  descTH: string;
  descEN: string;
}

const weatherCodeMap: Record<number, WeatherCodeInfo> = {
  0: { icon: "☀️", descTH: "ท้องฟ้าแจ่มใส", descEN: "Clear sky" },
  1: { icon: "🌤️", descTH: "ท้องฟ้าโปร่ง", descEN: "Mainly clear" },
  2: { icon: "⛅", descTH: "มีเมฆบางส่วน", descEN: "Partly cloudy" },
  3: { icon: "☁️", descTH: "มีเมฆมาก", descEN: "Overcast" },
  45: { icon: "🌫️", descTH: "มีหมอก", descEN: "Fog" },
  48: { icon: "🌫️", descTH: "หมอกแข็ง", descEN: "Depositing rime fog" },
  51: { icon: "🌦️", descTH: "ฝนละอองเบา", descEN: "Light drizzle" },
  53: { icon: "🌦️", descTH: "ฝนละอองปานกลาง", descEN: "Moderate drizzle" },
  55: { icon: "🌧️", descTH: "ฝนละอองหนัก", descEN: "Dense drizzle" },
  56: { icon: "🌧️", descTH: "ฝนละอองเย็นเบา", descEN: "Light freezing drizzle" },
  57: { icon: "🌧️", descTH: "ฝนละอองเย็นหนัก", descEN: "Dense freezing drizzle" },
  61: { icon: "🌧️", descTH: "ฝนเบา", descEN: "Slight rain" },
  63: { icon: "🌧️", descTH: "ฝนปานกลาง", descEN: "Moderate rain" },
  65: { icon: "🌧️", descTH: "ฝนหนัก", descEN: "Heavy rain" },
  66: { icon: "🌧️", descTH: "ฝนเย็นเบา", descEN: "Light freezing rain" },
  67: { icon: "🌧️", descTH: "ฝนเย็นหนัก", descEN: "Heavy freezing rain" },
  71: { icon: "🌨️", descTH: "หิมะเบา", descEN: "Slight snow fall" },
  73: { icon: "🌨️", descTH: "หิมะปานกลาง", descEN: "Moderate snow fall" },
  75: { icon: "🌨️", descTH: "หิมะหนัก", descEN: "Heavy snow fall" },
  77: { icon: "🌨️", descTH: "เม็ดหิมะ", descEN: "Snow grains" },
  80: { icon: "🌦️", descTH: "ฝนตกปรอยๆ", descEN: "Slight rain showers" },
  81: { icon: "🌧️", descTH: "ฝนตกปานกลาง", descEN: "Moderate rain showers" },
  82: { icon: "⛈️", descTH: "ฝนตกหนัก", descEN: "Violent rain showers" },
  85: { icon: "🌨️", descTH: "หิมะตกเบา", descEN: "Slight snow showers" },
  86: { icon: "🌨️", descTH: "หิมะตกหนัก", descEN: "Heavy snow showers" },
  95: { icon: "⛈️", descTH: "พายุฝนฟ้าคะนอง", descEN: "Thunderstorm" },
  96: { icon: "⛈️", descTH: "พายุฝนฟ้าคะนองกับลูกเห็บเบา", descEN: "Thunderstorm with slight hail" },
  99: { icon: "⛈️", descTH: "พายุฝนฟ้าคะนองกับลูกเห็บหนัก", descEN: "Thunderstorm with heavy hail" },
};

export function getWeatherIcon(code: number): string {
  return weatherCodeMap[code]?.icon || "🌡️";
}

export function getWeatherDescription(code: number, lang: "TH" | "EN" = "TH"): string {
  const info = weatherCodeMap[code];
  if (!info) return lang === "TH" ? "ไม่ทราบ" : "Unknown";
  return lang === "TH" ? info.descTH : info.descEN;
}

// Convert wind direction degrees to text
const windDirectionsTH: Record<string, string> = {
  N: "เหนือ",
  NNE: "เหนือ-ตะวันออกเฉียงเหนือ",
  NE: "ตะวันออกเฉียงเหนือ",
  ENE: "ตะวันออก-ตะวันออกเฉียงเหนือ",
  E: "ตะวันออก",
  ESE: "ตะวันออก-ตะวันออกเฉียงใต้",
  SE: "ตะวันออกเฉียงใต้",
  SSE: "ใต้-ตะวันออกเฉียงใต้",
  S: "ใต้",
  SSW: "ใต้-ตะวันตกเฉียงใต้",
  SW: "ตะวันตกเฉียงใต้",
  WSW: "ตะวันตก-ตะวันตกเฉียงใต้",
  W: "ตะวันตก",
  WNW: "ตะวันตก-ตะวันตกเฉียงเหนือ",
  NW: "ตะวันตกเฉียงเหนือ",
  NNW: "เหนือ-ตะวันตกเฉียงเหนือ",
};

export function getWindDirectionText(degrees: number, lang: "TH" | "EN" = "TH"): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  const dir = directions[index];
  if (lang === "TH") {
    return `${windDirectionsTH[dir]} (${dir})`;
  }
  return dir;
}

export function getWindDirectionShort(degrees: number, lang: "TH" | "EN" = "TH"): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const shortTH: Record<string, string> = {
    N: "เหนือ", NE: "ตะวันออกเฉียงเหนือ", E: "ตะวันออก", SE: "ตะวันออกเฉียงใต้",
    S: "ใต้", SW: "ตะวันตกเฉียงใต้", W: "ตะวันตก", NW: "ตะวันตกเฉียงเหนือ",
  };
  const index = Math.round(degrees / 45) % 8;
  const dir = directions[index];
  if (lang === "TH") return `${shortTH[dir]} (${dir})`;
  return dir;
}

// Format date in Thai Buddhist calendar
export function formatThaiDate(date: Date): string {
  const thaiDays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  return `${thaiDays[date.getDay()]}ที่ ${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export function formatThaiDateShort(date: Date): string {
  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  return `${date.getDate()} ${thaiMonthsShort[date.getMonth()]}`;
}

export function formatThaiDayName(date: Date): string {
  const thaiDays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  return thaiDays[date.getDay()];
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
