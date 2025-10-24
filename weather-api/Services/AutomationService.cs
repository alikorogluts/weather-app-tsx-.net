using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using SeleniumApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.IO;

namespace SeleniumApi.Services
{
    public class AutomationService : IAutomationService
    {
        private const int TimeoutSeconds = 15;

        public async Task<WeatherData> GetWeatherForecast(string city, string state)
        {
            return await Task.Run(() =>
            {
                if (string.IsNullOrEmpty(city) || string.IsNullOrEmpty(state))
                    throw new ArgumentException("Hata: İl ve İlçe bilgileri boş olamaz.");

                // Metin düzenleme: Küçük harf yap, boşlukları sil ve Türkçe karakterleri normalleştir (örneğin: "ş" -> "s", "i" -> "i", "ğ" -> "g" vb.)
                string NormalizeCityName(string text)
                {
                    text = text.ToLower().Trim();
                    text = text.Replace("ş", "s").Replace("ç", "c").Replace("ğ", "g").Replace("ü", "u").Replace("ö", "o").Replace("ı", "i");
                    text = Regex.Replace(text, @"[^a-z0-9\s-]", ""); // Geçersiz karakterleri kaldır
                    return text;
                }

                string cleanedCity = NormalizeCityName(city);
                string cleanedState = NormalizeCityName(state);

                // MGM'nin URL formatı: www.mgm.gov.tr/tahmin/il-ve-ilceler.aspx?il=trabzon&ilce=merkez
                string url = cleanedState == "merkez"
                    ? $"https://www.mgm.gov.tr/tahmin/il-ve-ilceler.aspx?il={cleanedCity}"
                    : $"https://www.mgm.gov.tr/tahmin/il-ve-ilceler.aspx?il={cleanedCity}&ilce={cleanedState}";

                var options = new ChromeOptions();
                options.AddArgument("--headless");
                options.AddArgument("--disable-gpu");
                options.AddArgument("--no-sandbox");
                options.AddArgument("--window-size=1920,1080");
                options.AddArgument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36");

                using (var driver = new ChromeDriver(options))
                {
                    try
                    {
                        // Console.WriteLine($"[INFO] Navigating to URL: {url}"); // Hızlandırma için kaldırıldı
                        driver.Navigate().GoToUrl(url);
                        var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(TimeoutSeconds));
                        wait.Until(d => ((IJavaScriptExecutor)d).ExecuteScript("return document.readyState").Equals("complete"));
                        // Console.WriteLine("[INFO] Page loaded successfully."); // Hızlandırma için kaldırıldı

                        var weatherData = new WeatherData
                        {
                            Location = $"{city}/{state}",
                            Forecast = new List<ForecastDay>()
                        };

                        // --- ANLIK VERİ (SICAKLIK - DÜZELTME YAPILDI) ---
                        // Sıcaklık: Orijinal, çalışan XPath selector'a geri dönüldü.
                        try
                        {
                            var sicaklikElement = wait.Until(ExpectedConditions.ElementIsVisible(By.XPath("//*[contains(@ng-bind, 'sondurum[0].sicaklik | comma')]")));
                            if (double.TryParse(sicaklikElement.Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double tempValue))
                            {
                                weatherData.Temp = tempValue;
                                // Console.WriteLine($"[INFO] Temperature: {weatherData.Temp}°C"); // Hızlandırma için kaldırıldı
                            }
                        }
                        catch (Exception ex)
                        {
                            // Console.WriteLine($"[ERROR] Temperature element not found: {ex.Message}"); // Hızlandırma için kaldırıldı
                        }

                        // Mevcut durum (Hadise)
                        try
                        {
                            // Tekrar kontrol için CSS selector yerine daha kesin olan XPath kullanıldı.
                            var hadiseElement = wait.Until(ExpectedConditions.ElementIsVisible(By.XPath("//*[contains(@ng-bind, 'sondurum[0].hadiseAdi')]")));
                            weatherData.Condition = hadiseElement.Text.Trim();
                            // Console.WriteLine($"[INFO] Condition: {weatherData.Condition}"); // Hızlandırma için kaldırıldı
                        }
                        catch (Exception ex)
                        {
                            // Console.WriteLine($"[ERROR] Condition element not found: {ex.Message}"); // Hızlandırma için kaldırıldı
                        }


                        // --- EK BİLGİLER (NEM, RÜZGAR, BASINÇ) ---
                        try
                        {
                            // NEM
                            var nemElement = wait.Until(ExpectedConditions.ElementIsVisible(By.CssSelector("div.anlik-nem div.anlik-nem-deger-kac[ng-bind*='nem']")));
                            if (double.TryParse(nemElement.Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double humidityValue))
                            {
                                weatherData.Humidity = humidityValue;
                            }

                            // RÜZGAR
                            var ruzgarElement = wait.Until(ExpectedConditions.ElementIsVisible(By.CssSelector("div.anlik-ruzgar div.anlik-ruzgar-deger-kac[ng-bind*='ruzgarHiz']")));
                            if (double.TryParse(ruzgarElement.Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double windValue))
                            {
                                weatherData.Wind = windValue;
                            }

                            // BASINÇ (Denize İndirgenmiş Basınç)
                            var basincElement = wait.Until(ExpectedConditions.ElementIsVisible(By.CssSelector("div.anlik-dibasinc div.anlik-dibasinc-deger-kac[ng-bind*='denizeIndirgenmisBasinc']")));
                            if (double.TryParse(basincElement.Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double pressureValue))
                            {
                                weatherData.Pressure = pressureValue;
                            }
                        }
                        catch (Exception)
                        {
                            // Console.WriteLine($"[ERROR] Nem/Rüzgar/Basınç verileri çekilemedi: {ex.Message}"); // Hızlandırma için kaldırıldı
                        }


                        // --- 5 GÜNLÜK TAHMİN ---
                        try
                        {
                            var forecastTableBody = wait.Until(ExpectedConditions.ElementIsVisible(By.CssSelector("div#_4_5gunluk table tbody")));
                            var forecastElements = forecastTableBody.FindElements(By.TagName("tr"));
                            
                            foreach (var tr in forecastElements.Take(5))
                            {
                                var tdElements = tr.FindElements(By.TagName("td"));
                                
                                if (tdElements.Count >= 4)
                                {
                                    var forecast = new ForecastDay
                                    {
                                        Day = tdElements[0].Text.Trim()
                                    };

                                    var hadiseCell = tdElements[1];
                                    var hadiseImg = hadiseCell.FindElements(By.TagName("img")).FirstOrDefault();
                                    
                                    if (hadiseImg != null)
                                    {
                                        forecast.Condition = hadiseImg.GetAttribute("title")?.Trim() ?? hadiseCell.Text.Trim();
                                        // Tam URL'yi almak için gerekirse ".." kısmını düzeltin (varsayım: temel URL'den bağımsız çalışmazsa)
                                        string iconSrc = hadiseImg.GetAttribute("src")?.Trim() ?? "";
                                        // MGM'nin yapısında göreceli yollar kullanılıyorsa tam path oluşturulur.
                                        forecast.IconUrl = iconSrc.StartsWith("../") 
                                            ? "https://www.mgm.gov.tr" + iconSrc.Replace("..", "") 
                                            : iconSrc;
                                    }
                                    else
                                    {
                                        forecast.Condition = hadiseCell.Text.Trim();
                                        forecast.IconUrl = "";
                                    }

                                    if (double.TryParse(tdElements[2].Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double minTemp))
                                        forecast.MinTemp = minTemp;

                                    if (double.TryParse(tdElements[3].Text.Trim().Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out double maxTemp))
                                        forecast.MaxTemp = maxTemp;

                                    weatherData.Forecast.Add(forecast);
                                }
                            }
                        }
                        catch (Exception)
                        {
                            // Console.WriteLine($"[ERROR] Forecast elements could not be processed: {ex.Message}"); // Hızlandırma için kaldırıldı
                        }

                        return weatherData;
                    }
                    catch (WebDriverTimeoutException)
                    {
                        throw new TimeoutException($"Hata: Sayfa yüklenemedi veya elementler bulunamadı. URL: {url}");
                    }
                    catch (NoSuchElementException ex)
                    {
                        throw new InvalidOperationException($"Hata: Hava durumu elementleri bulunamadı. Detay: {ex.Message}. URL: {url}");
                    }
                    catch (Exception ex)
                    {
                        throw new Exception($"Genel Hata: {ex.Message}");
                    }
                }
            });
        }
    }
}