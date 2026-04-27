import "./content.css";
import { GRADES_PAGE_ID, initGradesPage } from "./pages/grades/content";
import {
  ACCOUNTING_PAGE_ID,
  initAccountingPage,
} from "./pages/accounting/content";

type PageInitializer = () => void;

declare global {
  interface Window {
    toggleNavDrawer?: () => void;
  }
}

const pageInitializersById: Record<string, PageInitializer> = {
  [GRADES_PAGE_ID]: initGradesPage,
  [ACCOUNTING_PAGE_ID]: initAccountingPage,
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

// Add page IDs here where the left drawer should be forced CLOSED on desktop.
// On all other desktop pages it is forced OPEN.
// On mobile/small-screen it is always forced CLOSED.
const forceClosedDesktopPageIds = new Set<string>([
  "1",
  "21111",
  "21311",
  "21374",
  "21411",
  "22313",
  "10053",
]);

const isNavDrawerOpen = (drawer: HTMLElement): boolean => {
  const hasFixedDrawerClass = drawer.classList.contains("mdl-layout--fixed-drawer");
  const drawerPanelVisible =
    drawer.querySelector(".mdl-layout__drawer")?.classList.contains("is-visible") ?? false;

  return hasFixedDrawerClass || drawerPanelVisible;
};

const setMenuHiddenCookie = (hidden: boolean): void => {
  const maxAgeSeconds = 10 * 24 * 60 * 60;
  document.cookie = `menuHidden=${hidden ? "1" : "0"}; path=/; max-age=${maxAgeSeconds}`;
};

const applyDrawerState = (drawer: HTMLElement, shouldOpen: boolean): void => {
  const isOpen = isNavDrawerOpen(drawer);
  const navDrawerContent = drawer.querySelector(".mdl-layout__drawer");

  if (typeof window.toggleNavDrawer === "function" && isOpen !== shouldOpen) {
    window.toggleNavDrawer();
  } else if (shouldOpen) {
    drawer.classList.add("mdl-layout--fixed-drawer");
  } else {
    drawer.classList.remove("mdl-layout--fixed-drawer");
    navDrawerContent?.classList.remove("is-visible");
    document.querySelector(".mdl-layout__obfuscator")?.classList.remove("is-visible");
  }

  setMenuHiddenCookie(!shouldOpen);
};

const enforceNavDrawerPolicy = (currentPageId: string | null): void => {
  const drawer = document.getElementById("nav-drawer");
  if (!drawer) {
    console.log(`[schulnetz-ext] nav-drawer not found for page ${currentPageId}`);
    return;
  }

  const isMobile = drawer.classList.contains("is-small-screen");
  const detectedOpen = isNavDrawerOpen(drawer);
  const shouldOpen = !isMobile && !(currentPageId && forceClosedDesktopPageIds.has(currentPageId));

  console.log(
    `[schulnetz-ext] nav-drawer detection on page ${currentPageId ?? "unknown"}: ${detectedOpen ? "open" : "closed"}, small-screen=${isMobile}`,
  );
  console.log(
    `[schulnetz-ext] nav-drawer target on page ${currentPageId ?? "unknown"}: ${shouldOpen ? "open" : "closed"} (${isMobile ? "mobile policy" : "desktop policy"})`,
  );

  applyDrawerState(drawer, shouldOpen);

  console.log(
    `[schulnetz-ext] nav-drawer applied on page ${currentPageId ?? "unknown"}: ${shouldOpen ? "open" : "closed"}, menuHidden=${shouldOpen ? "0" : "1"}`,
  );
};

let drawerPolicyRan = false;
const runCloseDrawerCheckOnce = (): void => {
  if (drawerPolicyRan) {
    return;
  }
  drawerPolicyRan = true;
  enforceNavDrawerPolicy(pageId);
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

if (document.readyState === "complete") {
  runCloseDrawerCheckOnce();
} else {
  window.addEventListener("load", runCloseDrawerCheckOnce, { once: true });
}

if (pageId) {
  pageInitializersById[pageId]?.();
}
