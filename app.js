const roles = ["初中级开发工程师", "高级开发工程师", "技术负责人", "测试工程师", "运维/DevOps 工程师"];
const scoreProfile = [
  ["项目量与工作情况", 70, "项目任务量、工作饱和度、任务完成度、推进难度和整体工作表现"],
  ["代码质量", 15, "代码可维护性、评审质量、缺陷率、规范性和技术债控制"],
  ["响应时效", 10, "问题响应速度、沟通反馈及时性、线上支持和协作响应"],
  ["其他工作完成情况", 5, "文档沉淀、临时任务、知识分享、流程配合和其他安排事项"]
];

const minSeedEmployeeCount = 10;
const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0
});

let state = createEmptyState();
let selectedId = null;
let saveTimer = null;
let bootSeed = new URLSearchParams(window.location.search).get("seed") === "1";

const $ = (id) => document.getElementById(id);

const elements = {
  periodInput: $("periodInput"),
  employeeList: $("employeeList"),
  addEmployeeBtn: $("addEmployeeBtn"),
  exportJsonBtn: $("exportJsonBtn"),
  importJsonInput: $("importJsonInput"),
  openPlanBtn: $("openPlanBtn"),
  closePlanBtn: $("closePlanBtn"),
  planModal: $("planModal"),
  planContent: $("planContent"),
  exportCsvBtn: $("exportCsvBtn"),
  resetDemoBtn: $("resetDemoBtn"),
  deleteEmployeeBtn: $("deleteEmployeeBtn"),
  roleInput: $("roleInput"),
  nameInput: $("nameInput"),
  performancePayInput: $("performancePayInput"),
  baseSalaryInput: $("baseSalaryInput"),
  positionSalaryInput: $("positionSalaryInput"),
  managerInput: $("managerInput"),
  noteInput: $("noteInput"),
  scoreBoard: $("scoreBoard"),
  editorTitle: $("editorTitle"),
  resultLevel: $("resultLevel"),
  resultBase: $("resultBase"),
  resultPay: $("resultPay"),
  scoreRing: $("scoreRing"),
  summaryTable: $("summaryTable"),
  statCount: $("statCount"),
  statBase: $("statBase"),
  statPay: $("statPay"),
  statAvg: $("statAvg")
};

init();

async function init() {
  state = await loadState();
  selectedId = state.employees[0]?.id || null;
  elements.periodInput.value = state.period;
  roles.forEach((role) => {
    const option = document.createElement("option");
    option.value = role;
    option.textContent = role;
    elements.roleInput.appendChild(option);
  });

  elements.periodInput.addEventListener("change", async () => {
    state.period = elements.periodInput.value;
    state = await loadState(false);
    selectedId = state.employees[0]?.id || null;
    render();
  });
  elements.addEmployeeBtn.addEventListener("click", addEmployee);
  elements.exportJsonBtn.addEventListener("click", exportJson);
  elements.importJsonInput.addEventListener("change", importJson);
  elements.openPlanBtn.addEventListener("click", openPlanModal);
  elements.closePlanBtn.addEventListener("click", closePlanModal);
  elements.planModal.addEventListener("click", (event) => {
    if (event.target === elements.planModal) closePlanModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePlanModal();
  });
  elements.exportCsvBtn.addEventListener("click", exportCsv);
  elements.resetDemoBtn.addEventListener("click", resetDemo);
  elements.deleteEmployeeBtn.addEventListener("click", deleteSelectedEmployee);

  ["nameInput", "roleInput", "performancePayInput", "baseSalaryInput", "positionSalaryInput", "managerInput", "noteInput"].forEach((id) => {
    elements[id].addEventListener("input", updateSelectedFromForm);
    elements[id].addEventListener("change", updateSelectedFromForm);
  });

  render();
}

function createEmptyState() {
  return {
    period: new Date().toISOString().slice(0, 7),
    employees: []
  };
}

