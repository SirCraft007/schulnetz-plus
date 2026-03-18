import {
  extractGrades,
  getCourseRows,
  getTopLevelRows,
  isValidCourseAverage,
  parseNumber,
  type Course,
  type GradeData,
} from "./gradeExtraction";
import "./grades.css";

export const GRADES_PAGE_ID = "21311";

type CourseInclusionMap = Record<string, boolean>;

const COURSE_INCLUSION_STORAGE_KEY = "snplusCourseInclusion";

const GRADE_BANDS = {
  redBelow: 4,
  yellowBelow: 4.5,
  greenBelow: 5.5,
} as const;

type GradeBand = "red" | "yellow" | "green" | "excellent";

let gradesMessageListenerRegistered = false;

function getGradeBand(value: number): GradeBand {
  if (value < GRADE_BANDS.redBelow) return "red";
  if (value < GRADE_BANDS.yellowBelow) return "yellow";
  if (value < GRADE_BANDS.greenBelow) return "green";
  return "excellent";
}

function applyGradeAttributes(element: Element, value: number | null): void {
  if (!isValidCourseAverage(value)) {
    element.removeAttribute("data-grade-band");
    return;
  }

  element.setAttribute("data-grade-band", getGradeBand(value));
}

function courseKey(course: Course, index: number): string {
  const code = course.code?.trim() || `course-${index}`;
  const name = course.name?.trim() || "unknown";
  return `${code}::${name}`;
}

async function loadCourseInclusionMap(): Promise<CourseInclusionMap> {
  try {
    const result = await chrome.storage.local.get(COURSE_INCLUSION_STORAGE_KEY);
    const value = result?.[COURSE_INCLUSION_STORAGE_KEY];
    if (!value || typeof value !== "object") return {};
    return value as CourseInclusionMap;
  } catch (error) {
    console.log("[Content] Could not load course inclusion map:", error);
    return {};
  }
}

async function saveCourseInclusionMap(map: CourseInclusionMap): Promise<void> {
  try {
    await chrome.storage.local.set({ [COURSE_INCLUSION_STORAGE_KEY]: map });
  } catch (error) {
    console.log("[Content] Could not save course inclusion map:", error);
  }
}

function calculatePlusPoints(courses: Course[]): number {
  let pp = 0;
  for (const c of courses) {
    if (!isValidCourseAverage(c.average)) continue;
    if (c.average >= 4) {
      pp += Math.floor((c.average - 4) / 0.5) * 0.5;
    } else {
      pp -= 1;
    }
  }
  return pp;
}

function isCourseIncluded(
  course: Course,
  index: number,
  inclusionMap: CourseInclusionMap,
): boolean {
  const key = courseKey(course, index);
  return inclusionMap[key] !== false;
}

function getIncludedCourses(
  courses: Course[],
  inclusionMap: CourseInclusionMap,
): Course[] {
  return courses.filter((course, index) =>
    isCourseIncluded(course, index, inclusionMap),
  );
}

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

function updateSummaryBarValues(
  summaryBar: HTMLElement,
  courses: Course[],
): void {
  const pp = calculatePlusPoints(courses);
  const above4 = courses.filter(
    (c) => isValidCourseAverage(c.average) && c.average >= 4,
  ).length;
  const below4 = courses.filter(
    (c) => isValidCourseAverage(c.average) && c.average < 4,
  ).length;
  const allAvgs = courses.map((c) => c.average).filter(isValidCourseAverage);
  const totalAvg =
    allAvgs.length > 0
      ? (allAvgs.reduce((s, v) => s + v, 0) / allAvgs.length).toFixed(2)
      : "--";

  const avgEl = summaryBar.querySelector(
    "[data-snplus-summary='average']",
  ) as HTMLElement | null;
  const ppEl = summaryBar.querySelector(
    "[data-snplus-summary='pluspoints']",
  ) as HTMLElement | null;
  const aboveEl = summaryBar.querySelector(
    "[data-snplus-summary='above4']",
  ) as HTMLElement | null;
  const belowEl = summaryBar.querySelector(
    "[data-snplus-summary='below4']",
  ) as HTMLElement | null;

  if (avgEl) {
    avgEl.textContent = totalAvg;
    applyGradeAttributes(avgEl, parseNumber(totalAvg));
  }
  if (ppEl) ppEl.textContent = `${pp >= 0 ? "+" : ""}${pp.toFixed(1)}`;
  if (aboveEl) aboveEl.textContent = String(above4);
  if (belowEl) belowEl.textContent = String(below4);
}

function buildSummaryBar(courses: Course[]): HTMLElement {
  const div = document.createElement("div");
  div.className = "snplus-summary-bar";
  div.innerHTML = `
		<div class="snplus-stat">
			<span class="snplus-stat-label">Durchschnitt</span>
			<span class="snplus-stat-value" data-snplus-summary="average">--</span>
		</div>
		<div class="snplus-stat">
			<span class="snplus-stat-label">Plus-Punkte</span>
			<span class="snplus-stat-value" data-snplus-summary="pluspoints">--</span>
		</div>
		<div class="snplus-stat">
			<span class="snplus-stat-label">Über 4.0</span>
			<span class="snplus-stat-value" data-snplus-summary="above4">0</span>
		</div>
		<div class="snplus-stat">
			<span class="snplus-stat-label">Unter 4.0</span>
			<span class="snplus-stat-value" data-snplus-summary="below4">0</span>
		</div>
	`;
  updateSummaryBarValues(div, courses);
  return div;
}

