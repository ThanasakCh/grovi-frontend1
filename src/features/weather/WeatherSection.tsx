import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Calendar,
} from "lucide-react";
import { fetchWeather, type WeatherData } from "./weatherService";
import {
  getWeatherIcon,
  getWeatherDescription,
  getWindDirectionShort,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiDayName,
  formatTime,
} from "./weatherUtils";
import { useLanguage } from "../../contexts/LanguageContext";
import "./WeatherSection.css";

interface WeatherSectionProps {
  lat: number;
  lng: number;
  /** Address/location text to display */
  address?: string;
}

type TabType = "hourly" | "daily" | "wind";

export default function WeatherSection({
  lat,
  lng,
  address,
}: WeatherSectionProps) {
  const { t, language } = useLanguage();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("hourly");
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(
    null,
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const hourlyScrollRef = useRef<HTMLDivElement>(null);
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLDivElement>(null);

  const lang = language === "EN" ? "EN" : "TH";

  useEffect(() => {
    loadWeather();
  }, [lat, lng]);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchWeather(lat, lng);
      setWeatherData(data);
    } catch (err: any) {
      console.error("Failed to fetch weather:", err);
      setError(err.message || "Failed to load weather data");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="ws-container">
        <div className="ws-loading">
          <div className="ws-loading-spinner" />
          <span>{t("loading.message")}</span>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (error || !weatherData) {
    return (
      <div className="ws-container">
        <div className="ws-error">
          <p>
            {lang === "TH"
              ? "ไม่สามารถโหลดข้อมูลสภาพอากาศได้"
              : "Failed to load weather data"}
          </p>
          <button className="ws-retry-btn" onClick={loadWeather}>
            <RefreshCw size={14} />
            {lang === "TH" ? "ลองใหม่" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const { current, hourly, daily } = weatherData;
  const currentDate = new Date();

  // ─── Display values: use selected hour/day or current ───
  const isHourSelected = activeTab === "hourly" && selectedHourIndex !== null;
  const isDaySelected = activeTab === "daily" && selectedDayIndex !== null;
  const selectedHour = isHourSelected ? hourly[selectedHourIndex!] : null;
  const selectedDay = isDaySelected ? daily[selectedDayIndex!] : null;

  const displayTemp = selectedHour
    ? selectedHour.temperature
    : selectedDay
      ? (selectedDay.tempMax + selectedDay.tempMin) / 2
      : current.temperature;
  const displayCode = selectedHour
    ? selectedHour.weatherCode
    : selectedDay
      ? selectedDay.weatherCode
      : current.weatherCode;
  const displayHumidity = selectedHour
    ? selectedHour.humidity
    : current.humidity;
  const displayWindSpeed = selectedHour
    ? selectedHour.windSpeed
    : selectedDay
      ? selectedDay.windSpeedMax
      : current.windSpeed;
  const displayPrecipitation = selectedDay
    ? selectedDay.precipitationSum
    : current.precipitation;
  const displayWindDir = getWindDirectionShort(current.windDirection, lang);

  const weatherIcon = getWeatherIcon(displayCode);
  const weatherDesc = getWeatherDescription(displayCode, lang);

  // Selected time label
  let selectedTimeLabel = "";
  if (isHourSelected && selectedHour) {
    selectedTimeLabel = formatTime(selectedHour.time);
  } else if (isDaySelected && selectedDay) {
    const dayDate = new Date(selectedDay.date + "T00:00:00");
    selectedTimeLabel =
      lang === "TH"
        ? formatThaiDateShort(dayDate)
        : dayDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
  }

  const handleResetSelection = () => {
    setSelectedHourIndex(null);
    setSelectedDayIndex(null);
  };

  return (
    <div className="ws-container">
      {/* ══════════ MAIN WEATHER CARD (Dragonfly Style) ══════════ */}
      <div className="ws-main-card" ref={mainCardRef}>
        {/* Green gradient header area */}
        <div className="ws-card-header">
          {/* Location */}
          <div className="ws-location-row">
            <MapPin size={13} className="ws-location-icon" />
            <span className="ws-location-text">
              {address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
            </span>
          </div>
          {/* Date */}
          <div className="ws-date-row">
            <Calendar size={12} className="ws-date-icon" />
            <span className="ws-date-text">
              {lang === "TH"
                ? formatThaiDate(currentDate)
                : currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
            </span>
          </div>
        </div>

        {/* Selected Time Indicator */}
        {(isHourSelected || isDaySelected) && (
          <div className="ws-selected-indicator">
            <span className="ws-selected-text">
              {lang === "TH"
                ? `แสดงข้อมูลเวลา ${selectedTimeLabel}`
                : `Showing data for ${selectedTimeLabel}`}
            </span>
            <button
              className="ws-selected-reset"
              onClick={handleResetSelection}
            >
              {lang === "TH" ? "กลับปัจจุบัน" : "Reset"}
            </button>
          </div>
        )}

        {/* Temperature + Weather Icon */}
        <div className="ws-temp-section">
          <div className="ws-temp-left">
            <div className="ws-temp-value">
              {displayTemp.toFixed(1)}
              <span className="ws-temp-unit"> °C</span>
            </div>
            <div className="ws-description">{weatherDesc}</div>
          </div>
          <div className="ws-temp-icon">{weatherIcon}</div>
        </div>

        {/* 4 Detail Items — Always visible */}
        <div className="ws-detail-grid">
          {/* ปริมาณฝน */}
          <div className="ws-detail-item">
            <div className="ws-detail-icon-wrap rain">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v6" />
                <path d="m4.93 10.93 1.41 1.41" />
                <path d="M2 18h2" />
                <path d="M20 18h2" />
                <path d="m19.07 10.93-1.41 1.41" />
                <path d="M22 22H2" />
                <path d="m8 6 4-4 4 4" />
                <path d="M16 18a4 4 0 0 0-8 0" />
              </svg>
            </div>
            <div className="ws-detail-info">
              <span className="ws-detail-label">
                {lang === "TH" ? "ปริมาณฝน" : "Rainfall"}
              </span>
              <span className="ws-detail-value">
                {displayPrecipitation} {lang === "TH" ? "มม." : "mm"}
              </span>
            </div>
          </div>

          {/* ความเร็วลม */}
          <div className="ws-detail-item">
            <div className="ws-detail-icon-wrap wind">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
                <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
              </svg>
            </div>
            <div className="ws-detail-info">
              <span className="ws-detail-label">
                {lang === "TH" ? "ความเร็วลม" : "Wind speed"}
              </span>
              <span className="ws-detail-value">
                {displayWindSpeed} {lang === "TH" ? "กม./ชม." : "km/h"}
              </span>
            </div>
          </div>

          {/* ความชื้นสัมพัทธ์ */}
          <div className="ws-detail-item">
            <div className="ws-detail-icon-wrap humidity">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
              </svg>
            </div>
            <div className="ws-detail-info">
              <span className="ws-detail-label">
                {lang === "TH" ? "ความชื้นสัมพัทธ์" : "Humidity"}
              </span>
              <span className="ws-detail-value">{displayHumidity} %</span>
            </div>
          </div>

          {/* ทิศทางลม */}
          <div className="ws-detail-item">
            <div className="ws-detail-icon-wrap direction">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 11 19-9-9 19-2-8-8-2Z" />
                <path d="M11 13 6 6" />
              </svg>
            </div>
            <div className="ws-detail-info">
              <span className="ws-detail-label">
                {lang === "TH" ? "ทิศทางลม" : "Wind dir."}
              </span>
              <span className="ws-detail-value">{displayWindDir}</span>
            </div>
          </div>
        </div>

        {/* Source Attribution */}
        <div className="ws-source">
          {lang === "TH"
            ? "ที่มา (Open-Meteo)"
            : "Source: Open-Meteo (open-meteo.com)"}
        </div>
      </div>

      {/* ══════════ TAB BUTTONS ══════════ */}
      <div className="ws-tab-buttons">
        <button
          className={`ws-tab-btn ${activeTab === "hourly" ? "active" : ""}`}
          onClick={() => setActiveTab("hourly")}
        >
          {lang === "TH" ? "รายชั่วโมง" : "Hourly"}
        </button>
        <button
          className={`ws-tab-btn ${activeTab === "daily" ? "active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          {lang === "TH" ? "รายวัน" : "Daily"}
        </button>
        <button
          className={`ws-tab-btn ${activeTab === "wind" ? "active" : ""}`}
          onClick={() => setActiveTab("wind")}
        >
          {lang === "TH" ? "แผนที่ลม" : "Wind Map"}
        </button>
      </div>

      {/* ══════════ HOURLY FORECAST ══════════ */}
      {activeTab === "hourly" && (
        <div className="ws-forecast-section">
          <div className="ws-scroll-wrapper">
            <button
              className="ws-scroll-btn left"
              onClick={() =>
                hourlyScrollRef.current?.scrollBy({
                  left: -200,
                  behavior: "smooth",
                })
              }
            >
              <ChevronLeft size={16} />
            </button>
            <div className="ws-cards-scroll" ref={hourlyScrollRef}>
              {hourly.slice(0, 24).map((h, idx) => (
                <div
                  className={`ws-hourly-card ${selectedHourIndex === idx ? "selected" : ""}`}
                  key={h.time}
                  onClick={() => {
                    setSelectedHourIndex(
                      selectedHourIndex === idx ? null : idx,
                    );
                    setSelectedDayIndex(null);
                    // Scroll to top of weather card
                    setTimeout(() => {
                      mainCardRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }, 50);
                  }}
                >
                  <span className="ws-card-time">{formatTime(h.time)}</span>
                  <span className="ws-card-icon">
                    {getWeatherIcon(h.weatherCode)}
                  </span>
                  <span className="ws-card-temp">
                    {h.temperature.toFixed(1)}°C
                  </span>
                  <span className="ws-card-desc">
                    {getWeatherDescription(h.weatherCode, lang)}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="ws-scroll-btn right"
              onClick={() =>
                hourlyScrollRef.current?.scrollBy({
                  left: 200,
                  behavior: "smooth",
                })
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════ DAILY FORECAST ══════════ */}
      {activeTab === "daily" && (
        <div className="ws-forecast-section">
          <div className="ws-scroll-wrapper">
            <button
              className="ws-scroll-btn left"
              onClick={() =>
                dailyScrollRef.current?.scrollBy({
                  left: -200,
                  behavior: "smooth",
                })
              }
            >
              <ChevronLeft size={16} />
            </button>
            <div className="ws-cards-scroll" ref={dailyScrollRef}>
              {daily.map((d, idx) => {
                const dayDate = new Date(d.date + "T00:00:00");
                return (
                  <div
                    className={`ws-daily-card ${selectedDayIndex === idx ? "selected" : ""}`}
                    key={d.date}
                    onClick={() => {
                      setSelectedDayIndex(
                        selectedDayIndex === idx ? null : idx,
                      );
                      setSelectedHourIndex(null);
                      // Scroll to top of weather card
                      setTimeout(() => {
                        mainCardRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 50);
                    }}
                  >
                    <span className="ws-card-day">
                      {lang === "TH"
                        ? formatThaiDayName(dayDate)
                        : dayDate.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                    </span>
                    <span className="ws-card-date">
                      {lang === "TH"
                        ? formatThaiDateShort(dayDate)
                        : dayDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                    <span className="ws-card-icon">
                      {getWeatherIcon(d.weatherCode)}
                    </span>
                    <div className="ws-card-temp-range">
                      <span className="temp-min">{Math.round(d.tempMin)}°</span>
                      <span className="temp-divider">/</span>
                      <span className="temp-max">{Math.round(d.tempMax)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="ws-scroll-btn right"
              onClick={() =>
                dailyScrollRef.current?.scrollBy({
                  left: 200,
                  behavior: "smooth",
                })
              }
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════ WIND MAP (Windy Embed) ══════════ */}
      {activeTab === "wind" && (
        <div
          className="ws-forecast-section"
          style={{ padding: 0, overflow: "hidden", height: 350 }}
        >
          <iframe
            width="100%"
            height="350"
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=default&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lng}&detailLat=${lat}&detailLon=${lng}&detail=true`}
            frameBorder="0"
            title="Windy Map"
            style={{ display: "block" }}
          />
        </div>
      )}
    </div>
  );
}