function defaultState() {
  const month = new Date().toISOString().slice(0, 7);
  return {
    period: month,
    employees: [
      {
        id: createId(),
        name: "陈浩",
        role: "技术负责人",
        performancePay: 6400,
        baseSalary: 18000,
        positionSalary: 7600,
        manager: "周总",
        scores: { 项目量与工作情况: 96, 代码质量: 95, 响应时效: 97, 其他工作完成情况: 96 },
        note: "主导会员中心重构并按期上线，压降核心接口 P95 延迟，推动灰度发布流程落地。"
      },
      {
        id: createId(),
        name: "林悦",
        role: "高级开发工程师",
        performancePay: 3600,
        baseSalary: 14000,
        positionSalary: 6400,
        manager: "陈浩",
        scores: { 项目量与工作情况: 92, 代码质量: 90, 响应时效: 91, 其他工作完成情况: 89 },
        note: "完成结算模块核心改造，代码评审问题少，主动补齐关键链路日志。"
      },
      {
        id: createId(),
        name: "赵明",
        role: "高级开发工程师",
        performancePay: 3450,
        baseSalary: 13500,
        positionSalary: 6050,
        manager: "陈浩",
        scores: { 项目量与工作情况: 86, 代码质量: 88, 响应时效: 84, 其他工作完成情况: 83 },
        note: "负责订单查询性能优化，交付稳定，评审中能及时响应修改意见。"
      },
      {
        id: createId(),
        name: "王敏",
        role: "高级开发工程师",
        performancePay: 3375,
        baseSalary: 13200,
        positionSalary: 5925,
        manager: "陈浩",
        scores: { 项目量与工作情况: 72, 代码质量: 74, 响应时效: 76, 其他工作完成情况: 68 },
        note: "报表需求受产品口径反复调整影响，最终完成上线，后续需加强风险前置同步。"
      },
      {
        id: createId(),
        name: "刘洋",
        role: "初中级开发工程师",
        performancePay: 2175,
        baseSalary: 9000,
        positionSalary: 3325,
        manager: "林悦",
        scores: { 项目量与工作情况: 84, 代码质量: 82, 响应时效: 85, 其他工作完成情况: 78 },
        note: "独立完成个人中心三个需求，自测覆盖较完整，文档沉淀仍可加强。"
      },
      {
        id: createId(),
        name: "孙琪",
        role: "初中级开发工程师",
        performancePay: 2025,
        baseSalary: 8500,
        positionSalary: 2975,
        manager: "林悦",
        scores: { 项目量与工作情况: 91, 代码质量: 86, 响应时效: 88, 其他工作完成情况: 90 },
        note: "主动梳理历史权限逻辑，提前发现兼容风险，协助测试补充回归清单。"
      },
      {
        id: createId(),
        name: "周杰",
        role: "初中级开发工程师",
        performancePay: 1920,
        baseSalary: 8200,
        positionSalary: 2680,
        manager: "赵明",
        scores: { 项目量与工作情况: 63, 代码质量: 66, 响应时效: 62, 其他工作完成情况: 60 },
        note: "任务多次延期且风险同步不及时，代码评审出现重复低级问题，已安排改进计划。"
      },
      {
        id: createId(),
        name: "吴磊",
        role: "初中级开发工程师",
        performancePay: 1800,
        baseSalary: 7800,
        positionSalary: 2400,
        manager: "赵明",
        scores: { 项目量与工作情况: 52, 代码质量: 58, 响应时效: 55, 其他工作完成情况: 50 },
        note: "关键需求未按约定交付，联调准备不足影响测试排期，需要专项辅导和复盘。"
      },
      {
        id: createId(),
        name: "郑佳",
        role: "测试工程师",
        performancePay: 2325,
        baseSalary: 9200,
        positionSalary: 3975,
        manager: "陈浩",
        scores: { 项目量与工作情况: 93, 代码质量: 94, 响应时效: 90, 其他工作完成情况: 92 },
        note: "发布前拦截支付链路关键缺陷，补齐自动化回归用例，质量贡献明显。"
      },
      {
        id: createId(),
        name: "何娜",
        role: "测试工程师",
        performancePay: 2070,
        baseSalary: 8600,
        positionSalary: 3130,
        manager: "郑佳",
        scores: { 项目量与工作情况: 81, 代码质量: 84, 响应时效: 86, 其他工作完成情况: 78 },
        note: "测试计划执行稳定，问题推进及时，自动化覆盖率有小幅提升。"
      },
      {
        id: createId(),
        name: "马超",
        role: "测试工程师",
        performancePay: 1950,
        baseSalary: 8300,
        positionSalary: 2750,
        manager: "郑佳",
        scores: { 项目量与工作情况: 68, 代码质量: 64, 响应时效: 70, 其他工作完成情况: 62 },
        note: "回归测试遗漏一处边界场景，造成发布后修复，需加强用例评审。"
      },
      {
        id: createId(),
        name: "黄伟",
        role: "运维/DevOps 工程师",
        performancePay: 3150,
        baseSalary: 12500,
        positionSalary: 5350,
        manager: "陈浩",
        scores: { 项目量与工作情况: 90, 代码质量: 88, 响应时效: 96, 其他工作完成情况: 92 },
        note: "完善监控告警和自动扩容策略，保障大促期间系统稳定，推动发布脚本标准化。"
      },
      {
        id: createId(),
        name: "许强",
        role: "运维/DevOps 工程师",
        performancePay: 2775,
        baseSalary: 11200,
        positionSalary: 4525,
        manager: "黄伟",
        scores: { 项目量与工作情况: 79, 代码质量: 82, 响应时效: 80, 其他工作完成情况: 76 },
        note: "完成测试环境容器化迁移，发布支持响应及时，成本优化方案仍在推进。"
      },
      {
        id: createId(),
        name: "唐雨",
        role: "技术负责人",
        performancePay: 6000,
        baseSalary: 17000,
        positionSalary: 7000,
        manager: "周总",
        scores: { 项目量与工作情况: 82, 代码质量: 86, 响应时效: 84, 其他工作完成情况: 78 },
        note: "带领数据中台完成阶段性交付，受外部接口延期影响，整体风险控制尚可。"
      },
      {
        id: createId(),
        name: "高峰",
        role: "高级开发工程师",
        performancePay: 5200,
        baseSalary: 15000,
        positionSalary: 5800,
        manager: "唐雨",
        scores: { 项目量与工作情况: 98, 代码质量: 96, 响应时效: 94, 其他工作完成情况: 97 },
        note: "独立完成账务一致性校验框架，避免重大资金风险，产出可复用方案。"
      }
    ]
  };
}

