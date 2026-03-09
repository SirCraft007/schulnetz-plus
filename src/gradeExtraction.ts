export interface Assessment {
  date: string;
  topic: string;
  grade: number | null;
  weight: number;
}

export interface Course {
  code: string;
  name: string;
  average: number | null;
  assessments: Assessment[];
}

export interface GradeData {
  student: string;
  extractedAt: string;
  courses: Course[];
}

const MIN_GRADE = 1;
const MAX_GRADE = 6;

export function parseNumber(text: string): number | null {
  const normalized = text.replace(",", ".").trim();
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function isValidCourseAverage(value: number | null): value is number {
  return value !== null && value >= MIN_GRADE && value <= MAX_GRADE;
}

export function getTopLevelRows(table: Element): HTMLTableRowElement[] {
  const tbody = table.querySelector(":scope > tbody");
  if (!tbody) return [];

  return Array.from(tbody.children).filter(
    (row): row is HTMLTableRowElement => row instanceof HTMLTableRowElement,
  );
}

export function getCourseRows(table: Element): HTMLTableRowElement[] {
  return getTopLevelRows(table).filter((row) => {
    if (row.className.includes("detailrow") || row.id.includes("verlauf")) {
      return false;
    }
    const hasCourseLabel = !!row.querySelector("td b");
    return hasCourseLabel;
  }) as HTMLTableRowElement[];
}

export function extractGrades(): GradeData | null {
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

  const rows = getCourseRows(table);

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) return;

    const courseInfo = cells[0].querySelector("b")?.textContent?.trim() ?? "";
    const rawCourseName =
      cells[0].querySelector("br")?.nextSibling?.textContent?.trim() ?? "";
    const fallbackCourseName =
      (cells[0].textContent ?? "")
        .replace(courseInfo, "")
        .replace(/\s+/g, " ")
        .trim() ?? "";
    const courseName = rawCourseName || fallbackCourseName;

    if (!courseInfo && !courseName) return;

    const averageText = cells[1].textContent?.trim() ?? "";
    const parsedAverage = parseNumber(averageText);

    const course: Course = {
      code: courseInfo,
      name: courseName,
      average: isValidCourseAverage(parsedAverage) ? parsedAverage : null,
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
            const parsedAssessmentGrade = parseNumber(gradeText);
            course.assessments.push({
              date: aCells[1].textContent?.trim() ?? "",
              topic: aCells[2].textContent?.trim() ?? "",
              grade: parsedAssessmentGrade,
              weight: parseNumber(aCells[4].textContent?.trim() ?? "") ?? 0,
            });
          }
        });
      }
    }

    data.courses.push(course);
  });

  return data;
}
