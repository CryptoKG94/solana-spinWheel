import React from "react";
import "./Loader.css";
function Loader() {
  return (
    <div className="loader">
      <div className="spinner-border" role="status">
        <span className="visually-hidden"></span>
      </div>
      <br />
    </div>
  );
}

export default Loader;
