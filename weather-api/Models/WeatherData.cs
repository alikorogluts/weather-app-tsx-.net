namespace SeleniumApi.Models
{
    using System.Collections.Generic;

    // 5 Günlük Tahmin Modeli
    public class ForecastDay
    {
        public string Day { get; set; } = ""; // Örn: Pts, Sal
        public string Condition { get; set; } = ""; // Hadise (Örn: Parçalı Bulutlu)
        public string IconUrl { get; set; } = ""; // İkonun URL'si
        public double? MinTemp { get; set; } // Double? kullanıldı (Sayfa boşsa null olabilir)
        public double? MaxTemp { get; set; } // Double? kullanıldı
    }

    // Anlık ve Kapsamlı Hava Durumu Veri Modeli
    public class WeatherData
    {
        public string Location { get; set; } = "";
        public double? Temp { get; set; } // Anlık Sıcaklık
        public string Condition { get; set; } = "";
        public double? Humidity { get; set; } // Nem (%)
        public double? Wind { get; set; } // Rüzgar (km/sa)
        public double? Pressure { get; set; } // Basınç (hPa)
        
        // Front-end'in beklediği tahmin listesi
        public List<ForecastDay> Forecast { get; set; } = new List<ForecastDay>();
    }
}