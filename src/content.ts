import "./content.css";

console.log("[Content] ========== SCHULNETZ+ EXTENSION LOADED ==========");
console.log("[Content] Script version: 3.1 (inline stats)");

// ─── Types ──────────────────────────────────────────────────────────

interface Assessment {
  date: string;
  topic: string;
  grade: number | null;
  weight: number;
}

interface Course {
  code: string;
  name: string;
  average: number | null;
  assessments: Assessment[];
}

interface GradeData {
  student: string;
  extractedAt: string;
  courses: Course[];
}

// ─── Grade extraction ───────────────────────────────────────────────

function extractGrades(): GradeData | null {
  const gradesDiv = document.querySelector(".div_noten");
  if (!gradesDiv) return null;

  const data: GradeData = {
    student: "",
    extractedAt: new Date().toISOString(),
    courses: [],
  };

  const header = gradesDiv.querySelector("h3");
  if (header) {
    data.student =
      header.textContent?.replace("Aktuelle Noten - ", "").trim() ?? "";
  }

  const table = gradesDiv.querySelector("table.mdl-data-table");
  if (!table) return data;

  const rows = Array.from(table.querySelectorAll("tbody > tr")).filter(
    (row) =>
      !row.className.includes("detailrow") &&
      !row.id.includes("verlauf") &&
      row.querySelector("td b"),
  );

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    const courseInfo = cells[0].querySelector("b")?.textContent?.trim() ?? "";
    const courseName =
      cells[0].querySelector("br")?.nextSibling?.textContent?.trim() ?? "";
    const averageText = cells[1].textContent?.trim() ?? "";

    const course: Course = {
      code: courseInfo,
      name: courseName,
      average: averageText === "--" ? null : parseFloat(averageText) || null,
      assessments: [],
    };

    const detailButton = cells[2]?.querySelector(
      "button[onclick*='toggle_notendetails']",
    );
    const onclickAttr = detailButton?.getAttribute("onclick");
    const indexMatch = onclickAttr?.match(/toggle_notendetails\(0,\s*(\d+)\)/);
    const actualIndex = indexMatch ? indexMatch[1] : null;

    const detailRow = actualIndex
      ? table.querySelector(`tr[class*="0_${actualIndex}_detailrow"]`)
      : null;

    if (detailRow) {
      const detailTable = detailRow.querySelector("table.clean");
      if (detailTable) {
        const assessmentRows = Array.from(
          detailTable.querySelectorAll("tr"),
        ).filter((tr) => {
          const c = tr.querySelectorAll("td");
          if (c.length < 5) return false;
          if (tr.className.includes("pruefungsgruppe")) return false;
          return c[1]?.textContent?.trim().match(/\d{2}\.\d{2}\.\d{4}/);
        });

        assessmentRows.forEach((aRow) => {
          const aCells = aRow.querySelectorAll("td");
          if (aCells.length >= 5) {
            const gradeText = aCells[3].textContent?.trim() ?? "";
            course.assessments.push({
              date: aCells[1].textContent?.trim() ?? "",
              topic: aCells[2].textContent?.trim() ?? "",
              grade: gradeText === "" ? null : parseFloat(gradeText),
              weight: parseFloat(aCells[4].textContent?.trim() ?? "0"),
            });
          }
        });
      }
    }

    data.courses.push(course);
  });

  return data;
}

// ─── Plus-point calculation ─────────────────────────────────────────

function calculatePlusPoints(courses: Course[]): number {
  let pp = 0;
  for (const c of courses) {
    if (c.average === null) continue;
    if (c.average >= 4) {
      pp += Math.floor((c.average - 4) / 0.5) * 0.5;
    } else {
      pp -= 1;
    }
  }
  return pp;
}

// ─── Helpers ────────────────────────────────────────────────────────

function gradeColor(grade: number | null): string {
  if (grade === null) return "#9ca3af";
  if (grade >= 5.5) return "#16a34a";
  if (grade >= 4.5) return "#22c55e";
  if (grade >= 4) return "#eab308";
  return "#ef4444";
}

