import "./index.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

const baseUrl = import.meta.env.BASE_URL ?? "/";
const menuBgUrl = `${baseUrl}assets/main_bg.png`;
const routerBasename = baseUrl.replace(/\/$/, "") || "/";

createRoot(document.getElementById("pixi-container")!).render(
  <>
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        backgroundImage: `url(${menuBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </>,
);
