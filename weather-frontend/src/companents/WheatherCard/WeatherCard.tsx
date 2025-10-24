import React from "react";
import type { WeatherData, ForecastDay } from "../../hooks/useLatestWeather"; 
import "./WeatherCard.css";

// === WeatherIcon Bileşeni ===
interface WeatherIconProps {
  condition: string;
  size?: number;
  isNight: boolean; // 💡 YENİ PROP: Gece olup olmadığını belirtir
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ condition, size = 64, isNight }) => {
  const lower = condition.toLowerCase();

  const getIconDetails = () => {
    
    // 1. AÇIK HAVA KARARI: isNight değerine göre Ay veya Güneş gösterilir
    if (lower.includes("güneşli") || lower.includes("açık")) {
      if (isNight) {
        return { icon: "🌙", color: "#D8C49D" }; // Gece ise Ay
      } else {
        return { icon: "☀️", color: "#FFD700" }; // Gündüz ise Güneş
      }
    }
    
    // 2. DİĞER DURUMLAR (ZAMAN BAĞIMSIZ)
    if (lower.includes("yağmurlu") || lower.includes("sağanak"))
      return { icon: "🌧️", color: "#4682B4" };
    if (lower.includes("karlı"))
      return { icon: "❄️", color: "#FFFFFF" };
    if (lower.includes("bulutlu"))
      return { icon: "☁️", color: "#A9A9A9" };
    if (lower.includes("rüzgarlı"))
      return { icon: "💨", color: "#87CEEB" };
    if (lower.includes("puslu") || lower.includes("sisli"))
      return { icon: "🌫️", color: "#D3D3D3" };
      
    return { icon: "🌡️", color: "#FF6B6B" }; // Varsayılan/Bilinmeyen
  };

  const { icon, color } = getIconDetails();

  return (
    <div
      className="weather-icon"
      style={{
        fontSize: size,
        filter: `drop-shadow(0 4px 8px ${color}40)`,
      }}
    >
      {icon}
    </div>
  );
};

// === WeatherCard Props ===
interface WeatherCardProps extends WeatherData {
  forecast: ForecastDay[];
  feels_like?: number; 
  isNight: boolean; // 💡 WeatherContainer'dan gelecek
}

// === WeatherCard Bileşeni ===
const WeatherCard: React.FC<WeatherCardProps> = ({
  location,
  temp,
  condition,
  humidity,
  wind,
  pressure,
  forecast,
  isNight, 
}) => {
  const bgClass = condition?.toLowerCase().replace(/\s+/g, "-") || "default";
  const currentTime = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const windValue = wind ?? 0;

  // =======================================================
  // 💡 KRİTİK DÜZELTME BAŞLANGICI
  // =======================================================
  
  // 1. Eğik çizgi/tire gibi ayırıcıları virgül ile değiştir (ADALAR/İSTANBUL sorununu çözer)
  const cleanedLocation = location?.replace(/[/-]/g, ', '); 
  
  // 2. Türkçe büyük harfe çevir
  let formattedLocation = cleanedLocation?.toLocaleUpperCase('tr-TR') || "";
  
  
  // 3. toLocaleUpperCase('tr-TR') sonrası oluşan hatalı birleştirici noktayı (\u0307) kaldır
  // Bu, "İ̇" hatasını çözer ve "İSTANBUL" doğru görünür.
  formattedLocation = formattedLocation.replace(/\u0307/g, ''); 
  const Location = formattedLocation.split(', ');
  Location.reverse();
  const reservedLocation = Location.join(', ');
  // =======================================================
  // 💡 KRİTİK DÜZELTME SONU
  // =======================================================

  return (
    <div className={`weather-card ${bgClass}`}>
      <div className="weather-indicator"></div>
      <div className="card-gradient"></div>

      <div className="card-header">
        <div className="location-section">
          <div className="location-icon">📍</div>
          <div>
            <h2 className="location-name">{reservedLocation}</h2> {/* Temizlenmiş ve BÜYÜK YAZDIR */}
            <p className="update-time">Son güncelleme: {currentTime}</p>
          </div>
        </div>
        <WeatherIcon condition={condition} size={48} isNight={isNight} /> 
      </div>

      <div className="weather-main">
        <div className="temperature-section">
          <div className="temp-primary">{(temp ?? "Sıcaklık verisi alınamadı")}°</div>
          
        </div>
        <div className="condition-section">
          <div className="condition-text">{condition}</div>
          {windValue > 20 && <div className="wind-warning">⚠️ Kuvvetli rüzgar</div>}
        </div>
      </div>

      <div className="weather-details">
        {humidity !== undefined && (
          <div className="detail-item">
            <div className="detail-icon">💧</div>
            <div className="detail-content">
              <div className="detail-label">Nem</div>
              <div className="detail-value">{humidity}%</div>
            </div>
          </div>
        )}

        {wind !== undefined && (
          <div className="detail-item">
            <div className="detail-icon">💨</div>
            <div className="detail-content">
              <div className="detail-label">Rüzgar</div>
              <div className="detail-value">{wind} km/s</div>
            </div>
            {windValue > 3 && (
              <div className="wind-bar">
                <div
                  className="wind-fill"
                  style={{ width: `${Math.min((windValue / 40) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {pressure !== undefined && (
          <div className="detail-item">
            <div className="detail-icon">📊</div>
            <div className="detail-content">
              <div className="detail-label">Basınç</div>
              <div className="detail-value">{pressure} hPa</div>
            </div>
          </div>
        )}
      </div>

      {/* === 5 GÜNLÜK TAHMİN === */}
      {forecast.length > 0 && (
        <div className="forecast-section">
          <h3 className="forecast-title">5 Günlük Tahmin</h3>
          <div className="forecast-list">
            {forecast.map((dayData, index) => (
              <div key={index} className="forecast-item">
                <div className="forecast-day">{dayData.day}</div>
                {/* 🖼️ Görseli doğru şekilde gösteriyoruz */}
                <img
                  src={dayData.iconUrl}
                  alt={dayData.condition}
                  className="forecast-icon"
                />
                <div className="forecast-temps">
                  <span className="max-temp">{dayData.maxTemp}°</span> /{" "}
                  <span className="min-temp">{dayData.minTemp}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherCard;