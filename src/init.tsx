import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App"; // Your main React component

export function initRoot(rootElement: Element) {
  if (!rootElement) {
    console.error("[Init] Root element not found");
    return;
  }

  // Create a new container for our React app
  const container = document.createElement("div");
  container.id = "grade-stats-root";

  // Insert the container before the existing grades div
  rootElement.insertAdjacentElement("beforebegin", container);

  const root = createRoot(container);
  root.render(<App />);
}
