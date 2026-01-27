import { createRoot } from "react-dom/client";
import App from "./App"; // Your main React component
import "./content.css"; // Import Tailwind CSS

export function initRoot(rootElement: Element) {
  console.log("[Init] initRoot called with:", rootElement);

  if (!rootElement) {
    console.error("[Init] Root element not found");
    return;
  }

  try {
    // Create a new container for our React app
    const container = document.createElement("div");
    container.id = "grade-stats-root";
    console.log("[Init] Created container:", container);

    // Insert the container before the existing grades div
    rootElement.insertAdjacentElement("beforebegin", container);
    console.log("[Init] Container inserted into DOM");
    console.log("[Init] Container parent:", container.parentElement);

    const root = createRoot(container);
    console.log("[Init] React root created");

    root.render(<App />);
    console.log("[Init] App rendered successfully!");
  } catch (error) {
    console.error("[Init] Error during initialization:", error);
  }
}
