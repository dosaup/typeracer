import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ServicesProvider } from "./services/context";
import { createLocalServices } from "./services/local";
import "./styles.css";
import "./practice-layout.css";

// Composition root: swap this adapter for an HTTP implementation to add a backend.
const services = createLocalServices();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>
  </React.StrictMode>,
);
