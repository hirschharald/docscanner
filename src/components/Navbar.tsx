import React from "react";
import { NavLink } from "react-router-dom";
import type { Theme } from "@/types";

interface NavbarProps {
  theme: Theme;
  onToggleTheme: () => void;
  backendAvailable: boolean;
  dbAvailable: boolean;
  statusLoading: boolean;
}

export const Navbar = React.memo<NavbarProps>(
  ({
    theme,
    onToggleTheme,
    backendAvailable,
    dbAvailable,
    statusLoading,
  }) => (
    <nav className="navbar navbar-expand-md bg-primary navbar-dark shadow-sm">
      <div className="container">
        <NavLink className="navbar-brand fw-bold" to="/">
          📄 DocScanner
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMenu"
          aria-controls="navMenu"
          aria-expanded="false"
          aria-label="Navigation umschalten"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navMenu">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>
                Übersicht
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/scan">
                Erfassen
              </NavLink>
            </li>
       
          </ul>
          <button
            className="btn btn-outline-light btn-sm"
            onClick={onToggleTheme}
            aria-label="Theme wechseln"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
        <div className="d-flex align-items-center gap-2 me-3">
          <span className="small text-light">Backend</span>
          <span
            className={`status-dot ${
              statusLoading
                ? "status-dot--unknown"
                : backendAvailable
                  ? "status-dot--ok"
                  : "status-dot--err"
            }`}
            title={
              backendAvailable
                ? "Backend erreichbar"
                : "Backend nicht erreichbar"
            }
            aria-label={
              backendAvailable
                ? "Backend erreichbar"
                : "Backend nicht erreichbar"
            }
          />
          <span className="small text-light ms-2">DB</span>
          <span
            className={`status-dot ${
              statusLoading
                ? "status-dot--unknown"
                : dbAvailable
                  ? "status-dot--ok"
                  : "status-dot--err"
            }`}
            title={
              dbAvailable
                ? "Datenbank erreichbar"
                : "Datenbank nicht erreichbar"
            }
            aria-label={
              dbAvailable
                ? "Datenbank erreichbar"
                : "Datenbank nicht erreichbar"
            }
          />
        </div>
      </div>
    </nav>
  ),
);

Navbar.displayName = "Navbar";
