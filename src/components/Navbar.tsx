import React from "react";
import { NavLink } from "react-router-dom";
import type { Theme } from "@/types";

interface NavbarProps {
  theme: Theme;
  onToggleTheme: () => void;
  onToArchive?: () => void;
}

export const Navbar = React.memo<NavbarProps>(({ theme, onToggleTheme, onToArchive }) => (

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
              Scannen
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/upload">
              Hochladen
            </NavLink>
          </li>
          <li className="nav-item">
            <button
              // className="btn btn-outline-light btn-sm"
              className="nav-link"
              onClick={onToArchive}
              aria-label="Speichern"
            >
              Speichern
            </button>
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
    </div>
  </nav>
));

Navbar.displayName = "Navbar";
