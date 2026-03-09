import "./content.css";
import { GRADES_PAGE_ID, initGradesPage } from "./pages/grades";

type PageInitializer = () => void;

const pageInitializersById: Record<string, PageInitializer> = {
  [GRADES_PAGE_ID]: initGradesPage,
};

// ─── URL rewriting ──────────────────────────────────────────────────

const url = window.location.href;
const searchParams = new URL(url).searchParams;
const pageId = searchParams.get("pageid");

const replaceUrls: Record<string, string> = {
  "21200": "22202",
  "24030": "10003",
  "22300": "22313",
  "21355": "21374",
  "23118": "23102",
};

for (const [oldId, newId] of Object.entries(replaceUrls)) {
  const calButton = document.getElementById(`menu${oldId}`);
  const calButtonHref = calButton?.getAttribute("href");
  if (!calButton || !calButtonHref) continue;

  if (pageId === newId) {
    const updatedHref = calButtonHref.includes(`pageid=${newId}`)
      ? calButtonHref.replace(`pageid=${newId}`, `pageid=${oldId}`)
      : calButtonHref.replace(newId, oldId);
    calButton.setAttribute("href", updatedHref);
  } else {
    const updatedHref = calButtonHref.includes(`pageid=${oldId}`)
      ? calButtonHref.replace(`pageid=${oldId}`, `pageid=${newId}`)
      : calButtonHref.replace(oldId, newId);
    calButton.setAttribute("href", updatedHref);
  }
}

if (pageId) {
  pageInitializersById[pageId]?.();
}
