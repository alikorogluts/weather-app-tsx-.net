import React, { useMemo, useState, useEffect } from "react";
import WeatherCard from "../WheatherCard/WeatherCard"; 
import Loader from "../Loader/Loader";
import { useLatestWeather } from "../../hooks/useLatestWeather"; 
import { useGeolocation } from "../../hooks/useGeolocation";
import citiesData from '../../data/cities.json'; 
import "./WeatherContainer.css"; 

type WeatherCondition = 'güneşli' | 'bulutlu' | 'yağmurlu' | 'sağanak' | 'rüzgarlı' | 'puslu' | 'sisli' | 'gece' | 'açık' | 'karlı';

interface CityDistrict {
  ilce_id: string;
  ilce_adi: string;
  sehir_id: string;
  sehir_adi: string;
}

// JSON verisini kullanıyoruz
const cityData: CityDistrict[] = citiesData as CityDistrict[];

const checkIsNight = (currentHour: number): boolean => {
    return currentHour >= 20 || currentHour < 6;
};

// =======================================================
// YENİ VE İYİLEŞTİRİLMİŞ findCityByAddress FONKSİYONU
// Türkçe locale (tr-TR) kullanılarak karakter eşleştirme sorunları çözülüyor.
// =======================================================
const findCityByAddress = (address: string): CityDistrict | null => {
    // Tüm karşılaştırmaları Türkçe (tr-TR) locale kullanarak küçük harfe çeviren yardımcı fonksiyon
    const toLowerTr = (s: string) => s.toLocaleLowerCase('tr-TR');

    const lowerAddress = toLowerTr(address);
    const cityParts = lowerAddress.split(/[\s,-]+/);
    
    // 1. En Keskin Eşleşme: Adreste hem ilçe hem il geçiyor mu? (örn: 'seyhan adana')
    let found = cityData.find(city => {
        const lowerIlce = toLowerTr(city.ilce_adi);
        const lowerSehir = toLowerTr(city.sehir_adi);
        return lowerAddress.includes(lowerIlce) && lowerAddress.includes(lowerSehir);
    });
    if (found) return found;

    // 2. İlçe Adı Eşleşmesi Ara (Öncelikli)
    found = cityData.find(city => {
      const lowerIlce = toLowerTr(city.ilce_adi);
      // İlçe adının parça olarak geçmesi veya tam eşleşmesi
      return cityParts.some(part => lowerIlce === part || lowerIlce.includes(part));
    });
    if (found) return found;

    // 3. İl Adı Eşleşmesi Ara
    found = cityData.find(city => {
      const lowerSehir = toLowerTr(city.sehir_adi);
      // İl adının parça olarak geçmesi veya tam eşleşmesi
      return cityParts.some(part => lowerSehir === part || lowerSehir.includes(part));
    });
    
    return found || null;
};
// =======================================================

