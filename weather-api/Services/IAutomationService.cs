using SeleniumApi.Models; // Yeni modeli kullan

namespace SeleniumApi.Services
{
    public interface IAutomationService
    {
        // Artık WeatherData nesnesi döndürecek.
        Task<WeatherData> GetWeatherForecast(string city, string state);
    }
}