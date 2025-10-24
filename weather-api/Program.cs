using SeleniumApi.Services;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// --- YENİ EKLENEN KISIM: CORS Servisini Tanımlama ---
// React uygulamanızın localhost adresine izin veren bir politika tanımlıyoruz.
const string MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          // 🛑 React uygulamanızın adresini buraya ekleyin
                          policy.WithOrigins("https://localhost:5173", "http://localhost:5173") 
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

// Servis kaydı
builder.Services.AddScoped<IAutomationService, AutomationService>();

// Swagger + Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger yapılandırması
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Weather API",
        Version = "v1",
        Description = "MGM verilerini otomatik olarak çeken Selenium tabanlı Weather API"
    });
});

var app = builder.Build();

// Pipeline sırası önemli
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage(); // hata ayıklama kolaylığı
    app.UseSwagger(); // Swagger JSON'u oluşturur
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weather API v1");
        c.RoutePrefix = string.Empty; // Swagger ana sayfa olur
    });
}

app.UseHttpsRedirection();

// --- YENİ EKLENEN KISIM: CORS Politikasını Uygulama ---
// UseCors, UseRouting ve UseAuthorization arasında yer almalıdır.
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();
app.MapControllers();

app.Run();