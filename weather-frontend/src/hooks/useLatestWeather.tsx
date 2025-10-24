// hooks/useLatestWeather.ts

import { useEffect, useState, useMemo } from "react"; // useMemo eklendi

// --- YARDIMCI FONKSİYON: Adresi İl ve İlçe olarak ayırır ---
const parseCityAndState = (fullAddress: string): { city: string, state: string } => {
    if (!fullAddress) return { city: "", state: "" };
    console.log("parse lanmaya gelen adres :" +fullAddress);
    // Temizleme ve boşluklara göre ayırma
    const parts = fullAddress.trim().toLowerCase().split(/[\s,]+/);
    
    let cityPart = "";
    let statePart = "";

    if (parts.length >= 2) {
        cityPart = parts[1]; 
        statePart = parts[0];
    } else if (parts.length === 1 && parts[0].length > 0) {
        cityPart = parts[0];
        statePart = "merkez";
    }

    // İlçe adı il adı ile aynıysa veya boşsa, ilçe "merkez" olmalıdır (MGM uyumluluğu).
    if (statePart === cityPart || statePart.length < 2) {
        statePart = "merkez";
    }

    // İl adının ilk harfi büyük, ilçe adının ilk harfi küçük kalır (API beklentisine uygun)
    if (cityPart.length > 0) {
        cityPart = cityPart.charAt(0).toUpperCase() + cityPart.slice(1);
    }
    if (statePart.length > 0) {
        statePart = statePart.charAt(0).toLowerCase() + statePart.slice(1);
    }
    
    return { city: cityPart, state: statePart };
};


// --- API UYUMLU ARAYÜZLER (Aynı kaldı) ---

export interface WeatherData {
  location: string;
  temp: number | null;
  condition: string;
  humidity: number | null;
  wind: number | null;
  pressure: number | null;
}

export interface ForecastDay {
  day: string; 
  condition: string;
  iconUrl: string; 
  minTemp: number;
  maxTemp: number;
}

const API_URL = 'http://localhost:5036/api/Automation/weather';


// --- KANCA (HOOK) ---

export const useLatestWeather = (fullAddress: string) => { 
  const [data, setData] = useState<{current: WeatherData | null, forecast: ForecastDay[]}>({current: null, forecast: []});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 💡 DEĞİŞİKLİK: İl ve İlçe değerlerini useMemo ile türetiyoruz
  const { city: cityToFetch, state: stateToFetch } = useMemo(() => {
    const addressToParse = fullAddress?.trim();
    return parseCityAndState(addressToParse);
  }, [fullAddress]); // Sadece fullAddress değiştiğinde yeniden hesapla

  
  useEffect(() => {
    // İl veya İlçe bilgisi eksikse veya geçersizse API çağrısını yapma
    if (!cityToFetch || cityToFetch.length < 2 || !stateToFetch || stateToFetch.length < 2) {
      // Eğer varsayılan değerler ('İstanbul', 'merkez') bile yoksa, yüklemeyi durdur.
      if (cityToFetch === "" && stateToFetch === "") {
        setData({current: null, forecast: []});
        setLoading(false);
        return;
      }
    }
      
    setLoading(true);
    setError(null);
    setData({current: null, forecast: []});

    const fetchData = async () => {
        try {
            console.log(`[API İsteği] Gönderilen İl: ${cityToFetch}, İlçe: ${stateToFetch}`);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    city: cityToFetch, 
                    state: stateToFetch 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP Hata: ${response.status} - ${response.statusText}`);
            }

            const apiData = await response.json();
            
            setData({
                current: {
                    location: apiData.location,
                    
                    temp: apiData.temp,
                    
                    condition: apiData.condition,
                    humidity: apiData.humidity,
                    wind: apiData.wind,
                    pressure: apiData.pressure,
                },
                
                forecast: apiData.forecast || [] 
            });

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Bilinmeyen bir hata oluştu.";
            setError(`'${cityToFetch}/${stateToFetch}' için veri alınamadı. Detay: ${errorMessage}`); 
        } finally {
            setLoading(false);
        }
    };

    fetchData();
    
    // BAĞIMLILIK: useMemo'dan gelen değerler değiştiğinde çalışır
  }, [cityToFetch, stateToFetch]); // Sadece türetilen İl ve İlçe değerleri bağımlılık olarak kullanıldı
console.log("🌤️ Hava Durumu Verisi:", {
  current: data.current,
  forecast: data.forecast,
  loading,
  error
});  return { data: data.current, forecast: data.forecast, loading, error };
};