// ─── Download / Copy ────────────────────────────────────────────────

function downloadGradesJSON() {
  const data = extractGrades();
  if (!data) {
    console.error("[Content] No data extracted");
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grades_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyGradesToClipboard(): Promise<boolean> {
  const data = extractGrades();
  if (!data) return false;
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

// ─── Build summary bar above the table ────────────────────────────

function buildSummaryBar(gradeData: GradeData): HTMLElement {
  const pp = calculatePlusPoints(gradeData.courses);
  const above4 = gradeData.courses.filter(
    (c) => c.average !== null && c.average >= 4,
  ).length;
  const below4 = gradeData.courses.filter(
    (c) => c.average !== null && c.average < 4,
  ).length;
  const allAvgs = gradeData.courses
    .map((c) => c.average)
    .filter((a): a is number => a !== null);
  const totalAvg =
    allAvgs.length > 0
      ? (allAvgs.reduce((s, v) => s + v, 0) / allAvgs.length).toFixed(2)
      : "--";

  const div = document.createElement("div");
  div.className = "snplus-summary-bar";
  div.innerHTML = `
    <div class="snplus-stat">
      <span class="snplus-stat-label">Durchschnitt</span>
      <span class="snplus-stat-value" data-grade="${totalAvg}">${totalAvg}</span>
    </div>
    <div class="snplus-stat">
      <span class="snplus-stat-label">Plus-Punkte</span>
      <span class="snplus-stat-value">${pp >= 0 ? "+" : ""}${pp.toFixed(1)}</span>
    </div>
    <div class="snplus-stat">
      <span class="snplus-stat-label">Über 4.0</span>
      <span class="snplus-stat-value">${above4}</span>
    </div>
    <div class="snplus-stat">
      <span class="snplus-stat-label">Unter 4.0</span>
      <span class="snplus-stat-value">${below4}</span>
    </div>
  `;
  return div;
}

// ─── Enhanced table styling (toggled from popup) ───────────────────

function markGradeCells(): void {
  const gradesDiv = document.querySelector(".div_noten");
  if (!gradesDiv) return;

  const table = gradesDiv.querySelector("table.mdl-data-table");
  if (!table) return;

  // Find all course rows (not detail rows)
  const rows = Array.from(table.querySelectorAll("tbody > tr")).filter(
    (row) =>
      !row.className.includes("detailrow") &&
      !row.id.includes("verlauf") &&
      !row.className.includes("snplus-summary-row") &&
      row.querySelector("td b"),
  );

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    const gradeCell = cells[1];
    const gradeText = gradeCell.textContent?.trim() ?? "";
    const grade = gradeText === "--" ? null : parseFloat(gradeText);

    if (grade !== null && !isNaN(grade)) {
      gradeCell.setAttribute("data-grade", grade.toString());
    }
  });
}

function injectEnhancedStyles(): void {
  if (document.getElementById("snplus-enhanced-table")) return;
  const style = document.createElement("style");
  style.id = "snplus-enhanced-table";
  style.textContent = `
    .snplus-enhanced .div_noten table.mdl-data-table {
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.06);
    }
    .snplus-enhanced .div_noten table.mdl-data-table th {
      background: #f0f4ff;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: #4338ca;
      padding: 10px 14px;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td {
      padding: 10px 14px;
      vertical-align: middle;
    }
    .snplus-enhanced .div_noten table.mdl-data-table tbody tr:hover {
      background: #f8faff;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td b {
      color: #1e3a5f;
    }
    .snplus-enhanced .div_noten h3 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }
    /* Grade cell colors in enhanced mode */
    .snplus-enhanced .div_noten table.mdl-data-table td[data-grade] {
      font-weight: 600;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td[data-grade]:is([data-grade^="6"], [data-grade^="5.5"], [data-grade^="5.6"], [data-grade^="5.7"], [data-grade^="5.8"], [data-grade^="5.9"]) {
      color: #16a34a;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td[data-grade]:is([data-grade^="5."], [data-grade^="4.5"], [data-grade^="4.6"], [data-grade^="4.7"], [data-grade^="4.8"], [data-grade^="4.9"]) {
      color: #22c55e;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td[data-grade]:is([data-grade^="4.0"], [data-grade^="4.1"], [data-grade^="4.2"], [data-grade^="4.3"], [data-grade^="4.4"]) {
      color: #eab308;
    }
    .snplus-enhanced .div_noten table.mdl-data-table td[data-grade]:is([data-grade^="3"], [data-grade^="2"], [data-grade^="1"]) {
      color: #ef4444;
    }
    /* Summary bar colors in enhanced mode */
    .snplus-enhanced .snplus-summary-bar {
      background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
      border-color: #c7d2fe;
    }
    .snplus-enhanced .snplus-stat-value[data-grade]:is([data-grade^="6"], [data-grade^="5.5"], [data-grade^="5.6"], [data-grade^="5.7"], [data-grade^="5.8"], [data-grade^="5.9"]) {
      color: #16a34a;
    }
    .snplus-enhanced .snplus-stat-value[data-grade]:is([data-grade^="5."], [data-grade^="4.5"], [data-grade^="4.6"], [data-grade^="4.7"], [data-grade^="4.8"], [data-grade^="4.9"]) {
      color: #22c55e;
    }
    .snplus-enhanced .snplus-stat-value[data-grade]:is([data-grade^="4.0"], [data-grade^="4.1"], [data-grade^="4.2"], [data-grade^="4.3"], [data-grade^="4.4"]) {
      color: #eab308;
    }
    .snplus-enhanced .snplus-stat-value[data-grade]:is([data-grade^="3"], [data-grade^="2"], [data-grade^="1"]) {
      color: #ef4444;
    }
  `;
  document.head.appendChild(style);
}

function setEnhancedView(on: boolean): boolean {
  injectEnhancedStyles();
  document.body.classList.toggle("snplus-enhanced", on);
  return on;
}

// ─── Chrome message listener ────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "downloadGrades") {
    try {
      downloadGradesJSON();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (request.action === "copyGrades") {
    copyGradesToClipboard()
      .then((success) => sendResponse({ success }))
      .catch((error) => {
        console.error("[Content] Error in copyGrades:", error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  } else if (request.action === "checkPage") {
    sendResponse({ exists: !!document.querySelector(".div_noten") });
  } else if (request.action === "toggleEnhanced") {
    const isOn = setEnhancedView(!!request.enabled);
    // Save to storage
    chrome.storage.local.set({ enhancedMode: isOn }).catch((error) => {
      console.error("[Content] Error saving enhanced mode to storage:", error);
    });
    sendResponse({ enabled: isOn });
  } else if (request.action === "getEnhanced") {
    sendResponse({
      enabled: document.body.classList.contains("snplus-enhanced"),
    });
  }
  return false;
});

// ─── Load enhanced state from storage on init ────────────────────

(async () => {
  try {
    const result = await chrome.storage.local.get("enhancedMode");
    if (result.enhancedMode === true) {
      setEnhancedView(true);
      console.log("[Content] Enhanced mode loaded from storage ✅");
    }
  } catch (error) {
    console.log("[Content] Could not load enhanced mode from storage:", error);
  }
})();

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

// ─── Init on grades page ────────────────────────────────────────────

if (pageId === "21311") {
  console.log("[Content] On grades page, looking for .div_noten");

  const initApp = () => {
    const gradesDiv = document.querySelector(".div_noten");
    if (!gradesDiv) {
      console.error("[Content] .div_noten not found on page");
      return;
    }

    const data = extractGrades();
    if (!data || data.courses.length === 0) {
      console.warn("[Content] No grade data extracted");
      return;
    }

    // Insert summary bar above the table
    const summaryBar = buildSummaryBar(data);
    gradesDiv.insertAdjacentElement("afterbegin", summaryBar);

    // Mark all grade cells with data attributes for CSS coloring
    markGradeCells();

    console.log("[Content] Summary bar injected ✅");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
