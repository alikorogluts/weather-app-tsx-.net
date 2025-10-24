import React from "react";
import "../Loader/Loader.css";

const Loader: React.FC = () => (
  <div className="loader">
    <div className="spinner"></div>
    <div>Yükleniyor...</div>
  </div>
);

export default Loader;