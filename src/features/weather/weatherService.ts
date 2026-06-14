/**
 * Weather Service — Open-Meteo API (Free, no API key required)
 * Directly called from frontend
 */

export interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  precipitation: number;
  apparentTemperature: number;
  time: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  humidity: number;
  precipitationProbability: number;
  windSpeed: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  latitude: number;
  longitude: number;
  timezone: string;
}

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "precipitation",
    ].join(","),
    hourly: [
      "temperature_2m",
      "weather_code",
      "relative_humidity_2m",
      "precipitation_probability",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "sunrise",
      "sunset",
    ].join(","),
    timezone: "Asia/Bangkok",
    forecast_days: "7",
  });

  const url = `${OPEN_METEO_BASE}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Parse current weather
  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    apparentTemperature: data.current.apparent_temperature,
    time: data.current.time,
  };

  // Parse hourly — filter from current hour onwards, take next 24h
  const now = new Date();
  const currentHour = now.getHours();
  
  const hourly: HourlyForecast[] = [];
  for (let i = 0; i < data.hourly.time.length; i++) {
    const timeStr = data.hourly.time[i];
    const timeDate = new Date(timeStr);
    
    // Only include hours from now onwards
    if (timeDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour)) {
      hourly.push({
        time: timeStr,
        temperature: data.hourly.temperature_2m[i],
        weatherCode: data.hourly.weather_code[i],
        humidity: data.hourly.relative_humidity_2m[i],
        precipitationProbability: data.hourly.precipitation_probability[i],
        windSpeed: data.hourly.wind_speed_10m[i],
      });
    }
    
    // Limit to 24 hours
    if (hourly.length >= 24) break;
  }

  // Parse daily
  const daily: DailyForecast[] = [];
  for (let i = 0; i < data.daily.time.length; i++) {
    daily.push({
      date: data.daily.time[i],
      weatherCode: data.daily.weather_code[i],
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
      windSpeedMax: data.daily.wind_speed_10m_max[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
    });
  }

  return {
    current,
    hourly,
    daily,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
  };
}
