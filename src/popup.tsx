import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

function Popup() {
  const [message, setMessage] = useState<string>("");

  const handleDownload = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return;

      await chrome.tabs.sendMessage(tab.id, { action: "downloadGrades" });
      setMessage("Download gestartet!");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage("Fehler beim Download");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const handleCopy = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "copyGrades",
      });

      if (response?.success) {
        setMessage("In Zwischenablage kopiert!");
      } else {
        setMessage("Kopieren fehlgeschlagen");
      }
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      setMessage("Fehler beim Kopieren");
      setTimeout(() => setMessage(""), 2000);
    }
  };
  return (
    <div className="p-4 text-white bg-gray-900 w-72">
      <div className="mb-4 text-center">
        <div className="mb-2 text-4xl">📊</div>
        <h1 className="text-lg font-bold">Schulnetz+</h1>
        <p className="text-sm text-gray-400">Noten exportieren</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-full gap-2 px-4 py-2 font-medium transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <span>⬇️</span>
          Als JSON herunterladen
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center justify-center w-full gap-2 px-4 py-2 font-medium transition-colors bg-gray-700 rounded-lg hover:bg-gray-600"
        >
          <span>📋</span>
          In Zwischenablage kopieren
        </button>
      </div>

      {message && (
        <div className="mt-3 text-sm text-center text-green-400 animate-pulse">
          {message}
        </div>
      )}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