async function loadState(allowSeed = bootSeed) {
  const period = elements.periodInput?.value || state.period || new Date().toISOString().slice(0, 7);
  const seedParam = allowSeed ? "&seed=1" : "";
  try {
    const response = await fetch(`/api/state?period=${encodeURIComponent(period)}${seedParam}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const loaded = await response.json();
    bootSeed = false;
    if (!Array.isArray(loaded.employees)) throw new Error("员工数据格式错误");
    return {
      period: loaded.period || period,
      employees: loaded.employees.map((employee) => normalizeEmployee(employee))
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistState().catch((error) => {
      console.error("保存失败", error);
    });
  }, 250);
}

async function persistState() {
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

function updateState(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

function selectedEmployee() {
  return state.employees.find((employee) => employee.id === selectedId) || state.employees[0] || null;
}

function addEmployee() {
  const employee = {
    id: createId(),
    name: "新员工",
    role: "初中级开发工程师",
    performancePay: 1800,
    baseSalary: 8000,
    positionSalary: 2200,
    manager: "",
    scores: {},
    note: ""
  };
  state.employees.push(normalizeEmployee(employee));
  selectedId = employee.id;
  saveState();
  render();
}

function deleteSelectedEmployee() {
  const employee = selectedEmployee();
  if (!employee) return;
  const confirmed = window.confirm(`确认删除 ${employee.name} 的绩效记录？`);
  if (!confirmed) return;
  state.employees = state.employees.filter((item) => item.id !== employee.id);
  selectedId = state.employees[0]?.id || null;
  saveState();
  render();
}

function updateSelectedFromForm() {
  const employee = selectedEmployee();
  if (!employee) return;
  employee.name = elements.nameInput.value.trim() || "未命名";
  employee.role = elements.roleInput.value;
  employee.performancePay = Number(elements.performancePayInput.value) || 0;
  employee.baseSalary = Number(elements.baseSalaryInput.value) || 0;
  employee.positionSalary = Number(elements.positionSalaryInput.value) || 0;
  employee.manager = elements.managerInput.value.trim();
  employee.note = elements.noteInput.value;
  normalizeScores(employee);
  saveState();
  render(false);
}

function normalizeEmployee(employee) {
  employee.role = roles.includes(employee.role) ? employee.role : "初中级开发工程师";
  employee.performancePay = Number(employee.performancePay ?? (Number(employee.salary) || 0) * (Number(employee.ratio) || 0)) || 0;
  employee.baseSalary = Number(employee.baseSalary) || 0;
  employee.positionSalary = Number(employee.positionSalary) || 0;
  delete employee.salary;
  delete employee.ratio;
  employee.scores = employee.scores || {};
  normalizeScores(employee);
  return employee;
}

function normalizeScores(employee) {
  const nextScores = {};
  scoreProfile.forEach(([name]) => {
    nextScores[name] = clamp(Number(employee.scores[name] ?? 80), 0, 100);
  });
  employee.scores = nextScores;
}

function calculate(employee) {
  const normalized = normalizeEmployee({ ...employee, scores: { ...employee.scores } });
  const total = scoreProfile.reduce((sum, [name, weight]) => {
    return sum + normalized.scores[name] * (weight / 100);
  }, 0);
  const score = Math.round(total * 10) / 10;
  const grade = getGrade(score);
  const base = normalized.performancePay;
  const pay = base * (score / 100);
  return { score, grade, base, pay };
}

function getGrade(score) {
  if (score >= 95) return { name: "S 卓越", key: "S" };
  if (score >= 85) return { name: "A 优秀", key: "A" };
  if (score >= 70) return { name: "B 合格", key: "B" };
  if (score >= 60) return { name: "C 待改进", key: "C" };
  return { name: "D 不合格", key: "D" };
}

function render(shouldSyncForm = true) {
  if (!selectedId && state.employees[0]) selectedId = state.employees[0].id;
  renderEmployeeList();
  if (shouldSyncForm) renderForm();
  renderScoreBoard();
  renderResult();
  renderSummary();
}

function renderEmployeeList() {
  elements.employeeList.innerHTML = "";
  state.employees.forEach((employee) => {
    const result = calculate(employee);
    const button = document.createElement("button");
    button.className = `employee-item ${employee.id === selectedId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <div>
        <strong>${escapeHtml(employee.name)}</strong>
        <span>${escapeHtml(employee.role)}</span>
      </div>
      <strong>${result.score}</strong>
    `;
    button.addEventListener("click", () => {
      selectedId = employee.id;
      render();
    });
    elements.employeeList.appendChild(button);
  });
}

function renderForm() {
  const employee = selectedEmployee();
  const disabled = !employee;
  ["nameInput", "roleInput", "performancePayInput", "baseSalaryInput", "positionSalaryInput", "managerInput", "noteInput", "deleteEmployeeBtn"].forEach((id) => {
    elements[id].disabled = disabled;
  });
  if (!employee) {
    elements.editorTitle.textContent = "请选择员工";
    return;
  }
  normalizeScores(employee);
  elements.editorTitle.textContent = employee.name;
  elements.nameInput.value = employee.name;
  elements.roleInput.value = employee.role;
  elements.performancePayInput.value = employee.performancePay;
  elements.baseSalaryInput.value = employee.baseSalary;
  elements.positionSalaryInput.value = employee.positionSalary;
  elements.managerInput.value = employee.manager || "";
  elements.noteInput.value = employee.note || "";
}

function renderScoreBoard() {
  const employee = selectedEmployee();
  elements.scoreBoard.innerHTML = "";
  if (!employee) return;

  scoreProfile.forEach(([name, weight, hint]) => {
    const score = employee.scores[name] ?? 80;
    const itemPay = employee.performancePay * (weight / 100) * (score / 100);
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <div>
        <h3>${name} ${weight}%</h3>
        <p>${hint}</p>
      </div>
      <input type="range" min="0" max="100" step="1" value="${score}" aria-label="${name}" />
      <div class="score-value">${score}</div>
      <div class="weighted-value">${yuan.format(itemPay)}</div>
    `;
    const input = row.querySelector("input");
    input.addEventListener("input", () => {
      employee.scores[name] = Number(input.value);
      saveState();
      render(false);
    });
    elements.scoreBoard.appendChild(row);
  });
}

function renderResult() {
  const employee = selectedEmployee();
  if (!employee) {
    elements.resultLevel.textContent = "-";
    elements.scoreRing.dataset.score = "0";
    return;
  }
  const result = calculate(employee);
  const degrees = Math.min(360, result.score * 3.6);
  elements.resultLevel.textContent = result.grade.name;
  elements.resultBase.textContent = yuan.format(result.base);
  elements.resultPay.textContent = yuan.format(result.pay);
  elements.scoreRing.dataset.score = String(result.score);
  elements.scoreRing.style.background = `conic-gradient(var(--green) 0deg, var(--green) ${degrees}deg, #e8eee9 ${degrees}deg)`;
}

function renderSummary() {
  elements.summaryTable.innerHTML = "";
  let totalBase = 0;
  let totalPay = 0;
  let totalScore = 0;

  state.employees.forEach((employee) => {
    const result = calculate(employee);
    totalBase += result.base;
    totalPay += result.pay;
    totalScore += result.score;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(employee.name)}</td>
      <td>${escapeHtml(employee.role)}</td>
      <td class="number">${result.score}</td>
      <td class="center"><span class="level-pill level-${result.grade.key}">${result.grade.name}</span></td>
      <td class="money">${yuan.format(result.base)}</td>
      <td class="money">${yuan.format(result.pay)}</td>
    `;
    elements.summaryTable.appendChild(row);
  });

  const count = state.employees.length;
  if (!count) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.innerHTML = '<td colspan="8">暂无员工绩效记录</td>';
    elements.summaryTable.appendChild(row);
  }
  elements.statCount.textContent = String(count);
  elements.statBase.textContent = yuan.format(totalBase);
  elements.statPay.textContent = yuan.format(totalPay);
  elements.statAvg.textContent = count ? (totalScore / count).toFixed(1) : "0";
}

function exportJson() {
  download(`绩效工资数据-${state.period}.json`, JSON.stringify(state, null, 2), "application/json;charset=utf-8");
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.employees)) throw new Error("员工数据格式错误");
      state = {
        period: imported.period || new Date().toISOString().slice(0, 7),
        employees: imported.employees.map((employee) => normalizeEmployee({ ...employee, id: employee.id || createId() }))
      };
      elements.periodInput.value = state.period;
      selectedId = state.employees[0]?.id || null;
      saveState();
      render();
    } catch (error) {
      window.alert(`导入失败：${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function exportCsv() {
  const header = ["考核月份", "姓名", "岗位", "直属负责人", "基础薪资", "岗位薪资", "总分", "等级", "绩效工资", "实发绩效", "事实依据"];
  const rows = state.employees.map((employee) => {
    const result = calculate(employee);
    return [
      state.period,
      employee.name,
      employee.role,
      employee.manager || "",
      Math.round(employee.baseSalary || 0),
      Math.round(employee.positionSalary || 0),
      result.score,
      result.grade.name,
      Math.round(result.base),
      Math.round(result.pay),
      employee.note || ""
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  download(`绩效工资明细-${state.period}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function resetDemo() {
  const confirmed = window.confirm("确认加载测试数据？当前本地数据会被覆盖。");
  if (!confirmed) return;
  state = defaultState();
  selectedId = state.employees[0]?.id || null;
  saveState();
  render();
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function openPlanModal() {
  elements.planModal.classList.add("open");
  elements.planModal.setAttribute("aria-hidden", "false");
  elements.planContent.innerHTML = "正在加载方案文本...";

  try {
    const response = await fetch(`技术开发部门绩效工资方案.md?v=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    elements.planContent.innerHTML = renderMarkdown(markdown);
  } catch (error) {
    elements.planContent.innerHTML = `<p>方案文本加载失败：${escapeHtml(error.message)}</p>`;
  }
}

function closePlanModal() {
  elements.planModal.classList.remove("open");
  elements.planModal.setAttribute("aria-hidden", "true");
}

function renderMarkdown(markdown) {
  const blocks = [];
  let inCode = false;
  let codeLines = [];
  let tableLines = [];
  let listLines = [];

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    codeLines = [];
  };

  const flushTable = () => {
    if (!tableLines.length) return;
    blocks.push(renderMarkdownTable(tableLines));
    tableLines = [];
  };

  const flushList = () => {
    if (!listLines.length) return;
    const ordered = listLines.every((line) => /^\d+\.\s+/.test(line));
    const tag = ordered ? "ol" : "ul";
    const items = listLines.map((line) => {
      const text = line.replace(/^(\d+\.\s+|-+\s+)/, "");
      return `<li>${renderInlineMarkdown(text)}</li>`;
    });
    blocks.push(`<${tag}>${items.join("")}</${tag}>`);
    listLines = [];
  };

  markdown.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("```")) {
      flushTable();
      flushList();
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushList();
      tableLines.push(line.trim());
      return;
    }

    flushTable();

    if (/^(\d+\.\s+|-+\s+)/.test(line.trim())) {
      listLines.push(line.trim());
      return;
    }

    flushList();

    if (!line.trim()) return;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  });

  flushCode();
  flushTable();
  flushList();
  return blocks.join("");
}

function renderMarkdownTable(lines) {
  const rows = lines.filter((line) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line));
  if (!rows.length) return "";
  const cells = rows.map((line) => line.split("|").slice(1, -1).map((cell) => renderInlineMarkdown(cell.trim())));
  const [head, ...body] = cells;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${head.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>
        <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `id-${timePart}-${randomPart}`;
}




