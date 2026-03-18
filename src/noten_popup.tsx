import { useState } from "react";

export function NotenPopup() {
  const [message, setMessage] = useState<string>("");

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2000);
  };

  const getActiveTabId = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error("[Popup] No tab ID found");
      showMessage("Kein Tab gefunden");
      return null;
    }

    return tab.id;
  };

  const runAction = async (action: "downloadGrades" | "copyGrades") => {
    const tabId = await getActiveTabId();
    if (!tabId) return null;
    return chrome.tabs.sendMessage(tabId, { action });
  };

  const handleDownload = async () => {
    try {
      await runAction("downloadGrades");
      showMessage("Download gestartet!");
    } catch (error) {
      console.log("[Popup] Error in handleDownload:", error);
      showMessage("Fehler beim Download");
    }
  };

  const handleCopy = async () => {
    try {
      const response = await runAction("copyGrades");
      showMessage(
        response?.success
          ? "In Zwischenablage kopiert!"
          : "Kopieren fehlgeschlagen",
      );
    } catch (error) {
      console.log("[Popup] Error in handleCopy:", error);
      showMessage("Fehler beim Kopieren");
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <button
        onClick={handleDownload}
        className="flex items-center justify-center w-full gap-2 px-4 py-2.5 font-medium transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        <span>⬇️</span>
        Als JSON herunterladen
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center justify-center w-full gap-2 px-4 py-2.5 font-medium transition-colors bg-gray-700 rounded-lg hover:bg-gray-600"
      >
        <span>📋</span>
        In Zwischenablage kopieren
      </button>
      {/* Optional: render message here later if needed */}
    </div>
  );
}
