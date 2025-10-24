using Microsoft.AspNetCore.Mvc;
using SeleniumApi.Models;
using SeleniumApi.Services;
using System;
using System.Threading.Tasks;

namespace SeleniumApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AutomationController : ControllerBase
    {
        private readonly IAutomationService _automationService;

        public AutomationController(IAutomationService automationService)
        {
            _automationService = automationService;
        }

        /// <summary>
        /// API'den gelen il ve ilçe bilgisini alıp Selenium ile MGM'den hava durumu çeker.
        /// </summary>
        /// <param name="request">İl ve İlçe (State) bilgilerini içeren model.</param>
        /// <returns>Kapsamlı Hava Durumu (WeatherData) nesnesini döndürür.</returns>
        [HttpPost("weather")] // Endpoint ismini daha uygun hale getirdim
        public async Task<IActionResult> GetWeather([FromBody] SearchRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.City) || string.IsNullOrEmpty(request.State))
            {
                return BadRequest("Lütfen 'City' (İl) ve 'State' (İlçe) alanlarını doldurun.");
            }

            try
            {
                // Servis artık string yerine WeatherData nesnesi döndürüyor.
                var result = await _automationService.GetWeatherForecast(request.City, request.State);
                
                // ASP.NET Core, bu nesneyi otomatik olarak JSON'a dönüştürür (HTTP 200 OK).
                return Ok(result); 
            }
            catch (ArgumentException ex)
            {
                // İl/İlçe boş gelirse
                return BadRequest(ex.Message); 
            }
            catch (TimeoutException ex)
            {
                // Selenium zaman aşımı
                return StatusCode(504, ex.Message); // HTTP 504 Gateway Timeout
            }
            catch (InvalidOperationException ex)
            {
                 // İl/İlçe bulunamazsa (NoSuchElementException'dan geliyor)
                return NotFound(ex.Message); // HTTP 404 Not Found
            }
            catch (Exception ex)
            {
                // Diğer tüm hatalar
                return StatusCode(500, $"Sunucu Hatası: {ex.Message}"); // HTTP 500 Internal Server Error
            }
        }
    }
}