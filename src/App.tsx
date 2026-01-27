import { useState, useEffect } from "react";
import { downloadGradesJSON, copyGradesToClipboard } from "./content";

console.log("[App] App.tsx module loaded");

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

/**
 * Calculate plus points based on subject averages
 * Rules:
 * - For each grade above 4: add 0.5 per 0.5 above 4
 * - For each grade below 4: subtract 1 point
 */
function calculatePlusPoints(courses: Course[]): number {
  let plusPoints = 0;

  courses.forEach((course) => {
    if (course.average === null) return;

    if (course.average >= 4) {
      // Add 0.5 for every 0.5 above 4
      const above = course.average - 4;
      plusPoints += Math.floor(above / 0.5) * 0.5;
    } else {
      // Subtract 1 for each grade below 4
      plusPoints -= 1;
    }
  });

  return plusPoints;
}

function extractGradesData(): GradeData | null {
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
      header.textContent?.replace("Aktuelle Noten - ", "").trim() || "";
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

    const courseInfo = cells[0].querySelector("b")?.textContent?.trim();
    const courseName = cells[0]
      .querySelector("br")
      ?.nextSibling?.textContent?.trim();
    const average = cells[1].textContent?.trim();

    data.courses.push({
      code: courseInfo || "",
      name: courseName || "",
      average: average === "--" ? null : parseFloat(average || "0"),
      assessments: [],
    });
  });

  return data;
}

function App() {
  console.log("[App] App rendering");
  const [gradeData, setGradeData] = useState<GradeData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.log("[App] useEffect running");
    const data = extractGradesData();
    console.log("[App] Extracted data:", data);
    setGradeData(data);
  }, []);

  const plusPoints = gradeData ? calculatePlusPoints(gradeData.courses) : 0;
  const coursesAbove4 =
    gradeData?.courses.filter((c) => c.average && c.average >= 4).length || 0;
  const coursesBelow4 =
    gradeData?.courses.filter((c) => c.average && c.average < 4).length || 0;

  const handleCopy = async () => {
    await copyGradesToClipboard();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-gray-400";
    if (grade >= 5.5) return "text-green-600";
    if (grade >= 4.5) return "text-green-500";
    if (grade >= 4) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="w-full max-w-4xl p-6 mx-auto mb-6 shadow-2xl bg-linear-to-br from-blue-50 to-indigo-100 rounded-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold text-transparent bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text">
          Grade Statistics
        </h1>
        {gradeData?.student && (
          <p className="text-lg text-gray-600">{gradeData.student}</p>
        )}
      </div>

      {/* Plus Points Card */}
      <div className="p-6 mb-6 bg-white border-2 border-indigo-200 shadow-lg rounded-xl">
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-semibold text-gray-700">
            Plus Points
          </h2>
          <div
            className={`text-6xl font-bold mb-4 ${plusPoints >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {plusPoints >= 0 ? "+" : ""}
            {plusPoints.toFixed(1)}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-green-50">
              <div className="text-3xl font-bold text-green-600">
                {coursesAbove4}
              </div>
              <div className="text-sm text-gray-600">Grades ≥ 4.0</div>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <div className="text-3xl font-bold text-red-600">
                {coursesBelow4}
              </div>
              <div className="text-sm text-gray-600">Grades &lt; 4.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Averages */}
      {gradeData && gradeData.courses.length > 0 && (
        <div className="p-6 mb-6 bg-white shadow-lg rounded-xl">
          <h2 className="mb-4 text-2xl font-semibold text-gray-700">
            Subject Averages
          </h2>
          <div className="space-y-3">
            {gradeData.courses.map((course, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 transition-colors rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {course.code}
                  </div>
                  <div className="text-sm text-gray-600">{course.name}</div>
                </div>
                <div
                  className={`text-2xl font-bold ${getGradeColor(course.average)}`}
                >
                  {course.average?.toFixed(2) || "--"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => downloadGradesJSON()}
          className="flex-1 px-6 py-3 font-semibold text-white transition-all duration-200 transform rounded-lg shadow-lg bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105"
        >
          Download JSON
        </button>
        <button
          onClick={handleCopy}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 ${
            copied
              ? "bg-green-500 text-white"
              : "bg-linear-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700"
          }`}
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </button>
      </div>

      {/* Info Box */}
      <div className="p-4 mt-6 border-l-4 border-blue-500 rounded bg-blue-50">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Plus Point Rules:</span> +0.5 for
          every 0.5 above 4.0, -1.0 for each grade below 4.0
        </p>
      </div>
    </div>
  );
}

export default App;
