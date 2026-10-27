// ---------- 1. Data: load from Local Storage ----------
let transactions = JSON.parse(localStorage.getItem("tx")) || [];
let categories = JSON.parse(localStorage.getItem("cats")) || ["Food", "Transport", "Rent", "Shopping", "Bills", "Health", "Salary", "Other"];
const COLORS = ["#0b2a5b", "#1f4e9c", "#4f81bd", "#7aa5d6", "#a9c6e8", "#2d6cb5", "#163e7a", "#5c93cf"];

// Short helper names
const $ = id => document.getElementById(id);
const money = n => "₹" + n.toLocaleString("en-IN");

// Save everything to Local Storage
function save() {
  localStorage.setItem("tx", JSON.stringify(transactions));
  localStorage.setItem("cats", JSON.stringify(categories));
}

// ---------- 2. Add or edit a transaction ----------
$("txForm").onsubmit = e => {
  e.preventDefault();                                  // stop page reload
  const t = {
    id: $("txId").value || Date.now().toString(),      // old id = edit, no id = new
    type: $("type").value, amount: +$("amount").value,
    date: $("date").value, category: $("category").value, description: $("desc").value
  };
  const i = transactions.findIndex(x => x.id === t.id);
  if (i >= 0) transactions[i] = t; else transactions.push(t);
  e.target.reset(); $("txId").value = ""; $("formTitle").textContent = "Add Transaction";
  $("date").value = new Date().toISOString().slice(0, 10);   // set today again
  show();
};

// ---------- 3. Edit and delete buttons in the table ----------
$("txBody").onclick = e => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (e.target.dataset.act === "del") {
    transactions = transactions.filter(t => t.id !== id);   // remove the record
  } else {
    const t = transactions.find(x => x.id === id);          // put the record back in the form
    $("txId").value = id; $("type").value = t.type; $("amount").value = t.amount;
    $("date").value = t.date; $("category").value = t.category; $("desc").value = t.description;
    $("formTitle").textContent = "Edit Transaction";
  }
  show();
};

// ---------- 4. Categories ----------
$("catForm").onsubmit = e => {
  e.preventDefault();
  const name = $("catName").value.trim();
  if (!categories.includes(name)) categories.push(name);    // no duplicates
  e.target.reset(); show();
};
$("catList").onclick = e => {
  const c = e.target.dataset.cat;
  if (!c) return;
  if (transactions.some(t => t.category === c)) alert("This category is in use.");
  else categories = categories.filter(x => x !== c);
  show();
};

// ---------- 5. Search and filter ----------
function filtered() {
  const q = $("fSearch").value.toLowerCase();
  return transactions.filter(t =>
    t.description.toLowerCase().includes(q) &&
    ($("fCategory").value === "all" || t.category === $("fCategory").value) &&
    ($("fType").value === "all" || t.type === $("fType").value) &&
    (!$("fFrom").value || t.date >= $("fFrom").value) &&
    (!$("fTo").value || t.date <= $("fTo").value)
  ).sort((a, b) => b.date.localeCompare(a.date));          // newest first
}
["fSearch", "fCategory", "fType", "fFrom", "fTo"].forEach(id => $(id).oninput = show);
$("clearBtn").onclick = () => {
  ["fSearch", "fFrom", "fTo"].forEach(id => $(id).value = "");
  $("fCategory").value = $("fType").value = "all"; show();
};
$("chartMode").onchange = show;

// ---------- 6. Donut chart ----------
function drawDonut() {
  const byMonth = $("chartMode").value === "month";
  const sums = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    const key = byMonth ? t.date.slice(0, 7) : t.category;  // group by month or category
    sums[key] = (sums[key] || 0) + t.amount;
  });
  const total = Object.values(sums).reduce((a, b) => a + b, 0);
  $("donutTotal").textContent = money(total);

  let start = 0, svg = "", legend = "";
  Object.entries(sums).forEach(([name, value], i) => {
    const pct = value / total * 100;
    // One circle per slice. Circle length is 100, so dash = percentage.
    svg += `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${COLORS[i % 8]}" stroke-width="6"
            stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-start}"/>`;
    legend += `<li><i style="background:${COLORS[i % 8]}"></i><span>${name}</span><b>${money(value)}</b> (${pct.toFixed(1)}%)</li>`;
    start += pct;
  });
  $("donut").innerHTML = svg;
  $("legend").innerHTML = legend;
}

// ---------- 7. Category list----------
function show() {
  save();

  // Category lists (form, filter and chips)
  const opts = categories.map(c => `<option>${c}</option>`).join("");
  const old = $("fCategory").value;
  $("category").innerHTML = opts;
  $("fCategory").innerHTML = `<option value="all">All Categories</option>` + opts;
  $("fCategory").value = categories.includes(old) ? old : "all";
  $("catList").innerHTML = categories.map(c => `<li>${c}<button data-cat="${c}">×</button></li>`).join("");

  // Total income, total expenses and balance
  const sum = type => transactions.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
  $("inc").textContent = money(sum("income"));
  $("exp").textContent = money(sum("expense"));
  $("bal").textContent = money(sum("income") - sum("expense"));

  // Monthly summary
  const m = {};
  transactions.forEach(t => {
    const k = t.date.slice(0, 7);
    m[k] = m[k] || { income: 0, expense: 0 };
    m[k][t.type] += t.amount;
  });
  $("monthBody").innerHTML = Object.keys(m).sort().reverse().map(k =>
    `<tr><td>${k}</td><td>${money(m[k].income)}</td><td>${money(m[k].expense)}</td><td>${money(m[k].income - m[k].expense)}</td></tr>`).join("");

  // History table
  $("txBody").innerHTML = filtered().map(t =>
    `<tr><td>${t.date}</td><td>${t.description}</td><td>${t.category}</td>
     <td>${t.type === "income" ? "+" : "−"}${money(t.amount)}</td>
     <td><button data-act="edit" data-id="${t.id}">Edit</button><button data-act="del" data-id="${t.id}">Delete</button></td></tr>`).join("");

  drawDonut();
}

// ---------- 8. Start ----------
$("date").value = new Date().toISOString().slice(0, 10);   // today's date
show();
