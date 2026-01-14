import { createRoot } from "react-dom/client";
import "./popup.css";

const tips: string[] = [
  "Nutze den Kalender-Filter, um nur Prüfungen zu sehen.",
  "Halte Mitteilungen als gelesen, um schneller den Überblick zu behalten.",
  "Fixiere wichtige Links als Lesezeichen in der Seitenleiste.",
];

const openLink = (href: string) => {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url: href });
    return;
  }

  window.open(href, "_blank");
};

const Popup = () => {
  return (
    <div className="min-h-screen p-6 space-y-6 text-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-widest uppercase text-slate-500">
            Schulnetz+
          </p>
          <h1 className="text-2xl font-bold text-transparent bg-linear-to-r from-primary to-secondary bg-clip-text">
            Schneller Überblick
          </h1>
        </div>
        <div className="grid text-base font-bold text-white shadow-xl w-14 h-14 place-items-center rounded-2xl bg-linear-to-br from-primary to-secondary shadow-primary/30">
          SN+
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-400">
          Schnellzugriffe
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => openLink("https://schulnetz.example.com/dashboard")}
            className="p-4 text-left transition-all duration-200 glass-panel hover:bg-white/10 group"
          >
            <p className="font-semibold transition-colors text-slate-100 group-hover:text-primary">
              📊 Dashboard
            </p>
            <p className="text-xs text-slate-300">Deine Startseite</p>
          </button>
          <button
            onClick={() => openLink("https://schulnetz.example.com/messages")}
            className="p-4 text-left transition-all duration-200 glass-panel hover:bg-white/10 group"
          >
            <p className="font-semibold transition-colors text-slate-100 group-hover:text-primary">
              💬 Mitteilungen
            </p>
            <p className="text-xs text-slate-300">Deine Nachrichten</p>
          </button>
          <button
            onClick={() => openLink("https://schulnetz.example.com/calendar")}
            className="col-span-2 p-4 text-left transition-all duration-200 glass-panel hover:bg-white/10 group sm:col-span-1"
          >
            <p className="font-semibold transition-colors text-slate-100 group-hover:text-primary">
              📅 Kalender
            </p>
            <p className="text-xs text-slate-300">Termine & Prüfungen</p>
          </button>
        </div>
      </div>

      {/* Tips Section */}
      <div className="pt-6 space-y-3 border-t border-white/10">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-400">
          💡 Tipps
        </h2>
        <div className="space-y-2">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="flex gap-2 text-xs transition-colors cursor-default text-slate-300 pill hover:bg-white/12"
            >
              <span className="shrink-0 mt-0.5">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(<Popup />);
}