function injectCourseInclusionToggles(
  gradeData: GradeData,
  inclusionMap: CourseInclusionMap,
  summaryBar: HTMLElement,
): void {
  const gradesDiv = document.querySelector(".div_noten");
  if (!gradesDiv) return;

  const table = gradesDiv.querySelector("table.mdl-data-table");
  if (!table) return;

  const rows = getCourseRows(table);

  rows.forEach((row, index) => {
    const course = gradeData.courses[index];
    if (!course) return;

    const detailsCell = row.querySelectorAll("td")[2];
    if (!detailsCell) return;

    const existingToggle = detailsCell.querySelector(".snplus-course-toggle");
    if (!isValidCourseAverage(course.average)) {
      existingToggle?.remove();
      return;
    }

    if (existingToggle) return;

    const key = courseKey(course, index);
    const checked = isCourseIncluded(course, index, inclusionMap);

    const label = document.createElement("label");
    label.className = "snplus-course-toggle";
    label.title = "In den Durchschnitt einrechnen";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = checked;

    const text = document.createElement("span");
    text.textContent = "Ø zählt";

    checkbox.addEventListener("change", () => {
      inclusionMap[key] = checkbox.checked;
      void saveCourseInclusionMap(inclusionMap);
      const includedCourses = getIncludedCourses(
        gradeData.courses,
        inclusionMap,
      );
      updateSummaryBarValues(summaryBar, includedCourses);
    });

    label.appendChild(checkbox);
    label.appendChild(text);
    detailsCell.appendChild(label);
  });
}

function updateLastTwoRowsVisibility(on: boolean): void {
  const gradesDiv = document.querySelector(".div_noten");
  if (!gradesDiv) return;

  const table = gradesDiv.querySelector("table.mdl-data-table");
  if (!table) return;

  const allRows = getTopLevelRows(table);
  allRows.forEach((row) => {
    const headerCells = row.querySelectorAll(":scope > th");
    const dataCells = row.querySelectorAll(":scope > td");

    headerCells.forEach((cell) =>
      cell.classList.remove("snplus-hidden-actions-cell"),
    );
    dataCells.forEach((cell) =>
      cell.classList.remove("snplus-hidden-actions-cell"),
    );

    if (!on) return;

    if (headerCells.length >= 4) {
      // Header row: hide "Bestätigt" and "Mitteilung an Lehrperson"
      headerCells[2]?.classList.add("snplus-hidden-actions-cell");
      headerCells[3]?.classList.add("snplus-hidden-actions-cell");
    }

    if (dataCells.length >= 5) {
      // Course rows: hide corresponding action columns
      dataCells[3]?.classList.add("snplus-hidden-actions-cell");
      dataCells[4]?.classList.add("snplus-hidden-actions-cell");
    }
  });
}

function markGradeCells(): void {
  const gradesDiv = document.querySelector(".div_noten");
  if (!gradesDiv) return;

  const table = gradesDiv.querySelector("table.mdl-data-table");
  if (!table) return;

  const rows = getTopLevelRows(table).filter(
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
    const grade = parseNumber(gradeText);
    applyGradeAttributes(gradeCell, grade);
  });

  const assessmentRows = gradesDiv.querySelectorAll("table.clean tr");
  assessmentRows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 4) return;

    const assessmentGradeCell = cells[3];
    if (!assessmentGradeCell?.classList.contains("td_einzelpruefungen")) {
      return;
    }

    const gradeText = assessmentGradeCell.textContent?.trim() ?? "";
    const grade = parseNumber(gradeText);
    applyGradeAttributes(assessmentGradeCell, grade);
  });

  const groupAverageValues = gradesDiv.querySelectorAll(
    "tr.last_line_top_pruefungsgruppe i",
  );
  groupAverageValues.forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    const value = parseNumber(text);
    applyGradeAttributes(el, value);
  });
}

function setEnhancedView(on: boolean): boolean {
  document.body.classList.toggle("snplus-enhanced", on);
  updateLastTwoRowsVisibility(on);
  return on;
}

function registerGradesMessageListener(): void {
  if (gradesMessageListenerRegistered) return;
  gradesMessageListenerRegistered = true;

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
      chrome.storage.local.set({ enhancedMode: isOn }).catch((error) => {
        console.error(
          "[Content] Error saving enhanced mode to storage:",
          error,
        );
      });
      sendResponse({ enabled: isOn });
    } else if (request.action === "getEnhanced") {
      sendResponse({
        enabled: document.body.classList.contains("snplus-enhanced"),
      });
    }
    return false;
  });
}

async function initGradesUi(): Promise<void> {
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

  const inclusionMap = await loadCourseInclusionMap();
  const includedCourses = getIncludedCourses(data.courses, inclusionMap);

  const existingSummary = gradesDiv.querySelector(".snplus-summary-bar");
  if (existingSummary) {
    existingSummary.remove();
  }

  const summaryBar = buildSummaryBar(includedCourses);
  gradesDiv.insertAdjacentElement("afterbegin", summaryBar);

  injectCourseInclusionToggles(data, inclusionMap, summaryBar);
  markGradeCells();

  updateLastTwoRowsVisibility(
    document.body.classList.contains("snplus-enhanced"),
  );
}

export function initGradesPage(): void {
  registerGradesMessageListener();

  void chrome.storage.local
    .get("enhancedMode")
    .then((result) => {
      if (result.enhancedMode === true) {
        setEnhancedView(true);
      }
    })
    .catch((error) => {
      console.log(
        "[Content] Could not load enhanced mode from storage:",
        error,
      );
    });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void initGradesUi();
    });
  } else {
    void initGradesUi();
  }
}
