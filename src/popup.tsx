import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

type PageStatus = "loading" | "valid" | "invalid";

function Popup() {
  const [message, setMessage] = useState<string>("");
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");

  const checkCurrentPage = async () => {
    console.log("[Popup] checkCurrentPage called");
    try {
      console.log("[Popup] Querying active tab...");
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("[Popup] Active tab:", tab);

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setMessage("Kein Tab gefunden");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      // Check if the grades div exists on the page
      const response = await chrome.tabs.sendMessage(tab.id!, {
        action: "checkPage",
      });

      if (response?.exists) {
        setPageStatus("valid");
      } else {
        setPageStatus("invalid");
      }
    } catch (error) {
      console.error("[Popup] Error in checkCurrentPage:", error);
      setPageStatus("invalid");
    }
  };

  useEffect(() => {
    checkCurrentPage();
  }, []);

  const handleDownload = async () => {
    console.log("[Popup] Download button clicked");
    try {
      console.log("[Popup] Querying active tab...");
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("[Popup] Active tab:", tab);

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setMessage("Kein Tab gefunden");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      console.log("[Popup] Sending downloadGrades message to tab", tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "downloadGrades",
      });
      console.log("[Popup] Response from content script:", response);
      setMessage("Download gestartet!");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      console.error("[Popup] Error in handleDownload:", error);
      setMessage(
        "Fehler beim Download: " +
          (error instanceof Error ? error.message : String(error))
      );
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const handleCopy = async () => {
    console.log("[Popup] Copy button clicked");
    try {
      console.log("[Popup] Querying active tab...");
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("[Popup] Active tab:", tab);

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setMessage("Kein Tab gefunden");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      console.log("[Popup] Sending copyGrades message to tab", tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "copyGrades",
      });

      console.log("[Popup] Response from content script:", response);

      if (response?.success) {
        setMessage("In Zwischenablage kopiert!");
      } else {
        setMessage("Kopieren fehlgeschlagen");
      }
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      console.error("[Popup] Error in handleCopy:", error);
      setMessage(
        "Fehler beim Kopieren: " +
          (error instanceof Error ? error.message : String(error))
      );
      setTimeout(() => setMessage(""), 2000);
    }
  };

  if (pageStatus === "loading") {
    return (
      <div className="p-4 text-white bg-gray-900 w-72">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <span className="ml-2">Laden...</span>
        </div>
      </div>
    );
  }

  if (pageStatus === "invalid") {
    return (
      <div className="p-4 text-white bg-gray-900 w-72">
        <div className="text-center">
          <div className="mb-2 text-4xl">📚</div>
          <h1 className="mb-2 text-lg font-bold">Schulnetz+</h1>
          <p className="text-sm text-gray-400">
            Bitte öffne die Notenseite auf Schulnetz, um diese Funktion zu
            nutzen.
          </p>
        </div>
      </div>
    );
  }

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
