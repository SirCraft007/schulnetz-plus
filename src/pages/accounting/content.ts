import "./content.css";

export const ACCOUNTING_PAGE_ID = "21411";

let accountingMessageListenerRegistered = false;

function parseSwissAmount(value: string): number | null {
  const cleaned = value
    .replace(/CHF/gi, "")
    .replace(/\s+/g, "")
    .replace(/'/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(\d{1,2})$/, ".$1")
    .replace(/[^0-9+\-.]/g, "");

  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} CHF`;
}

function findTransactionsTable(root: Element): HTMLTableElement | null {
  const tables = Array.from(root.querySelectorAll("table"));
  return (
    tables.find((table) =>
      /datum/i.test(table.querySelector("tr")?.textContent ?? ""),
    ) ?? null
  );
}

function decorateAccountingPage(): void {
  const contentCard = document.querySelector("#content-card");
  if (!contentCard) return;

  contentCard.classList.add("snplus-accounting");

  const heading = contentCard.querySelector("h3");
  heading?.classList.add("snplus-accounting-title");

  const infoTable = contentCard.querySelector("table");
  infoTable?.classList.add("snplus-accounting-person-table");

  const transactionsTable = findTransactionsTable(contentCard);
  if (!transactionsTable) return;

  transactionsTable.classList.add("snplus-accounting-transactions");

  const rows = Array.from(transactionsTable.querySelectorAll("tbody > tr"));

  let income = 0;
  let expenses = 0;
  let transactionCount = 0;
  let latestBalance: number | null = null;

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length !== 4) return;

    const amountCell = cells[2] as HTMLTableCellElement;
    const balanceCell = cells[3] as HTMLTableCellElement;

    if (cells[0].querySelector("b") || cells[0].hasAttribute("colspan")) {
      return;
    }

    row.classList.add("snplus-accounting-row");

    const amount = parseSwissAmount(amountCell.textContent ?? "");
    const balance = parseSwissAmount(balanceCell.textContent ?? "");

    if (amount !== null) {
      transactionCount += 1;
      if (amount >= 0) {
        income += amount;
        amountCell.dataset.sign = "positive";
      } else {
        expenses += Math.abs(amount);
        amountCell.dataset.sign = "negative";
      }
    }

    if (balance !== null) {
      latestBalance = balance;
      balanceCell.dataset.sign = balance >= 0 ? "positive" : "negative";
    }
  });

  const totalRow = rows.find(
    (row) =>
      /saldo/i.test(row.textContent ?? "") && row.querySelector("td[colspan]"),
  );

  if (totalRow) {
    totalRow.classList.add("snplus-accounting-total-row");
    const totalCell = totalRow.querySelector("td:last-child");
    const totalValue = parseSwissAmount(totalCell?.textContent ?? "");
    if (totalCell && totalValue !== null) {
      totalCell.setAttribute(
        "data-sign",
        totalValue >= 0 ? "positive" : "negative",
      );
      latestBalance = totalValue;
    }
  }

  if (contentCard.querySelector(".snplus-accounting-summary")) {
    return;
  }

  const summary = document.createElement("div");
  summary.className = "snplus-accounting-summary";

  const summaryItems = [
    {
      label: "Buchungen",
      value: String(transactionCount),
      tone: "neutral",
    },
    {
      label: "Einzahlungen",
      value: formatCurrency(income),
      tone: "positive",
    },
    {
      label: "Ausgaben",
      value: formatCurrency(expenses),
      tone: "negative",
    },
    {
      label: "Aktueller Saldo",
      value: latestBalance === null ? "--" : formatCurrency(latestBalance),
      tone:
        latestBalance === null
          ? "neutral"
          : latestBalance >= 0
            ? "positive"
            : "negative",
    },
  ] as const;

  summary.innerHTML = summaryItems
    .map(
      (item) => `
				<div class="snplus-accounting-stat" data-tone="${item.tone}">
					<span class="snplus-accounting-stat-label">${item.label}</span>
					<span class="snplus-accounting-stat-value">${item.value}</span>
				</div>
			`,
    )
    .join("");

  transactionsTable.insertAdjacentElement("beforebegin", summary);
}

function setAccountingEnhanced(on: boolean): boolean {
  const contentCard = document.querySelector("#content-card");
  if (contentCard) {
    contentCard.classList.toggle("snplus-accounting-enhanced", on);
  }
  document.body.classList.toggle("snplus-enhanced", on);
  return on;
}

function registerAccountingMessageListener(): void {
  if (accountingMessageListenerRegistered) return;
  accountingMessageListenerRegistered = true;

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "checkPage") {
      sendResponse({ exists: !!document.querySelector("#content-card") });
    } else if (request.action === "toggleEnhanced") {
      const isOn = setAccountingEnhanced(!!request.enabled);
      chrome.storage.local.set({ enhancedMode: isOn }).catch((error) => {
        console.error(
          "[Accounting] Error saving enhanced mode to storage:",
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

async function initAccountingUi(): Promise<void> {
  decorateAccountingPage();

  try {
    const result = await chrome.storage.local.get("enhancedMode");
    setAccountingEnhanced(result.enhancedMode === true);
  } catch (error) {
    console.log(
      "[Accounting] Could not load enhanced mode from storage:",
      error,
    );
  }
}

export function initAccountingPage(): void {
  registerAccountingMessageListener();

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        void initAccountingUi();
      },
      {
        once: true,
      },
    );
  } else {
    void initAccountingUi();
  }
}
