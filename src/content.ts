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
      row.querySelector("td b")
  );

  rows.forEach((row, index) => {
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

    // Find the detail row for this course - escape the class name
    const detailRow = table?.querySelector(`tr[class*="0_${index}_detailrow"]`);
    if (detailRow) {
      const detailTable = detailRow.querySelector("table.clean");
      if (detailTable) {
        const assessmentRows = Array.from(
          detailTable.querySelectorAll("tr")
        ).filter((tr) => {
          const dateTd = tr.querySelector("td.td_einzelpruefungen");
          return (
            dateTd && dateTd.textContent.trim().match(/\d{2}\.\d{2}\.\d{4}/)
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
function downloadGradesJSON() {
  const data = extractGrades();
  if (!data) return;

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
async function copyGradesToClipboard() {
  const data = extractGrades();
  if (!data) return;

  const jsonStr = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(jsonStr);
    console.log("Grades copied to clipboard!");
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadGrades") {
    downloadGradesJSON();
    sendResponse({ success: true });
  } else if (request.action === "copyGrades") {
    copyGradesToClipboard().then((success) => {
      sendResponse({ success });
    });
    return true; // Keep channel open for async response
  } else if (request.action === "checkPage") {
    const hasGrades = document.querySelector(".div_noten") !== null;
    sendResponse({ hasGrades });
  }
  return false;
});

const grades = extractGrades();
console.log(grades);
