const STORAGE_KEY = "expense-tracker-transactions";

const transactionForm = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const noteInput = document.getElementById("note");
const monthFilterInput = document.getElementById("monthFilter");

const balanceValue = document.getElementById("balanceValue");
const incomeValue = document.getElementById("incomeValue");
const expenseValue = document.getElementById("expenseValue");
const transactionCount = document.getElementById("transactionCount");
const breakdownList = document.getElementById("breakdownList");
const transactionBody = document.getElementById("transactionBody");
const transactionTable = document.getElementById("transactionTable");
const emptyState = document.getElementById("emptyState");

let transactions = loadTransactions();

if (!transactionForm) {
  console.error("Expense Tracker could not start because the form was not found.");
} else {
  dateInput.valueAsDate = new Date();

  transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(amountInput.value);

    if (!amount || amount <= 0) {
      window.alert("Please enter a valid amount.");
      return;
    }

    const transaction = {
      id: createTransactionId(),
      type: typeInput.value,
      amount,
      category: categoryInput.value,
      date: dateInput.value,
      note: noteInput.value.trim(),
    };

    transactions.unshift(transaction);
    saveTransactions();
    transactionForm.reset();
    typeInput.value = "expense";
    dateInput.valueAsDate = new Date();
    render();
  });

  monthFilterInput.addEventListener("input", render);

  transactionBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const { id } = target.dataset;
    transactions = transactions.filter((transaction) => transaction.id !== id);
    saveTransactions();
    render();
  });

  render();
}

function loadTransactions() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to parse saved transactions.", error);
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function createTransactionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `txn-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function render() {
  const visibleTransactions = getFilteredTransactions();
  const totals = calculateTotals(visibleTransactions);
  const categoryTotals = calculateCategoryTotals(visibleTransactions);

  balanceValue.textContent = formatCurrency(totals.balance);
  incomeValue.textContent = formatCurrency(totals.income);
  expenseValue.textContent = formatCurrency(totals.expense);
  transactionCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  renderTransactionTable(visibleTransactions);
  renderBreakdown(categoryTotals, totals.expense);
}

function getFilteredTransactions() {
  const selectedMonth = monthFilterInput.value;

  if (!selectedMonth) {
    return transactions;
  }

  return transactions.filter((transaction) => transaction.date.startsWith(selectedMonth));
}

function calculateTotals(items) {
  return items.reduce(
    (result, item) => {
      if (item.type === "income") {
        result.income += item.amount;
      } else {
        result.expense += item.amount;
      }

      result.balance = result.income - result.expense;
      return result;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}

function calculateCategoryTotals(items) {
  return items
    .filter((item) => item.type === "expense")
    .reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount;
      return result;
    }, {});
}

function renderTransactionTable(items) {
  transactionBody.innerHTML = "";

  if (items.length === 0) {
    transactionTable.hidden = true;
    emptyState.hidden = false;
    return;
  }

  const rows = items.map((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="type-pill type-pill--${item.type}">
          ${capitalize(item.type)}
        </span>
      </td>
      <td>${item.category}</td>
      <td class="amount--${item.type}">
        ${item.type === "income" ? "+" : "-"}${formatCurrency(item.amount)}
      </td>
      <td>${formatDate(item.date)}</td>
      <td>${item.note || "-"}</td>
      <td>
        <button type="button" class="action-button" data-id="${item.id}">Delete</button>
      </td>
    `;
    return tr;
  });

  transactionBody.append(...rows);
  transactionTable.hidden = false;
  emptyState.hidden = true;
}

function renderBreakdown(categoryTotals, totalExpense) {
  breakdownList.innerHTML = "";

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    breakdownList.innerHTML = '<p class="empty-state">Add expense transactions to see category insights.</p>';
    return;
  }

  const cards = entries.map(([category, amount]) => {
    const share = totalExpense === 0 ? 0 : (amount / totalExpense) * 100;
    const wrapper = document.createElement("article");
    wrapper.className = "breakdown__item";
    wrapper.innerHTML = `
      <div class="breakdown__top">
        <strong>${category}</strong>
        <span>${formatCurrency(amount)} (${share.toFixed(0)}%)</span>
      </div>
      <div class="breakdown__bar">
        <div class="breakdown__fill" style="width: ${share}%"></div>
      </div>
    `;
    return wrapper;
  });

  breakdownList.append(...cards);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
