import React from "react";
// Home.css artık neredeyse boş kalmalı veya genel stilleri tutmalı
import "./Home.css"; 
// Yeni Konteyner bileşenini import edin
import WeatherContainer from "../companents/WeatherContainer/WeatherContainer"; 

const Home: React.FC = () => {
  
  // Home bileşeninde artık hiçbir useMemo, useLatestWeather, state veya animasyon kodu YOK.
  
  return (
    // Tüm kompleks yapıyı WeatherContainer'a devrettik
    <div className="home-page-layout">
      <WeatherContainer />
    </div>
  );
};

export default Home;