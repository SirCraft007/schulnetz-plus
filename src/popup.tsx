import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EXTRACTOR_VERSION } from "./version";
import "./popup.css";

type PageStatus = "loading" | "valid" | "invalid";

function Popup() {
  const [message, setMessage] = useState<string>("");
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [enhanced, setEnhanced] = useState(false);

  const checkCurrentPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setPageStatus("invalid");
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
      // Content script not loaded on this page - this is expected for non-schulnetz pages
      console.log("[Popup] Content script not available on this page");
      setPageStatus("invalid");
    }
  };

  useEffect(() => {
    checkCurrentPage();
  }, []);

  // Sync enhanced state from storage on popup open
  useEffect(() => {
    (async () => {
      try {
        // Load from Chrome storage
        const result = await chrome.storage.local.get("enhancedMode");
        if (result.enhancedMode !== undefined) {
          setEnhanced(!!result.enhancedMode);
        }
      } catch {
        /* ignore - storage not available */
      }
    })();
  }, []);

  const handleDownload = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setMessage("Kein Tab gefunden");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "downloadGrades",
      });
      setMessage("Download gestartet!");
      setTimeout(() => setMessage(""), 2000);
    } catch (error) {
      console.log("[Popup] Error in handleDownload:", error);
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

      if (!tab?.id) {
        console.error("[Popup] No tab ID found");
        setMessage("Kein Tab gefunden");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

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
      console.log("[Popup] Error in handleCopy:", error);
      setMessage("Fehler beim Kopieren");
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

  const handleToggleEnhanced = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const newState = !enhanced;

      // Save to Chrome storage
      await chrome.storage.local
        .set({ enhancedMode: newState })
        .catch((error) => {
          console.error("[Popup] Error saving to storage:", error);
        });
      setEnhanced(newState);

      // Also notify content script if tab is available
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: "toggleEnhanced",
            enabled: newState,
          });
        } catch (error) {
          console.error(
            "[Popup] Error sending message to content script:",
            error,
          );
        }
      }
    } catch (error) {
      console.error("[Popup] Error in handleToggleEnhanced:", error);
      setMessage("Fehler");
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

        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <span className="text-sm font-medium">✨ Schönere Ansicht</span>
          <button
            onClick={handleToggleEnhanced}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enhanced ? "bg-indigo-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enhanced ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {message && (
        <div className="mt-3 text-sm text-center text-green-400 animate-pulse">
          {message}
        </div>
      )}

      <div className="mt-4 text-xs text-center text-gray-500">
        Version {EXTRACTOR_VERSION}
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
