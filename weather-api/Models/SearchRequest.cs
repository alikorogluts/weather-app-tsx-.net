namespace SeleniumApi.Models
{
    // Controller'ın beklediği giriş modeli
    public class SearchRequest
    {
        public  string? City { get; set; }
        public string? State { get; set; } // Ilce için "State" yerine "Ilce" kullanılması daha tutarlı olurdu, ama mevcut kodunuzu koruyorum.
    }
}