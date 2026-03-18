import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EXTRACTOR_VERSION } from "./version";
import "./popup.css";
import { NotenPopup } from "./noten_popup";

type PageStatus = "loading" | "valid" | "invalid";

function Popup() {
  const [message, setMessage] = useState<string>("");
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [enhanced, setEnhanced] = useState(false);

  const getActiveTabId = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error("[Popup] No tab ID found");
      return null;
    }

    return tab.id;
  };

  const checkCurrentPage = async () => {
    try {
      const tabId = await getActiveTabId();
      if (!tabId) {
        setPageStatus("invalid");
        return;
      }

      const response = await chrome.tabs.sendMessage(tabId, {
        action: "checkPage",
      });

      setPageStatus(response?.exists ? "valid" : "invalid");
    } catch (error) {
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

  const handleToggleEnhanced = async () => {
    try {
      const tabId = await getActiveTabId();
      const newState = !enhanced;

      // Save to Chrome storage
      await chrome.storage.local
        .set({ enhancedMode: newState })
        .catch((error) => {
          console.error("[Popup] Error saving to storage:", error);
        });
      setEnhanced(newState);

      // Also notify content script if tab is available
      if (tabId) {
        try {
          await chrome.tabs.sendMessage(tabId, {
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

      {pageStatus === "valid" ? (
        <div className="mb-3">
          <NotenPopup />
        </div>
      ) : (
        <div className="p-3 mb-4 text-sm text-center text-yellow-300 bg-gray-800 rounded-lg">
          Öffne die Notenansicht, um Exportfunktionen zu nutzen.
        </div>
      )}

      <div className="space-y-2">
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