const WeatherContainer: React.FC = () => {
  // State'ler
  const [selectedCity, setSelectedCity] = useState<CityDistrict | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Hook'lar
  const { coords, address, loading: geoLoading, error: geoError, retry: retryGeolocation } = useGeolocation();
  
  // Seçili şehre göre hava durumu verisi çek
  const fullAddress = selectedCity ? `${selectedCity.ilce_adi}, ${selectedCity.sehir_adi}` : "";
  const { data, forecast, loading: weatherLoading, error: weatherError } = useLatestWeather(fullAddress); 
  
  // Kombine durumlar
  const loading = geoLoading || weatherLoading;
  const error = weatherError || geoError;

  // Konum bulunduğunda otomatik seçim
  useEffect(() => {
    if (coords && address && !selectedCity && !geoError) {
      // Konumdan gelen adresi şehir listesinde ara
      const foundCity = findCityByAddress(address);
      
      if (foundCity) {
        setSelectedCity(foundCity);
        setSearchInput(`${foundCity.ilce_adi}, ${foundCity.sehir_adi}`);
        setSearchError("");
      } else {
        // Konum adresi listedeki şehirlerle eşleşmezse hata göster
        setSearchError("Konumunuz listedeki şehirlerle eşleşmedi. Lütfen arama yapın.");
      }
    }
  }, [coords, address, selectedCity, geoError]); 

  // =======================================================
  // İYİLEŞTİRİLMİŞ filteredCities: Türkçe locale dönüşümü eklendi
  // =======================================================
  const filteredCities = useMemo(() => {
    if (searchInput.length < 2) return [];
    
    // Türkçe locale dönüşümü
    const lowerInput = searchInput.toLocaleLowerCase('tr-TR').trim(); 
    
    return cityData
      .filter(city => {
        // Türkçe locale dönüşümü
        const lowerIlce = city.ilce_adi.toLocaleLowerCase('tr-TR');
        const lowerSehir = city.sehir_adi.toLocaleLowerCase('tr-TR');
        const lowerFull = `${lowerIlce} ${lowerSehir}`;

        return lowerIlce.includes(lowerInput) ||
               lowerSehir.includes(lowerInput) ||
               lowerFull.includes(lowerInput);
      })
      .slice(0, 10);
  }, [searchInput]);
  // =======================================================

  // Şehir seçme işlevi
  const handleCitySelect = (city: CityDistrict) => {
    setSelectedCity(city);
    setSearchInput(`${city.ilce_adi}, ${city.sehir_adi}`);
    setShowSuggestions(false);
    setSearchError("");
  };

  // Arama işlevi (handleSearch)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchInput.trim()) {
      setSearchError("Lütfen bir şehir adı girin");
      return;
    }

    // İyileştirme: Eğer öneri listesi açıksa, ilk öneriyi otomatik seç.
    if (filteredCities.length > 0) {
        handleCitySelect(filteredCities[0]);
        return; 
    }

    // Input'tan şehir bulmaya çalış (fallback)
    const foundCity = findCityByAddress(searchInput);
    
    if (foundCity) {
      handleCitySelect(foundCity);
    } else {
      setSearchError("Geçerli bir il/ilçe bulunamadı. Lütfen listedeki şehirlerden birini seçin.");
    }
  };

  // Konum butonu işlevi
  const handleLocateMe = () => {
    if (geoLoading) return;
    // Mevcut seçimi temizle ki, konum bulunduğunda useEffect tekrar çalışsın.
    setSelectedCity(null); 
    setSearchInput("");
    setSearchError("");
    retryGeolocation();
  };

  // Hava durumu analizi (aynı kaldı)
  const weatherAnalysis = useMemo(() => {
    if (!data) return null;
    
    const condition = data.condition.toLocaleLowerCase('tr-TR') as WeatherCondition; // Analizde de locale kullanmak daha iyi
    const windSpeed = data.wind || 0;
    const temp = data.temp || 20;

    const currentHour = new Date().getHours();
    const isNight = checkIsNight(currentHour);
    const isDaytime = !isNight;
    
    const isClearNight = isNight && (condition.includes("açık") || condition.includes("güneşli"));

    return {
      condition,
      windSpeed,
      temp,
      isRainy: condition.includes("yağmur") || condition.includes("sağanak"),
      isWindy: condition.includes("rüzgar") || windSpeed > 3,
      isFoggy: condition.includes("puslu") || condition.includes("sisli"),
      isCloudy: condition.includes("bulutlu"),
      isSunny: isDaytime && (condition.includes("güneşli") || condition.includes("açık")),
      isSnowy: condition.includes("karlı"), 
      isNight, 
      isDaytime, 
      isClearNight,
      isCold: temp < 5, 
      isHot: temp > 30
    };
  }, [data]);

  // Animasyon render (aynı kaldı)
  const renderAnimation = useMemo(() => {
    if (!weatherAnalysis || !data) return null;

    const { 
      isRainy, isWindy, isFoggy, isCloudy, isSunny, isNight, isCold, isDaytime, isSnowy 
    } = weatherAnalysis;

    let drops: React.ReactNode = null;
    let winds: React.ReactNode = null;
    let leaves: React.ReactNode = null;
    let sun: React.ReactNode = null;
    let clouds: React.ReactNode = null;
    let fog: React.ReactNode = null;
    let stars: React.ReactNode = null;
    let snow: React.ReactNode = null;
    let moon: React.ReactNode = null; 

    // === STARS FOR NIGHT ===
    if (isNight && !isCloudy && !isRainy && !isSnowy && !isFoggy) { 
      stars = Array.from({ length: 80 }, (_, i) => (
        <div
          key={`star-${i}`}
          className="star"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
          }}
        />
      ));
    }

    // === MOON EFFECT - GECE AÇIK HAVA İÇİN ===
    if (isNight && !isCloudy && !isRainy && !isSnowy && !isFoggy) {
      moon = (
        <div className="night-moon" />
      );
    }

    // === SNOW EFFECT - KARLI HAVA İÇİN ===
    if (isSnowy || (isCold && isCloudy)) {
      const snowflakeCount = isSnowy ? 120 : 80; 
      snow = Array.from({ length: snowflakeCount }, (_, i) => {
        const size = Math.random() * 4 + 2;
        const isLargeFlake = Math.random() > 0.7;
        const snowStyle: React.CSSProperties = {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 10}s`,
          animationDuration: `${8 + Math.random() * 12}s`,
          width: `${size}px`,
          height: `${size}px`,
          opacity: 0.7 + Math.random() * 0.3,
          filter: `blur(${isLargeFlake ? '1px' : '0.5px'})`,
        };

        return (
          <div
            key={`snow-${i}`}
            className={`snowflake ${isLargeFlake ? 'large-flake' : ''} ${isWindy ? 'windy-snow' : ''}`}
            style={snowStyle}
          />
        );
      });
    }

    // === RAIN EFFECT - KARLI HAVADA YAĞMUR OLMASIN ===
    if (isRainy && !isSnowy) {
      const dropCount = isWindy ? 100 : 150;
      drops = Array.from({ length: dropCount }, (_, i) => {
        const isHeavyDrop = Math.random() > 0.7;
        const dropStyle: React.CSSProperties = {
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: isWindy ? 
            `${0.4 + Math.random() * 0.3}s` : 
            `${0.8 + Math.random() * 0.4}s`,
          opacity: 0.6 + Math.random() * 0.4,
          width: isHeavyDrop ? '3px' : '2px',
          height: isHeavyDrop ? '20px' : '15px',
        };

        return (
          <div
            key={`rain-${i}`}
            className={`raindrop ${isHeavyDrop ? 'heavy-drop' : ''} ${isWindy ? 'windy-drop' : ''}`}
            style={dropStyle}
          />
        );
      });
    }

    // === ADVANCED WIND EFFECT ===
    if (isWindy) {
      winds = Array.from({ length: 15 }, (_, i) => {
        const windStyle: React.CSSProperties = {
          top: `${Math.random() * 100}%`,
          height: `${0.5 + Math.random() * 1.5}px`,
          animationDelay: `${Math.random() * 6}s`,
          animationDuration: `${1.5 + Math.random() * 2}s`,
          opacity: 0.15 + (Math.random() * 0.25),
          transform: `rotate(${Math.random() * 8 - 4}deg)`,
        };

        return (
          <div
            key={`wind-${i}`}
            className="wind-line"
            style={windStyle}
          />
        );
      });

      if (!isSunny && !isDaytime) {
        leaves = Array.from({ length: 12 }, (_, i) => {
          const leafStyle: React.CSSProperties = {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${5 + Math.random() * 8}s`,
            transform: `scale(${0.2 + Math.random() * 0.6})`,
            fontSize: `${14 + Math.random() * 10}px`,
          };

          return (
            <div
              key={`leaf-${i}`}
              className="wind-leaf"
              style={leafStyle}
            >
              {Math.random() > 0.5 ? '🍃' : '🌿'}
            </div>
          );
        });
      }
    }
    
    // === SUN EFFECT - GÜNDÜZ AÇIK HAVA İÇİN ===
    if (isDaytime && isSunny && !isRainy && !isCloudy && !isFoggy && !isSnowy) {
      sun = <div className="sunny-sun" />;
    }

    // === CLOUD EFFECT - KARLI HAVADA DA BULUT GÖSTER ===
    if (isCloudy || isRainy || isFoggy || isSnowy) {
      const cloudCount = (isRainy || isSnowy || isFoggy) ? (6 + Math.floor(Math.random() * 4)) : (3 + Math.floor(Math.random() * 3));
      const verticalStep = 20 / cloudCount;
      const baseTop = 5;

      clouds = Array.from({ length: cloudCount }, (_, i) => { 
        const duration = `${40 + Math.random() * 80}s`;
        const delay = `${Math.random() * -120}s`;
        const randomJitter = Math.random() * verticalStep * 0.6;
        const verticalPosition = `${baseTop + (i * verticalStep) + randomJitter}%`;
        const size = `${120 + Math.random() * 80}px`;

        return (
          <div 
            key={`cloud-${i}`} 
            className="cloud-icon"
            style={{ 
              animationDuration: duration,
              animationDelay: delay,
              top: verticalPosition,
              fontSize: size,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          >
            ☁️
          </div>
        );
      });
    }

    // === FOG EFFECT - DAHA AZ OPACITY İLE ===
    if (isFoggy && !isSnowy) {
      fog = (
        <>
          <div className="fog-layer fog-1" />
          <div className="fog-layer fog-2" />
        </>
      );
    }
    
    return (
      <>
        {moon}
        {stars}
        {snow}
        {fog}
        {clouds}
        {sun}
        {winds}
        {leaves}
        {drops}
      </>
    );
  }, [weatherAnalysis, data]);

  // CSS sınıfları (aynı kaldı)
  const containerClasses = useMemo(() => {
    if (!weatherAnalysis) return "weather-bg-container"; 
    
    // Hava durumu koşullarını da Türkçe locale kullanarak normalleştiriyoruz
    const condition = weatherAnalysis.condition.toLocaleLowerCase('tr-TR');
    
    const { isWindy, isFoggy, isNight, isCloudy, isCold, isHot, isDaytime, isSnowy } = weatherAnalysis;
    
    const classes = [
      'weather-bg-container',
      condition.replace(/\s+/g, '-'),
      isWindy ? 'windy' : '',
      isFoggy ? 'foggy' : '',
      isNight ? 'night' : '',
      isCloudy ? 'cloudy' : '',
      isCold ? 'cold' : '',
      isHot ? 'hot' : '',
      isDaytime ? 'daytime' : '',
      isSnowy ? 'snowy' : '' 
    ];

    return classes.filter(Boolean).join(' ');
  }, [weatherAnalysis]);

  return (
    <div className={containerClasses}>
      <div className="background-overlay" />
      <div className="weather-background-vignette" />
      {renderAnimation}
      
      {/* Şehir Seçim Formu */}
      <div className="search-container-wrapper">
        <form onSubmit={handleSearch} className="city-search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="city-input"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchError("");
                setShowSuggestions(e.target.value.length > 1);
              }}
              placeholder="İl veya ilçe adı girin (örn: Seyhan, Adana)"
              disabled={loading}
              // onBlur'da küçük bir gecikme bırakarak tıklama olayının gerçekleşmesine izin verin
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
              onFocus={() => setShowSuggestions(searchInput.length > 1)}
            />
            
            <button 
              type="submit" 
              className="search-button"
              disabled={loading}
            >
              {weatherLoading ? 'Yükleniyor...' : 'Ara'}
            </button>
            
            <button
              type="button"
              className="location-button"
              onClick={handleLocateMe}
              disabled={geoLoading || weatherLoading}
              title="Mevcut konumunuzu kullanın"
            >
              {geoLoading ? '🧭' : '📍'} 
            </button>
          </div>

          {/* Hata mesajı */}
          {searchError && (
            <div className="search-error-message">
              {searchError}
            </div>
          )}

          {/* Öneri listesi */}
          {showSuggestions && filteredCities.length > 0 && (
            <div className="suggestions-dropdown">
              {filteredCities.map((city) => (
                <div
                  key={`${city.ilce_id}-${city.sehir_id}`}
                  className="suggestion-item"
                  // onMouseDown kullanmak, input'un onBlur olayından önce tıklamayı yakalar
                  onMouseDown={(e) => {
                    e.preventDefault(); // Input'un blur olmasını engelle
                    handleCitySelect(city);
                  }}
                >
                  <span className="district-name">{city.ilce_adi}</span>
                  <span className="city-name">{city.sehir_adi}</span>
                </div>
              ))}
            </div>
          )}
        </form>

        
        

        {/* Hava Durumu İçeriği */}
        <div className="weather-card-wrapper">
          {loading && <Loader />}
          {/* ======================================================= */}
          {/* İYİLEŞTİRİLMİŞ HATA YÖNETİMİ VE TEKRAR DENEME BUTONU */}
          {/* ======================================================= */}
          {error && (
            <div className="error-message">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h3 className="error-title">Hata Oluştu</h3>
                <p className="error-description">
                    {geoError || weatherError}
                </p>
                <button 
                  className="error-retry-btn"
                  onClick={() => {
                    if (geoError) {
                      retryGeolocation(); // Konum hatası varsa, konumu tekrar dene
                    } else if (weatherError && selectedCity) {
                      // Hava durumu hatası varsa, seçili şehri tekrar seçerek useLatestWeather'ı tetikle
                      setSelectedCity({...selectedCity}); 
                    }
                  }} 
                >
                  {geoError ? "Konumu Tekrar Dene" : "Hava Durumunu Tekrar Yükle"}
                </button>
              </div>
            </div>
          )}
          {data && weatherAnalysis && selectedCity && (
            <WeatherCard 
              {...data} 
              forecast={forecast} 
              isNight={weatherAnalysis.isNight}
            />     
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherContainer;