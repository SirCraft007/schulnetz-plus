import { initRoot } from "./init";

console.log("[Content] ========== SCHULNETZ+ EXTENSION LOADED ==========");
console.log("[Content] Script version: 2.0");

/**
 * Extracts grade data from the grades table
 */
function extractGrades() {
  const gradesDiv = document.querySelector(".div_noten");
  //   If there is no grade div, we're not on the right page
  if (!gradesDiv) {
    return null;
  }

  const data = {
    student: "",
    extractedAt: new Date().toISOString(),
    courses: [] as Array<{
      code: string;
      name: string;
      average: number | null;
      assessments: Array<{
        date: string;
        topic: string;
        grade: number | null;
        weight: number;
      }>;
    }>,
  };

  // Extract student name
  const header = gradesDiv.querySelector("h3");
  if (header) {
    data.student = header.textContent.replace("Aktuelle Noten - ", "").trim();
  }

  // Get all main course rows (not detail rows)
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

    const courseInfo = cells[0].querySelector("b")?.textContent.trim();
    const courseName = cells[0]
      .querySelector("br")
      ?.nextSibling?.textContent?.trim();
    const average = cells[1].textContent.trim();

    const course = {
      code: courseInfo || "",
      name: courseName || "",
      average: average === "--" ? null : parseFloat(average),
      assessments: [] as Array<{
        date: string;
        topic: string;
        grade: number | null;
        weight: number;
      }>,
    };

    // Extract the actual index from the onclick attribute of the detail button
    const detailButton = cells[2]?.querySelector(
      "button[onclick*='toggle_notendetails']",
    );
    const onclickAttr = detailButton?.getAttribute("onclick");
    const indexMatch = onclickAttr?.match(/toggle_notendetails\(0,\s*(\d+)\)/);
    const actualIndex = indexMatch ? indexMatch[1] : null;

    // Find the detail row for this course using the actual index from HTML
    const detailRow = actualIndex
      ? table?.querySelector(`tr[class*="0_${actualIndex}_detailrow"]`)
      : null;
    if (detailRow) {
      const detailTable = detailRow.querySelector("table.clean");
      if (detailTable) {
        const assessmentRows = Array.from(
          detailTable.querySelectorAll("tr"),
        ).filter((tr) => {
          const cells = tr.querySelectorAll("td");
          // Skip header rows and group header rows
          if (cells.length < 5) return false;
          if (tr.className.includes("pruefungsgruppe")) return false;

          // Check if second column (index 1) contains a date
          const dateCell = cells[1];
          return (
            dateCell && dateCell.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/)
          );
        });

        assessmentRows.forEach((aRow) => {
          const aCells = aRow.querySelectorAll("td");
          if (aCells.length >= 5) {
            const gradeText = aCells[3].textContent.trim();
            course.assessments.push({
              date: aCells[1].textContent.trim(),
              topic: aCells[2].textContent.trim(),
              grade: gradeText === "" ? null : parseFloat(gradeText),
              weight: parseFloat(aCells[4].textContent.trim()),
            });
          }
        });
      }
    }

    data.courses.push(course);
  });

  return data;
}

/**
 * Downloads the extracted data as JSON file
 */
export function downloadGradesJSON() {
  const data = extractGrades();
  if (!data) {
    console.error("[Content] No data extracted, grades div not found");
    return;
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `grades_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies the extracted data to clipboard
 */
export async function copyGradesToClipboard() {
  const data = extractGrades();
  if (!data) {
    return false;
  }

  const jsonStr = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(jsonStr);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      .then((success) => {
        sendResponse({ success });
      })
      .catch((error) => {
        console.error("[Content] Error in copyGrades:", error);
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true; // Keep channel open for async response
  } else if (request.action === "checkPage") {
    const exists = document.querySelector(".div_noten") !== null;
    sendResponse({ exists });
  }
  return false;
});

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
    console.log(
      `[Content] On pageid=${newId}, setting menu${oldId} to original ${oldId}`,
    );
    const updatedHref = calButtonHref.includes(`pageid=${newId}`)
      ? calButtonHref.replace(`pageid=${newId}`, `pageid=${oldId}`)
      : calButtonHref.replace(newId, oldId);
    calButton.setAttribute("href", updatedHref);
  } else {
    console.log(
      `[Content] Not on pageid=${newId}, redirecting menu${oldId} to ${newId}`,
    );
    const updatedHref = calButtonHref.includes(`pageid=${oldId}`)
      ? calButtonHref.replace(`pageid=${oldId}`, `pageid=${newId}`)
      : calButtonHref.replace(oldId, newId);
    calButton.setAttribute("href", updatedHref);
  }
}


if (searchParams.get("pageid") === "21311") {
  console.log("[Content] On grades page, looking for .div_noten");

  // Wait for DOM to be ready
  const initApp = () => {
    const gradesDiv = document.querySelector(".div_noten");

    if (gradesDiv) {
      initRoot(gradesDiv);
    } else {
      console.error("[Content] .div_noten not found on page");
    }
  };

  // Try immediately and also after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}