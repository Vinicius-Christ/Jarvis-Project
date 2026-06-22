import { jsx, jsxs } from "react/jsx-runtime";
import { getServerUrl, fetchAutenticado } from "./lib/api";
import PackagerModule from "./components/PackagerModule";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SystemHealthMonitor, HardwareProcessingMonitor } from "./components/HardwareMonitor";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Terminal,
  Calendar,
  BookOpen,
  Sliders,
  Clock,
  Home,
  Shield,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Database,
  Settings,
  Workflow,
  Code,
  Trash2,
  Table
} from "lucide-react";
import Installer from "./components/Installer";
import JarvisAssistant from "./components/JarvisAssistant";
import LogsDocker from "./components/LogsDocker";
import DeviceConfig from "./components/DeviceConfig";
import SystemUpdater from "./components/SystemUpdater";
import CUDATelemetryHUD from "./components/CUDATelemetryHUD";
import SSHDiagnostics from "./components/SSHDiagnostics";
import FinanceDashboard from "./components/FinanceDashboard";
import MCPSettings from "./components/MCPSettings";
import TokensManager from "./components/TokensManager";
const HOLO_THEMES = {
  cyan: {
    primary: "#06b6d4",
    light: "#22d3ee",
    glow: "rgba(6,182,212,0.05)",
    glowStrong: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.15)",
    dark: "rgba(6,182,212,0.05)"
  },
  amber: {
    primary: "#f59e0b",
    light: "#fbbf24",
    glow: "rgba(245,158,11,0.05)",
    glowStrong: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.15)",
    dark: "rgba(245,158,11,0.05)"
  },
  violet: {
    primary: "#8b5cf6",
    light: "#a78bfa",
    glow: "rgba(139,92,246,0.05)",
    glowStrong: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.15)",
    dark: "rgba(139,92,246,0.05)"
  },
  emerald: {
    primary: "#10b981",
    light: "#34d399",
    glow: "rgba(16,185,129,0.05)",
    glowStrong: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.15)",
    dark: "rgba(16,185,129,0.05)"
  },
  rose: {
    primary: "#f43f5e",
    light: "#fb7185",
    glow: "rgba(244,63,94,0.05)",
    glowStrong: "rgba(244,63,94,0.1)",
    border: "rgba(244,63,94,0.15)",
    dark: "rgba(244,63,94,0.05)"
  }
};
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settingsTab, setSettingsTab] = useState("general");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [systemState, setSystemState] = useState(null);
  const [timeStr, setTimeStr] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Modo Trabalho");
  const [updateState, setUpdateState] = useState({
    status: "idle",
    progress: 0,
    localCommit: "",
    remoteCommit: "",
    remoteMessage: "",
    logs: [],
    githubRepo: "Vinicius-Christ/Jarvis-Project-"
  });
  const [financeForm, setFinanceForm] = useState({
    value: "",
    type: "Despesa",
    category: "Educa\xE7\xE3o",
    description: ""
  });
  const [goalForm, setGoalForm] = useState({ limit: "", reason: "" });
  const [agendaForm, setAgendaForm] = useState({
    title: "",
    datetime: "",
    category: "Trabalho",
    notes: ""
  });
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("jarvis_holo_theme");
      if (saved && ["cyan", "amber", "violet", "emerald", "rose"].includes(saved)) {
        return saved;
      }
    } catch {
    }
    return "violet";
  });
  const changeTheme = (theme) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem("jarvis_holo_theme", theme);
    } catch (e) {
    }
  };
  const fetchSystemState = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/db");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSystemState((prev) => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      }
    } catch (err) {
    }
  };
  const fetchUpdateState = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/system/update/status");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUpdateState((prev) => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      }
    } catch (err) {
    }
  };
  useEffect(() => {
    fetchSystemState();
    fetchUpdateState();
    fetch(getServerUrl() + "/api/system/update/check").then(() => fetchUpdateState()).catch(() => {
    });
    const interval = setInterval(() => {
      fetchSystemState();
      fetchUpdateState();
    }, 1e4);
    return () => {
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    const updateTime = () => {
      const now = /* @__PURE__ */ new Date();
      setTimeStr(now.toLocaleTimeString("pt-BR", { hour12: false }) + " PT");
    };
    updateTime();
    const timer = setInterval(updateTime, 1e3);
    return () => clearInterval(timer);
  }, []);
  const handleSendMessage = async (text, file, model) => {
    try {
      const res = await fetch(getServerUrl() + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          file,
          model: model || "llama-3.3-70b-versatile"
        })
      });
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Invalid content-type from /api/chat");
      }
      if (data.text) {
        const cmdRegex = /<command\s+([\s\S]*?)\/>/g;
        let match;
        while ((match = cmdRegex.exec(data.text)) !== null) {
          const attributesStr = match[1];
          const typeMatch = attributesStr.match(/type="([^"]+)"/);
          const type = typeMatch ? typeMatch[1] : "";
          if (type === "IoT") {
            const actionMatch = attributesStr.match(/action="([^"]+)"/);
            if (actionMatch) {
              triggerPresetChange(actionMatch[1]);
            }
          } else if (type === "Navigate") {
            const toMatch = attributesStr.match(/to="([^"]+)"/);
            const tabMatch = attributesStr.match(/tab="([^"]+)"/);
            if (toMatch && toMatch[1]) setActiveTab(toMatch[1]);
            if (tabMatch && tabMatch[1] && toMatch && toMatch[1] === "settings") {
              setSettingsTab(tabMatch[1]);
            }
          } else if (type === "Finance") {
            const valueMatch = attributesStr.match(/value="([^"]+)"/);
            const catMatch = attributesStr.match(/category="([^"]+)"/);
            const descMatch = attributesStr.match(/description="([^"]+)"/);
            if (valueMatch && catMatch) {
              await fetch(getServerUrl() + "/api/update/finance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  value: parseFloat(valueMatch[1]),
                  category: catMatch[1],
                  description: descMatch ? descMatch[1] : "Inserido via voz/anexo JARVIS"
                })
              });
            }
          } else if (type === "Agenda") {
            const titleMatch = attributesStr.match(/title="([^"]+)"/);
            const dateMatch = attributesStr.match(/datetime="([^"]+)"/);
            if (titleMatch && dateMatch) {
              await fetch(getServerUrl() + "/api/update/agenda", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: titleMatch[1],
                  datetime: dateMatch[1],
                  category: "Trabalho"
                })
              });
            }
          } else if (type === "PC") {
            const workspaceMatch = attributesStr.match(/workspace="([^"]+)"/);
            if (workspaceMatch) {
              await fetch(getServerUrl() + "/api/update/pc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace: workspaceMatch[1] })
              });
            }
          } else if (type === "FinanceDelete") {
            const descMatch = attributesStr.match(/description="([^"]+)"/);
            const allMatch = attributesStr.match(/all="([^"]+)"/);
            const isAll = allMatch && allMatch[1] === "true" || attributesStr.includes("all=") || !descMatch;
            await fetch(getServerUrl() + "/api/delete/finance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: descMatch ? descMatch[1] : void 0,
                all: isAll
              })
            });
          } else if (type === "AgendaDelete") {
            const titleMatch = attributesStr.match(/title="([^"]+)"/);
            const allMatch = attributesStr.match(/all="([^"]+)"/);
            const isAll = allMatch && allMatch[1] === "true" || attributesStr.includes("all=") || !titleMatch;
            await fetch(getServerUrl() + "/api/delete/agenda", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: titleMatch ? titleMatch[1] : void 0,
                all: isAll
              })
            });
          } else if (type === "GoalDelete") {
            await fetch(getServerUrl() + "/api/delete/goal", {
              method: "POST"
            });
          } else if (type === "ObsidianDelete") {
            const pathMatch = attributesStr.match(/path="([^"]+)"/);
            if (pathMatch) {
              await fetch(getServerUrl() + "/api/delete/obsidian", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: pathMatch[1] })
              });
            }
          }
        }
      }
      fetchSystemState();
      return data;
    } catch (err) {
      console.error(err);
    }
  };
  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);
  const onSendMessageStable = useCallback((text, file, model) => {
    return handleSendMessageRef.current(text, file, model);
  }, []);
  const fetchSystemStateRef = useRef(fetchSystemState);
  useEffect(() => {
    fetchSystemStateRef.current = fetchSystemState;
  }, [fetchSystemState]);
  const onRefreshStable = useCallback(() => {
    return fetchSystemStateRef.current();
  }, []);
  const fetchUpdateStateRef = useRef(fetchUpdateState);
  useEffect(() => {
    fetchUpdateStateRef.current = fetchUpdateState;
  }, [fetchUpdateState]);
  const onUpdateRefreshStable = useCallback(() => {
    return fetchUpdateStateRef.current();
  }, []);
  const triggerPresetChange = async (presetName) => {
    try {
      await fetch(getServerUrl() + "/api/update/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetName })
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };
  const toggleDeviceState = async (deviceId, currentState) => {
    try {
      await fetch(getServerUrl() + "/api/update/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          state: currentState === "on" ? "off" : "on"
        })
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };
  const updateObsidianNote = async (path, newContent) => {
    try {
      await fetch(getServerUrl() + "/api/update/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: newContent })
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };
  const financeStats = React.useMemo(() => {
    let receitas = 0;
    let despesas = 0;
    if (systemState?.finances) {
      systemState.finances.forEach((item) => {
        const val = typeof item.value === "number" && !isNaN(item.value) ? item.value : 0;
        if (item.category === "Renda") {
          receitas += val;
        } else {
          despesas += val;
        }
      });
    }
    return { receitas, despesas, saldo: receitas - despesas };
  }, [systemState]);
  const currentGoal = systemState?.goal || {
    limit: 1500,
    reason: "Aposentadoria"
  };
  const guardado = financeStats.saldo;
  const [categoryLimits, setCategoryLimits] = useState({});
  useEffect(() => {
    if (systemState?.obsidianNotes) {
      const metasNote = systemState.obsidianNotes.find(
        (n) => n.path.includes("metas.md")
      );
      if (metasNote) {
        const limits = {};
        const lines = metasNote.content.split("\n");
        let parsingLimits = false;
        lines.forEach((line) => {
          if (line.includes("Limites") || line.includes("por Categoria")) {
            parsingLimits = true;
          } else if (parsingLimits && line.trim().startsWith("-")) {
            const match = line.match(/-\s*([^:]+):\s*R\$\s*([\d.,]+)/);
            if (match) {
              const catRaw = match[1].trim();
              const catNameMatch = catRaw.match(/^([^(]+)/);
              const catName = catNameMatch ? catNameMatch[1].trim() : catRaw;
              const valStr = match[2].replace(/\./g, "").replace(",", ".");
              const val = parseFloat(valStr);
              if (!isNaN(val)) limits[catName] = val;
            }
          }
        });
        setCategoryLimits(limits);
      }
    }
  }, [systemState]);
  const categoryChartData = React.useMemo(() => {
    const expenses = {};
    if (systemState?.finances) {
      systemState.finances.forEach((item) => {
        if (item.category !== "Renda") {
          const val = typeof item.value === "number" && !isNaN(item.value) ? item.value : 0;
          expenses[item.category] = (expenses[item.category] || 0) + val;
        }
      });
    }
    const data = [];
    const allCategories = /* @__PURE__ */ new Set([
      ...Object.keys(categoryLimits),
      ...Object.keys(expenses)
    ]);
    allCategories.forEach((cat) => {
      data.push({
        category: cat,
        gasto: expenses[cat] || 0,
        limite: categoryLimits[cat] || 0
      });
    });
    return data;
  }, [categoryLimits, systemState]);
  const savingsData = React.useMemo(() => {
    if (!systemState?.finances || systemState.finances.length === 0) {
      return [{ mes: "Atual", guardado }];
    }
    const grouped = {};
    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez"
    ];
    systemState.finances.forEach((item) => {
      const d = new Date(item.date);
      const keyStr = monthNames[d.getMonth()];
      const sortKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!grouped[sortKey])
        grouped[sortKey] = { mes: keyStr, receitas: 0, despesas: 0 };
      const val = typeof item.value === "number" && !isNaN(item.value) ? item.value : 0;
      if (item.category === "Renda") {
        grouped[sortKey].receitas += val;
      } else {
        grouped[sortKey].despesas += val;
      }
    });
    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map((k) => ({
      mes: grouped[k].mes,
      guardado: grouped[k].receitas - grouped[k].despesas
    }));
  }, [systemState?.finances, guardado]);
  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    if (!financeForm.value || !financeForm.description) return;
    try {
      const categoryToUse = financeForm.type === "Receita" ? "Renda" : financeForm.category;
      await fetchAutenticado("/api/update/finance", {
        method: "POST",
        body: JSON.stringify({
          value: parseFloat(financeForm.value),
          category: categoryToUse,
          description: financeForm.description,
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
        })
      });
      setFinanceForm({
        value: "",
        type: "Despesa",
        category: "Educa\xE7\xE3o",
        description: ""
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalForm.limit || !goalForm.reason) return;
    try {
      await fetchAutenticado("/api/update/goal", {
        method: "POST",
        body: JSON.stringify({
          limit: parseFloat(goalForm.limit),
          reason: goalForm.reason
        })
      });
      setGoalForm({ limit: "", reason: "" });
      fetchSystemState();
    } catch {
    }
  };
  const handleExportPDF = async () => {
    const el = document.getElementById("finance-report-area");
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = canvas.height * pdfWidth / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("relatorio_financeiro_jarvis.pdf");
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };
  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    if (!agendaForm.title || !agendaForm.datetime) return;
    try {
      await fetchAutenticado("/api/update/agenda", {
        method: "POST",
        body: JSON.stringify({
          title: agendaForm.title,
          datetime: agendaForm.datetime,
          category: agendaForm.category,
          notes: agendaForm.notes
        })
      });
      setAgendaForm({
        title: "",
        datetime: "",
        category: "Trabalho",
        notes: ""
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleDeleteAgenda = async (title) => {
    try {
      await fetchAutenticado("/api/delete/agenda", {
        method: "POST",
        body: JSON.stringify({ title })
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleDeleteFinance = async (description) => {
    try {
      await fetchAutenticado("/api/delete/finance", {
        method: "POST",
        body: JSON.stringify({ description })
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleDeleteGoal = async () => {
    try {
      await fetchAutenticado("/api/delete/goal", {
        method: "POST"
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleDeleteObsidian = async (path) => {
    try {
      await fetch(getServerUrl() + "/api/delete/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      fetchSystemState();
    } catch {
    }
  };
  const handleFileUpload = async (e, type) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSendMessage(
        `Analisar arquivo anexo e lan\xE7ar em ${type}. [Arquivo recebido]`
      );
    }
  };
  const activeHoloTheme = HOLO_THEMES[currentTheme];
  const themeStyles = {
    "--brand-primary": activeHoloTheme.primary,
    "--brand-light": activeHoloTheme.light,
    "--brand-glow": activeHoloTheme.glow,
    "--brand-glow-strong": activeHoloTheme.glowStrong,
    "--brand-border": activeHoloTheme.border,
    "--brand-dark": activeHoloTheme.dark
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: themeStyles,
      className: `w-full min-h-screen flex font-sans overflow-hidden select-none transition-all duration-300 bg-[size:20px_20px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] ${"dark bg-[#020408] text-zinc-300"}`,
      children: [
        /* @__PURE__ */ jsxs(
          "aside",
          {
            className: `glass-panel ${isSidebarOpen ? "w-64" : "w-16"} transition-all duration-300 flex flex-col border-r ${"border-zinc-900 bg-[#020408]"} shrink-0 z-20`,
            children: [
              /* @__PURE__ */ jsxs("div", { className: `h-[73px] flex items-center justify-between p-4 border-b shrink-0 sticky top-0 bg-transparent ${"border-zinc-900 bg-[#020408]"} z-30`, children: [
                isSidebarOpen && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 overflow-hidden whitespace-nowrap", children: [
                  /* @__PURE__ */ jsx(Shield, { className: "h-5 w-5 text-[var(--brand-light)] shrink-0" }),
                  /* @__PURE__ */ jsx("span", { className: `font-bold tracking-widest text-xs ${"text-white"}`, children: "JARVIS OS" })
                ] }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setIsSidebarOpen(!isSidebarOpen),
                    className: `p-1.5 rounded-lg transition border shrink-0 ${isSidebarOpen ? "" : "mx-auto"} ${"bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border-transparent hover:border-zinc-700"}`,
                    children: isSidebarOpen ? /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-[var(--brand-light)]" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("nav", { className: "flex flex-col gap-1.5 p-2 font-mono flex-1 overflow-y-auto overflow-x-hidden w-full", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("dashboard"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "dashboard" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_4px_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Painel de Controle (HUD)",
                    children: [
                      /* @__PURE__ */ jsx(Sliders, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Painel de Controle" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("finance"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "finance" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Financeiro",
                    children: [
                      /* @__PURE__ */ jsx(Database, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Financeiro" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("agenda"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "agenda" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Agenda",
                    children: [
                      /* @__PURE__ */ jsx(BookOpen, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Agenda" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("settings"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "settings" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Configura\xE7\xF5es & IoT",
                    children: [
                      /* @__PURE__ */ jsx(Settings, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Configs & IoT" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("diagnostics"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "diagnostics" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Diagn\xF3sticos & SSH",
                    children: [
                      /* @__PURE__ */ jsx(Terminal, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Diagn\xF3sticos & SSH" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setActiveTab("readme"),
                    className: `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${activeTab === "readme" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]" : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                    title: "Documenta\xE7\xE3o T\xE9cnica (README)",
                    children: [
                      /* @__PURE__ */ jsx(Info, { className: "h-4 w-4 shrink-0" }),
                      isSidebarOpen && /* @__PURE__ */ jsx("span", { children: "Documenta\xE7\xE3o" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: `p-3 flex justify-center font-mono text-[8px] tracking-widest shrink-0 mt-auto truncate w-full border-t ${"border-zinc-900 text-zinc-600"}`, children: isSidebarOpen ? "TERMINAL MESTRE" : "TM" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden p-4 md:p-6 w-full", children: [
          /* @__PURE__ */ jsxs("header", { className: `flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4 mb-6 shrink-0 relative ${"border-zinc-900"}`, children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsx("div", { className: `w-11 h-11 border border-[var(--brand-border)] rounded-full flex items-center justify-center shadow-[0_4px_12px_var(--brand-glow-strong)] ${"bg-slate-950"}`, children: /* @__PURE__ */ jsx(
                "div",
                {
                  className: `w-4-dot w-4 h-4 rounded-full ${systemState?.systemActive ? systemState?.installer?.status === "installing" ? " bg-yellow-400" : "transition-opacity duration-300 bg-[var(--brand-light)]" : "bg-zinc-600"}`
                }
              ) }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxs(
                    "h1",
                    {
                      id: "main_title",
                      className: `text-2xl font-bold tracking-widest font-sans flex items-center gap-1.5 ${"text-white"}`,
                      children: [
                        "JARVIS",
                        " ",
                        /* @__PURE__ */ jsx("span", { className: "text-[var(--brand-light)]", children: "CHRIST" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-[var(--brand-glow)] text-[var(--brand-light)] px-2 py-0.5 rounded border border-[var(--brand-border)] font-mono", children: "v5.0-LOCAL" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-[0.25em] text-[var(--brand-light)]/70 font-semibold font-mono", children: "Automated Deployment & AI Control System" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6 self-end md:self-auto", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "http://localhost:5678",
                    target: "_blank",
                    rel: "noreferrer",
                    className: `w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${"border-zinc-800/40 bg-zinc-900"}`,
                    title: "Abrir n8n (Porta 5678)",
                    children: /* @__PURE__ */ jsx(Workflow, { className: "w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" })
                  }
                ),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "http://localhost:8123",
                    target: "_blank",
                    rel: "noreferrer",
                    className: `w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${"border-zinc-800/40 bg-zinc-900"}`,
                    title: "Abrir Home Assistant (Porta 8123)",
                    children: /* @__PURE__ */ jsx(Home, { className: "w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" })
                  }
                ),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: systemState?.googleSheetUrl || "https://docs.google.com/spreadsheets/",
                    target: "_blank",
                    rel: "noreferrer",
                    className: `w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group ${"border-zinc-800/40 bg-zinc-900"}`,
                    title: "Abrir Mem\xF3ria Central (Google Sheets)",
                    onClick: (e) => {
                      if (!systemState?.googleSheetUrl) {
                        e.preventDefault();
                        setActiveTab("settings");
                        setSettingsTab("general");
                      }
                    },
                    children: /* @__PURE__ */ jsx(Table, { className: "w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" })
                  }
                ),
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: "/api-docs",
                    target: "_blank",
                    rel: "noreferrer",
                    className: `w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${"border-zinc-800/40 bg-zinc-900"}`,
                    title: "Abrir JARVIS Web/Dev (Porta 3000)",
                    children: /* @__PURE__ */ jsx(Code, { className: "w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: `border-l pl-4 text-right font-mono ${"border-zinc-800/40"}`, children: [
                /* @__PURE__ */ jsxs("span", { className: "text-xs text-zinc-500 uppercase block tracking-wider", children: [
                  "Servidor ",
                  hardwareStats?.cpu || "Notebook (Servidor)"
                ] }),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: `flex items-center gap-1.5 justify-end text-xs ${systemState?.systemActive ? "opacity-100" : "opacity-30"} ${"text-white"}`,
                    children: [
                      /* @__PURE__ */ jsx(
                        "span",
                        {
                          className: `h-1.5 w-1.5 rounded-full ${systemState?.systemActive ? "bg-emerald-500 " : "bg-zinc-500"}`
                        }
                      ),
                      hardwareStats?.gpus?.[0]?.model || "GTX 1650",
                      " CUDA:",
                      " ",
                      systemState?.systemActive ? "ATIVO" : "INATIVO"
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { className: `border-l pl-4 text-right font-mono ${"border-zinc-800/40"}`, children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs text-zinc-500 uppercase block tracking-wider", children: "Esta\xE7\xE3o Hor\xE1ria" }),
                /* @__PURE__ */ jsxs(
                  "span",
                  {
                    id: "digital_clock",
                    className: `text-sm font-semibold tracking-widest flex items-center gap-1 ${"text-white"}`,
                    children: [
                      /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3 text-[var(--brand-light)]" }),
                      timeStr
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("div", { className: `border-l pl-4 flex items-center justify-center ${"border-zinc-800/40"}`, children: /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: async () => {
                    try {
                      await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
                      fetchSystemState();
                    } catch (e) {
                      console.error("Failed to toggle system", e);
                    }
                  },
                  className: `px-4 py-2 border rounded hover-glow font-mono text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95
                  ${systemState?.systemActive ? "bg-zinc-900 border-zinc-700 text-yellow-500 hover:bg-zinc-800" : "bg-[var(--brand-primary)] border-[var(--brand-light)] text-white hover:bg-[var(--brand-light)] hover:text-black shadow-[0_2px_8px_var(--brand-glow-strong)]"}
                `,
                  children: systemState?.systemActive ? "Pausar JARVIS" : "Iniciar JARVIS"
                }
              ) })
            ] })
          ] }),
          updateState && updateState.status === "available" && /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-950/20 text-cyan-200 rounded-2xl font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.08)] transition-all", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-cyan-400  shrink-0" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("span", { className: "font-bold text-white uppercase tracking-wider block sm:inline", children: [
                  "[\u{1F504} ATUALIZA\xC7\xC3O REPOSIT\xD3RIO]",
                  " "
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Uma nova altera\xE7\xE3o de c\xF3digo-fonte foi sincronizada no Git remoto. Commit:",
                  " ",
                  /* @__PURE__ */ jsx("span", { className: "text-cyan-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/40 font-bold", children: updateState.remoteCommit }),
                  " ",
                  '- "',
                  updateState.remoteMessage,
                  '"'
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setActiveTab("settings");
                  setSettingsTab("updates");
                },
                className: "px-4 py-1.5 hover-glow bg-cyan-500/15 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-500/50 text-cyan-300 font-bold tracking-wider rounded transition-all cursor-pointer whitespace-nowrap active:scale-95",
                children: "Sincronizar C\xF3digo Agora"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("main", { className: "flex-1 overflow-visible mb-6 flex flex-col w-full relative", children: [
            !systemState?.systemActive ? /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] border border-zinc-900 rounded-2xl", children: [
              /* @__PURE__ */ jsx("div", { className: "w-16 h-16 mb-4 rounded-full border-4 border-zinc-800/40 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "w-4 h-4 rounded-full bg-zinc-600" }) }),
              /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold font-sans tracking-widest text-zinc-500 uppercase", children: "Sistema Hibernado" }),
              /* @__PURE__ */ jsx("p", { className: "text-zinc-600 font-mono text-xs mt-2 max-w-sm text-center", children: "Todos os containers, modelos Groq e processos de IA foram pausados com sucesso para economizar processamento e mem\xF3ria RAM no host." }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: async () => {
                    try {
                      await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
                      fetchSystemState();
                    } catch (e) {
                      console.error("Failed to toggle system", e);
                    }
                  },
                  className: "mt-8 px-6 py-2 hover-glow bg-[var(--brand-primary)] border border-[var(--brand-light)] text-white hover:bg-[var(--brand-light)] hover:text-black font-bold uppercase tracking-wider rounded font-mono shadow-[0_0_15px_var(--brand-glow-strong)] transition-all cursor-pointer",
                  children: "\u{1F680} Ligar JARVIS"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "mt-8 pt-6 border-t border-zinc-900/50 flex flex-col items-center", children: [
                /* @__PURE__ */ jsx("span", { className: "text-xs text-zinc-700 font-mono uppercase tracking-widest", children: "Recursos em Repouso" }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-4 mt-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40", children: "4GB VRAM (CUDA)" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40", children: "Docker Subnet" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40", children: "Websockets IoT" })
                ] })
              ] })
            ] }) : null,
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `flex-1 transition-opacity duration-500 relative ${!systemState?.systemActive ? "opacity-0 pointer-events-none" : "opacity-100"}`,
                children: /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsxs(
                  motion.div,
                  {
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -10 },
                    transition: { duration: 0.2, ease: "easeOut" },
                    className: "w-full",
                    children: [
                      activeTab === "dashboard" && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-6", children: [
                        /* @__PURE__ */ jsxs("div", { className: "xl:col-span-3 space-y-6", children: [
                          /* @__PURE__ */ jsx("div", { className: `p-1 rounded-xl border transition-colors ${"bg-zinc-950/20 border-zinc-900"}`, children: /* @__PURE__ */ jsx(
                            JarvisAssistant,
                            {
                              conversations: systemState?.conversations || [],
                              onSendMessage: onSendMessageStable
                            }
                          ) }),
                          /* @__PURE__ */ jsxs("div", { className: "holographic-card p-5", children: [
                            /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/40 pb-3 mb-4", children: [
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsxs("h3", { className: "text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase flex items-center gap-1.5", children: [
                                  /* @__PURE__ */ jsx(Home, { className: "h-4 w-4" }),
                                  "Dom\xF3tica Residencial (Home Assistant Cores)"
                                ] }),
                                /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Sincronizado via IP Local da M\xE1quina com Zigbee e Matter" })
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 font-mono text-xs", children: ["Modo Trabalho", "Modo Cinema", "Modo Noturno"].map(
                                (p) => /* @__PURE__ */ jsx(
                                  "button",
                                  {
                                    onClick: () => triggerPresetChange(p),
                                    className: `px-2.5 py-1 rounded border transition-all cursor-pointer ${selectedPreset === p ? "bg-[var(--brand-dark)] border-[var(--brand-primary)] text-[var(--brand-light)] font-bold" : "bg-zinc-950/40 border-zinc-800/40 text-zinc-500 hover:text-zinc-300"}`,
                                    children: p
                                  },
                                  p
                                )
                              ) })
                            ] }),
                            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: systemState?.homeAssistant?.devices?.filter((d) => !systemState?.homeAssistant?.hiddenDevices?.includes(d.id)).map(
                              (device) => /* @__PURE__ */ jsxs(
                                "div",
                                {
                                  className: `p-3 rounded-xl border transition-all flex flex-col justify-between ${device.state === "on" ? "bg-[var(--brand-dark)] border-[var(--brand-border)]" : "bg-zinc-950/40 border-zinc-900/60 text-zinc-500"}`,
                                  children: [
                                    /* @__PURE__ */ jsxs("div", { children: [
                                      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                                        /* @__PURE__ */ jsx("span", { className: "text-xs font-mono tracking-wider block uppercase", children: device.type }),
                                        /* @__PURE__ */ jsx(
                                          "button",
                                          {
                                            onClick: () => toggleDeviceState(device.id, device.state),
                                            className: `w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out cursor-pointer relative flex items-center shrink-0 active:scale-90 hover:brightness-110 shadow-inner ${device.state === "on" ? "bg-[var(--brand-primary,rgb(6,182,212))] shadow-[0_0_10px_var(--brand-primary,rgba(6,182,212,0.45))]" : "bg-zinc-800 border border-zinc-700/35"}`,
                                            title: device.state === "on" ? "Desligar" : "Ligar",
                                            children: /* @__PURE__ */ jsx(
                                              "div",
                                              {
                                                className: `bg-zinc-950 w-4.5 h-4.5 rounded-full shadow-inner transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1.2)] flex items-center justify-center ${device.state === "on" ? "transform translate-x-5" : "transform translate-x-0"}`,
                                                children: /* @__PURE__ */ jsx(
                                                  "div",
                                                  {
                                                    className: `w-1.5 h-1.5 rounded-full transition-all duration-300 ${device.state === "on" ? "bg-[var(--brand-light,rgb(6,182,212))] animate-pulse" : "bg-zinc-650"}`
                                                  }
                                                )
                                              }
                                            )
                                          }
                                        )
                                      ] }),
                                      /* @__PURE__ */ jsxs("div", { className: "mt-2.5", children: [
                                        /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-zinc-200 block", children: device.name }),
                                        /* @__PURE__ */ jsx("span", { className: "text-xs font-mono opacity-80 block mt-0.5", children: device.status })
                                      ] })
                                    ] }),
                                    device.type === "light" && device.state === "on" && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-2 pt-2 border-t border-zinc-500/20", children: [
                                      /* @__PURE__ */ jsx(
                                        "input",
                                        {
                                          type: "range",
                                          min: "1",
                                          max: "100",
                                          className: "w-full accent-[var(--brand-primary)] h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer",
                                          value: device.brightness || 100,
                                          onChange: (e) => fetch(getServerUrl() + "/api/update/iot", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ deviceId: device.id, brightness: parseInt(e.target.value) })
                                          })
                                        }
                                      ),
                                      /* @__PURE__ */ jsx(
                                        "input",
                                        {
                                          type: "color",
                                          className: "w-4 h-4 p-0 border-0 bg-transparent rounded cursor-pointer shrink-0",
                                          value: device.color || "#FFFFFF",
                                          onChange: (e) => fetch(getServerUrl() + "/api/update/iot", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ deviceId: device.id, color: e.target.value })
                                          })
                                        }
                                      )
                                    ] })
                                  ]
                                },
                                device.id
                              )
                            ) })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
                          /* @__PURE__ */ jsx(SystemHealthMonitor, {}),
                          /* @__PURE__ */ jsxs("div", { className: "holographic-card p-4 space-y-4", children: [
                            /* @__PURE__ */ jsx("h3", { className: "text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase border-l border-[var(--brand-primary)] pl-2", children: "Pipeline de Deploy" }),
                            /* @__PURE__ */ jsxs("div", { className: "space-y-3 font-mono", children: [
                              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-zinc-400", children: "1. Ambiente WSL2 / Docker" }),
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: systemState?.installer?.modules?.docker?.status === "completed" ? "text-emerald-400" : "text-zinc-500",
                                    children: systemState?.installer?.modules?.docker?.status === "completed" ? "Pronto" : "Ok"
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "w-full bg-zinc-950 h-1 rounded overflow-hidden", children: /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: "bg-[var(--brand-primary)] h-full transition-all",
                                  style: {
                                    width: `${systemState?.installer?.modules?.docker?.progress || 100}%`
                                  }
                                }
                              ) }),
                              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-zinc-400", children: "2. Obsidian Vault Base" }),
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: systemState?.installer?.modules?.obsidian?.status === "completed" ? "text-emerald-400" : "text-zinc-500",
                                    children: systemState?.installer?.modules?.obsidian?.status === "completed" ? "Estruturado" : "Ok"
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "w-full bg-zinc-950 h-1 rounded overflow-hidden", children: /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: "bg-[var(--brand-primary)] h-full transition-all",
                                  style: {
                                    width: `${systemState?.installer?.modules?.obsidian?.progress || 100}%`
                                  }
                                }
                              ) }),
                              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
                                /* @__PURE__ */ jsx("span", { className: "text-zinc-400", children: "3. Workflows n8n" }),
                                /* @__PURE__ */ jsx(
                                  "span",
                                  {
                                    className: systemState?.installer?.modules?.n8n?.status === "completed" ? "text-emerald-400" : "text-zinc-500",
                                    children: systemState?.installer?.modules?.n8n?.status === "completed" ? "Online" : "Ok"
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "w-full bg-zinc-950 h-1 rounded overflow-hidden", children: /* @__PURE__ */ jsx(
                                "div",
                                {
                                  className: "bg-[var(--brand-primary)] h-full transition-all",
                                  style: {
                                    width: `${systemState?.installer?.modules?.n8n?.progress || 100}%`
                                  }
                                }
                              ) })
                            ] })
                          ] }),
                          /* @__PURE__ */ jsx(HardwareProcessingMonitor, { setActiveTab, setSettingsTab }),
                          /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-[var(--brand-dark)] to-blue-950/20 border border-[var(--brand-border)] p-4.5 rounded-2xl space-y-3", children: [
                            /* @__PURE__ */ jsxs("h4", { className: "text-xs font-mono font-bold text-white uppercase flex items-center gap-1", children: [
                              /* @__PURE__ */ jsx(Zap, { className: "h-3.5 w-3.5 text-yellow-400" }),
                              "Atalhos de Simula\xE7\xE3o"
                            ] }),
                            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-400 leading-relaxed", children: "Envie gatilhos simulando comandos do PC e voz ao JARVIS para ver o console operar comandos complexos:" }),
                            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1.5 font-mono text-xs", children: [
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  onClick: () => handleSendMessage(
                                    "Preparar meu ambiente de estudos no PC principal"
                                  ),
                                  className: "w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800/40 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center",
                                  children: [
                                    /* @__PURE__ */ jsx("span", { children: "\u{1F4DA} Modo Estudos (Macro PC)" }),
                                    /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  onClick: () => handleSendMessage(
                                    "Quanto gastei na minha categoria de Alimenta\xE7\xE3o este m\xEAs?"
                                  ),
                                  className: "w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800/40 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center",
                                  children: [
                                    /* @__PURE__ */ jsx("span", { children: "\u{1F4B3} Consulta de iFood (RAG / DB)" }),
                                    /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxs(
                                "button",
                                {
                                  onClick: () => handleSendMessage(
                                    "Como est\xE1 meu briefing de agenda para amanh\xE3?"
                                  ),
                                  className: "w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800/40 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center",
                                  children: [
                                    /* @__PURE__ */ jsx("span", { children: "\u{1F4C5} Eventos Agendados" }),
                                    /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
                                  ]
                                }
                              )
                            ] })
                          ] })
                        ] })
                      ] }),
                      activeTab === "finance" && /* @__PURE__ */ jsx(
                        FinanceDashboard,
                        {
                          systemState,
                          fetchSystemState,
                          handleExportPDF,
                          handleFileUpload,
                          handleDeleteFinance,
                          handleDeleteGoal
                        }
                      ),
                      activeTab === "agenda" && /* @__PURE__ */ jsx("div", { className: "space-y-6 animate-fade-in", children: /* @__PURE__ */ jsxs("div", { className: "holographic-card p-5 flex flex-col xl:flex-row gap-6", children: [
                        /* @__PURE__ */ jsxs("div", { className: "w-full xl:w-1/3 flex flex-col gap-6", children: [
                          /* @__PURE__ */ jsx("div", { className: "flex justify-between items-center mb-1", children: /* @__PURE__ */ jsxs("h3", { className: "text-xs font-mono font-medium text-[var(--brand-light)] uppercase flex items-center gap-1.5 border-b border-[var(--brand-dark)] pb-2 mb-2 w-full", children: [
                            /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4" }),
                            "Lan\xE7amento de Agenda"
                          ] }) }),
                          /* @__PURE__ */ jsxs(
                            "form",
                            {
                              onSubmit: handleAgendaSubmit,
                              className: "space-y-3 bg-zinc-950 border border-zinc-800/40 p-4 rounded-xl flex-1",
                              children: [
                                /* @__PURE__ */ jsx("h4", { className: "text-[11px] text-zinc-400 font-mono mb-2", children: "Agendar novo compromisso" }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  /* @__PURE__ */ jsx("label", { className: "text-xs text-zinc-500 block mb-1", children: "T\xEDtulo do Evento" }),
                                  /* @__PURE__ */ jsx(
                                    "input",
                                    {
                                      type: "text",
                                      required: true,
                                      value: agendaForm.title,
                                      onChange: (e) => setAgendaForm({
                                        ...agendaForm,
                                        title: e.target.value
                                      }),
                                      placeholder: "Reuni\xE3o com os Investidores",
                                      className: "w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  /* @__PURE__ */ jsx("label", { className: "text-xs text-zinc-500 block mb-1", children: "Data e Hora" }),
                                  /* @__PURE__ */ jsx(
                                    "input",
                                    {
                                      type: "datetime-local",
                                      required: true,
                                      value: agendaForm.datetime,
                                      onChange: (e) => setAgendaForm({
                                        ...agendaForm,
                                        datetime: e.target.value
                                      }),
                                      className: "w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] [color-scheme:dark]"
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  /* @__PURE__ */ jsx("label", { className: "text-xs text-zinc-500 block mb-1", children: "Categoria" }),
                                  /* @__PURE__ */ jsxs(
                                    "select",
                                    {
                                      value: agendaForm.category,
                                      onChange: (e) => setAgendaForm({
                                        ...agendaForm,
                                        category: e.target.value
                                      }),
                                      className: "w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]",
                                      children: [
                                        /* @__PURE__ */ jsx("option", { value: "Trabalho", children: "Trabalho" }),
                                        /* @__PURE__ */ jsx("option", { value: "Pessoal", children: "Pessoal" }),
                                        /* @__PURE__ */ jsx("option", { value: "Estudos", children: "Estudos" })
                                      ]
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  /* @__PURE__ */ jsx("label", { className: "text-xs text-zinc-500 block mb-1", children: "Anota\xE7\xF5es (Extra\xEDdas ou Manual)" }),
                                  /* @__PURE__ */ jsx(
                                    "textarea",
                                    {
                                      rows: 2,
                                      value: agendaForm.notes,
                                      onChange: (e) => setAgendaForm({
                                        ...agendaForm,
                                        notes: e.target.value
                                      }),
                                      className: "w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] placeholder-zinc-700",
                                      placeholder: "Levar documenta\xE7\xE3o atualizada..."
                                    }
                                  )
                                ] }),
                                /* @__PURE__ */ jsx(
                                  "button",
                                  {
                                    type: "submit",
                                    className: "w-full mt-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-light)] border border-[var(--brand-border)] text-white shadow-[0_0_10px_var(--brand-glow-strong)] rounded py-2 text-xs font-mono uppercase tracking-wider transition-all",
                                    children: "Salvar Compromisso"
                                  }
                                )
                              ]
                            }
                          ),
                          /* @__PURE__ */ jsxs("div", { className: "bg-zinc-950 border border-zinc-800/40 p-4 rounded-xl text-center", children: [
                            /* @__PURE__ */ jsx("h4", { className: "text-[11px] text-zinc-300 font-mono mb-2", children: "Adi\xE7\xE3o por Arquivos via IA" }),
                            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 mb-3", children: "Suba um PDF de calend\xE1rio acad\xEAmico, voo, ou roteiro para IA agendar automaticamente." }),
                            /* @__PURE__ */ jsxs("label", { className: "cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-[11px] font-mono py-1.5 px-3 rounded transition-all block", children: [
                              "\u{1F4E4} Upload de Arquivo (PDF/CSV)",
                              /* @__PURE__ */ jsx(
                                "input",
                                {
                                  type: "file",
                                  className: "hidden transition-all duration-300 hover:border-zinc-600 focus:shadow-sm group-hover:shadow-[0_0_15px_var(--brand-glow)] transition-all",
                                  onChange: (e) => handleFileUpload(e, "Agenda"),
                                  accept: ".pdf,.txt,.ics"
                                }
                              )
                            ] })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "w-full xl:w-2/3 border-t xl:border-t-0 xl:border-l border-zinc-800/40 xl:pl-6 pt-6 xl:pt-0", children: [
                          /* @__PURE__ */ jsx("h3", { className: "text-xs font-mono font-medium text-zinc-300 uppercase tracking-widest pl-2 border-l-2 border-[var(--brand-primary)] mb-4", children: "Compromissos Registrados" }),
                          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 font-mono w-full", children: [
                            systemState?.agenda?.map((item) => /* @__PURE__ */ jsxs(
                              "div",
                              {
                                className: "bg-zinc-950 p-4 rounded-xl border border-zinc-800/40 flex flex-col h-full hover:border-zinc-700 transition duration-300",
                                children: [
                                  /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start mb-2", children: [
                                    /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-[var(--brand-dark)] border border-[var(--brand-border)] text-xs text-[var(--brand-light)] rounded", children: item.category }),
                                    /* @__PURE__ */ jsx(
                                      "button",
                                      {
                                        onClick: () => handleDeleteAgenda(item.title),
                                        className: "text-zinc-600 hover:text-red-500 transition-colors",
                                        children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" })
                                      }
                                    )
                                  ] }),
                                  /* @__PURE__ */ jsx("h4", { className: "text-xs font-semibold text-white mt-1 line-clamp-2", children: item.title }),
                                  /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500 pt-2 pb-2 mb-auto mt-2 border-y border-zinc-900 leading-relaxed overflow-hidden text-clip whitespace-pre-wrap", children: item.notes || "Sem anota\xE7\xF5es complementares." }),
                                  /* @__PURE__ */ jsxs("div", { className: "text-xs font-medium mt-3 text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded flex items-center justify-between", children: [
                                    /* @__PURE__ */ jsx("span", { children: new Date(item.datetime).toLocaleDateString(
                                      "pt-BR"
                                    ) }),
                                    /* @__PURE__ */ jsx("span", { children: new Date(item.datetime).toLocaleTimeString(
                                      "pt-BR",
                                      { hour: "2-digit", minute: "2-digit" }
                                    ) })
                                  ] })
                                ]
                              },
                              item.id
                            )),
                            (!systemState?.agenda || systemState?.agenda.length === 0) && /* @__PURE__ */ jsx("div", { className: "col-span-2 text-center text-zinc-600 text-xs py-10 border border-dashed border-zinc-800/40 rounded-xl", children: "Nenhum compromisso cadastrado para o per\xEDodo." })
                          ] })
                        ] })
                      ] }) }),
                      activeTab === "settings" && /* @__PURE__ */ jsxs("div", { className: "flex h-[calc(100vh-140px)] w-full overflow-hidden border border-zinc-800/40 rounded-xl bg-black/20 animate-fade-in relative z-10 shadow-2xl", children: [
                        /* @__PURE__ */ jsxs("div", { className: "w-56 shrink-0 border-r border-zinc-800/40 bg-zinc-950/50 flex flex-col overflow-y-auto custom-scrollbar", children: [
                          /* @__PURE__ */ jsx("div", { className: "p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/40 bg-black/40", children: "Sistema" }),
                          /* @__PURE__ */ jsxs("div", { className: "flex flex-col p-2 gap-1 font-mono text-xs", children: [
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("general"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "general" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u2699\uFE0F Configura\xE7\xF5es & IoT"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("appearance"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "appearance" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F3A8} Apar\xEAncia"
                              }
                            ),
                            /* @__PURE__ */ jsxs(
                              "button",
                              {
                                onClick: () => setSettingsTab("updates"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap relative ${settingsTab === "updates" ? "bg-cyan-500/20 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: [
                                  "\u{1F504} Atualiza\xE7\xF5es",
                                  updateState?.status === "available" && /* @__PURE__ */ jsx("span", { className: "absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" })
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("tokens"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "tokens" ? "bg-amber-500/20 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)] border border-amber-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F510} Senhas & Tokens"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsx("div", { className: "p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800/40 mt-2 bg-black/40", children: "Workspace & IA" }),
                          /* @__PURE__ */ jsxs("div", { className: "flex flex-col p-2 gap-1 font-mono text-xs", children: [
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("obsidian"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "obsidian" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F4CA} Google Sheets DB"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("mcp"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "mcp" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F50C} Integra\xE7\xE3o MCP"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("cudautil"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "cudautil" ? "bg-indigo-500/20 text-indigo-400 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F4CA} Telemetria CUDA"
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsx("div", { className: "p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800/40 mt-2 bg-black/40", children: "Manuten\xE7\xE3o" }),
                          /* @__PURE__ */ jsxs("div", { className: "flex flex-col p-2 gap-1 font-mono text-xs", children: [
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("installer"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "installer" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F4E6} Core Engine & Logs"
                              }
                            ),
                            /* @__PURE__ */ jsx(
                              "button",
                              {
                                onClick: () => setSettingsTab("packager"),
                                className: `px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "packager" ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"}`,
                                children: "\u{1F4E6} Gerar Instalador"
                              }
                            )
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-4 md:p-6 bg-black/[0.15] custom-scrollbar", children: [
                          settingsTab === "packager" && /* @__PURE__ */ jsx(PackagerModule, {}),
                          (settingsTab === "general" || settingsTab === "appearance") && /* @__PURE__ */ jsx(
                            DeviceConfig,
                            {
                              devices: systemState?.homeAssistant?.devices || [],
                              onRefresh: onRefreshStable,
                              currentTheme,
                              onChangeTheme: changeTheme,
                              configTab: settingsTab
                            }
                          ),
                          settingsTab === "installer" && /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
                            /* @__PURE__ */ jsx(LogsDocker, {}),
                            /* @__PURE__ */ jsx("div", { className: "bg-zinc-950/10 border border-zinc-900 p-1 rounded-xl", children: /* @__PURE__ */ jsx(
                              Installer,
                              {
                                installerState: systemState?.installer,
                                onRefresh: onRefreshStable
                              }
                            ) })
                          ] }),
                          settingsTab === "updates" && /* @__PURE__ */ jsx(
                            SystemUpdater,
                            {
                              updateState,
                              onRefresh: onUpdateRefreshStable
                            }
                          ),
                          settingsTab === "obsidian" && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-6 font-mono", children: [
                            /* @__PURE__ */ jsxs("div", { className: "holographic-card p-4 space-y-3", children: [
                              /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-[var(--brand-light)] uppercase tracking-widest pl-2 border-l border-[var(--brand-primary)] mb-4 animate-pulse", children: "Google Sheets Mem\xF3ria" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-zinc-400 leading-normal mb-3", children: [
                                "A IA estrutura e armazena os dados atrav\xE9s de planilhas.",
                                " ",
                                /* @__PURE__ */ jsx("code", { className: "text-xs text-lime-400 font-bold bg-zinc-950 border border-zinc-900 px-1 rounded", children: "Sync Auto" }),
                                " "
                              ] }),
                              /* @__PURE__ */ jsx("div", { className: "space-y-1.5 text-xs", children: systemState?.googleSheetsData?.map((sheet) => /* @__PURE__ */ jsxs(
                                "div",
                                {
                                  className: "w-full text-left p-2.5 rounded-lg border border-zinc-800/40 bg-zinc-950 hover:bg-zinc-900/80 transition text-zinc-300 block hover:border-[var(--brand-border)] text-[11px] cursor-pointer",
                                  children: [
                                    /* @__PURE__ */ jsxs("span", { className: "block font-bold text-white text-xs text-emerald-400", children: [
                                      "\u{1F4CA} ",
                                      sheet.spreadsheet,
                                      " - ",
                                      sheet.sheet
                                    ] }),
                                    /* @__PURE__ */ jsxs("span", { className: "block text-xs text-zinc-500 truncate mt-0.5", children: [
                                      sheet.rows?.length || 0,
                                      " Registros"
                                    ] })
                                  ]
                                },
                                sheet.sheet + sheet.spreadsheet
                              )) })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { className: "lg:col-span-3 bg-zinc-900/50 border border-zinc-800/40 p-5 rounded-2xl flex flex-col justify-between", children: [
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("div", { className: "flex justify-between items-center border-b border-zinc-800/40 pb-3 mb-4", children: /* @__PURE__ */ jsxs("div", { children: [
                                  /* @__PURE__ */ jsx("h3", { className: "text-xs font-bold text-white uppercase pr-2", children: "Visualizando Tabelas Relacionais do Cerebro" }),
                                  /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Google Sheets OAuth (Pr\xF3ximo M\xF3dulo)" })
                                ] }) }),
                                /* @__PURE__ */ jsx("div", { className: "space-y-4", children: systemState?.googleSheetsData?.map(
                                  (sheet, index) => /* @__PURE__ */ jsxs(
                                    "div",
                                    {
                                      className: "bg-black/40 border border-zinc-800/40 rounded-xl p-4 group",
                                      children: [
                                        /* @__PURE__ */ jsx("div", { className: "text-xs font-bold text-emerald-400 mb-2 font-mono flex items-center justify-between", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                                          /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-400" }),
                                          sheet.spreadsheet,
                                          " > ",
                                          sheet.sheet
                                        ] }) }),
                                        /* @__PURE__ */ jsx("div", { className: "bg-zinc-950 text-xs font-mono text-zinc-350 p-3 rounded-lg border border-zinc-900 leading-loose overflow-x-auto", children: sheet.rows?.map((r, i) => /* @__PURE__ */ jsx("div", { className: "border-b border-zinc-800/40 pb-1 mb-1 last:border-0", children: r }, i)) })
                                      ]
                                    },
                                    index
                                  )
                                ) })
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "border-t border-zinc-800/40 pt-3 mt-4 text-xs text-zinc-500 leading-normal", children: [
                                "\u{1F4A1} ",
                                /* @__PURE__ */ jsx("strong", { children: "Dica do JARVIS:" }),
                                " Todas as informa\xE7\xF5es estruturadas (metas, prefer\xEAncias, agendamentos longos) agora s\xE3o guardadas na API do Sheets. Caso o OAuth n\xE3o conclua, as informa\xE7\xF5es ficar\xE3o apenas na mem\xF3ria do MOCK e sincronizadas com a UI do sistema local."
                              ] })
                            ] })
                          ] }),
                          settingsTab === "mcp" && /* @__PURE__ */ jsx(MCPSettings, {}),
                          settingsTab === "cudautil" && /* @__PURE__ */ jsx(CUDATelemetryHUD, {}),
                          settingsTab === "tokens" && /* @__PURE__ */ jsx(TokensManager, {})
                        ] })
                      ] }),
                      activeTab === "diagnostics" && /* @__PURE__ */ jsx("div", { className: "space-y-6 flex flex-col h-full overflow-hidden", children: /* @__PURE__ */ jsx(SSHDiagnostics, {}) }),
                      activeTab === "readme" && /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans leading-relaxed text-zinc-300", children: [
                        /* @__PURE__ */ jsxs("div", { className: "holographic-card p-5 space-y-4", children: [
                          /* @__PURE__ */ jsx("h3", { className: "text-xs font-mono font-bold tracking-wider text-[var(--brand-light)] uppercase border-l border-[var(--brand-primary)] pl-2", children: "Guia Definitivo: Deploy Completo (Windows)" }),
                          /* @__PURE__ */ jsxs("div", { className: "font-sans text-[11px] space-y-4", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("strong", { className: "text-white block mb-1 text-xs", children: "1. Deploy Inicial no Servidor (Windows)" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-500 mb-2 leading-relaxed", children: [
                                "Abra o PowerShell do seu servidor. Atualize o reposit\xF3rio com ",
                                /* @__PURE__ */ jsx("code", { className: "bg-zinc-950 px-1 py-0.5 rounded text-white font-mono", children: "git pull" }),
                                '. Em seguida, na aba lateral "Instalador", baixe o AutoInstaller.ps1 e execute como Administrador. ',
                                /* @__PURE__ */ jsx("br", {}),
                                /* @__PURE__ */ jsx("code", { className: "bg-zinc-950 px-1 py-0.5 rounded text-[var(--brand-light)] font-mono", children: "./AutoInstaller.ps1" }),
                                /* @__PURE__ */ jsx("br", {}),
                                "Isso configurar\xE1 a pasta do Obsidian. Depois suba os servi\xE7os no Docker e inicie o backend usando Node. Acesse a porta ",
                                /* @__PURE__ */ jsx("strong", { children: "3000" }),
                                " no navegador."
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("strong", { className: "text-emerald-400 block mb-1 text-xs", children: "2. Banco de Dados e Containers" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-500 mb-2 leading-relaxed", children: [
                                "O script ",
                                /* @__PURE__ */ jsx("code", { className: "text-zinc-400 font-mono", children: ".ps1" }),
                                ' gerencia a ativa\xE7\xE3o que "levanta" as bases de dados nos bastidores. O banco de dados PostgreSQL guardar\xE1 suas tabelas relacionais de longo prazo nativamente e o reposit\xF3rio Obsidian atuar\xE1 injetando contexto no RAG do modelo principal - tudo j\xE1 orquestrado internamente para n\xE3o haver necessidade de configura\xE7\xE3o manual extra.'
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("strong", { className: "text-[var(--brand-light)] block mb-1 text-xs", children: "3. Intelig\xEAncia em 100% Cloud (Groq LPU)" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-500 mb-2 leading-relaxed", children: [
                                "Esque\xE7a Ollama! Economize energia usando LLMs ultrarr\xE1pidos atrav\xE9s do Groq Cloud. V\xE1 em ",
                                /* @__PURE__ */ jsx("strong", { children: "Chaves de APIs" }),
                                " no menu superior e preencha a Groq API Key obtida gratuitamente em ",
                                /* @__PURE__ */ jsx("a", { href: "https://console.groq.com", target: "_blank", className: "text-[var(--brand-light)] underline", children: "console.groq.com" }),
                                ". O JARVIS automaticamente mudar\xE1 o roteamento cognitivo usando ",
                                /* @__PURE__ */ jsx("code", { children: "llama-3.3-70b-versatile" }),
                                " para lhe responder na hora."
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("strong", { className: "text-white block mb-1 text-xs", children: "4. Voz (Edge TTS Gratuito)" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-500 mb-2 leading-relaxed", children: [
                                "Para a comunica\xE7\xE3o verbal responsiva, a infraestrutura ",
                                /* @__PURE__ */ jsx("strong", { children: "Microsoft Edge TTS" }),
                                ' \xE9 habilitada por padr\xE3o sem custo (via Node). Ao mandar comandos de voz no microfone central, o Assistente responder\xE1 em Portugu\xEAs-BR com uma voz realista ("Ant\xF4nio" ou "Francisca") sempre que o modo "Retorno de Voz" estiver ativo. Nenhum setup a mais \xE9 exigido.'
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsx("strong", { className: "text-rose-400 block mb-1 text-xs", children: "5. Conectando a Segunda Mem\xF3ria (Obsidian)" }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-500 leading-relaxed", children: [
                                "Agora instale o ",
                                /* @__PURE__ */ jsx("a", { href: "https://obsidian.md", target: "_blank", className: "text-rose-400 underline", children: "Obsidian" }),
                                " no seu PC usando a pasta que configuramos (ex ",
                                /* @__PURE__ */ jsx("code", { className: "text-xs text-zinc-400", children: "C:\\jarvis-vault" }),
                                "). O JARVIS ir\xE1 ler, vetorizar e escrever em ",
                                /* @__PURE__ */ jsx("code", { children: ".md" }),
                                " de forma invis\xEDvel. Suas anota\xE7\xF5es no celular agora conversar\xE3o com as anota\xE7\xF5es geradas via IA em tempo pseudo-real. E pronto, seu ecossistema est\xE1 vivo \u{1F680}."
                              ] })
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "bg-[var(--brand-dark)] border border-[var(--brand-border)] p-4.5 rounded-xl text-xs space-y-2", children: [
                            /* @__PURE__ */ jsx("span", { className: "text-[var(--brand-light)] font-mono font-bold block uppercase tracking-wider text-[11px]", children: "\u26A1 CUDA RENDERING PERFORMANCE" }),
                            /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-zinc-400", children: [
                              "O ",
                              hardwareStats?.cpu || "Notebook (Servidor)",
                              " utiliza a placa",
                              " ",
                              /* @__PURE__ */ jsxs("strong", { children: [
                                hardwareStats?.gpus?.[0]?.model || "NVIDIA GeForce GTX 1650",
                                " ",
                                "(",
                                hardwareStats?.gpus?.[0]?.vram ? Math.round(hardwareStats.gpus[0].vram / 1024) + "GB VRAM" : "4GB VRAM",
                                ")"
                              ] }),
                              ". Isso possibilita rodar o modelo Llama 3.3 com tempo de resposta inferior a ",
                              /* @__PURE__ */ jsx("strong", { children: "800ms por token" }),
                              " ",
                              "localmente."
                            ] }),
                            /* @__PURE__ */ jsx("div", { className: "w-full bg-zinc-950 h-2 rounded overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "bg-[var(--brand-primary)] h-full w-[85%]" }) })
                          ] })
                        ] }),
                        /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 bg-zinc-900/50 border border-zinc-800/40 p-6 rounded-2xl overflow-y-auto leading-relaxed text-xs space-y-5 shadow-inner", children: [
                          /* @__PURE__ */ jsxs("div", { className: "border-b border-zinc-800/40 pb-4", children: [
                            /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold text-white tracking-wide", children: "JARVIS v5.0 \u2014 Manual de Arquitetura" }),
                            /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-wider text-[var(--brand-light)] font-mono mt-1", children: "Sistemas de Assist\xEAncia Pessoal Local-First e Privado" })
                          ] }),
                          /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5", children: [
                                /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]" }),
                                "1. Como Funciona a Instala\xE7\xE3o Automatizada?"
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-300", children: [
                                "O aplicativo unificado do JARVIS atua como um",
                                " ",
                                /* @__PURE__ */ jsx("strong", { children: "provisionador de containers e downloads nativos" }),
                                '. Ao clicar em instalar na aba "Pipeline de Instala\xE7\xE3o":'
                              ] }),
                              /* @__PURE__ */ jsxs("ul", { className: "list-disc pl-5 mt-1.5 space-y-1 text-zinc-400 text-[11px]", children: [
                                /* @__PURE__ */ jsxs("li", { children: [
                                  "Ele instala o Docker Engine nativamente no terminal root do seu",
                                  " ",
                                  hardwareStats?.cpu || "Notebook (Servidor)",
                                  "."
                                ] }),
                                /* @__PURE__ */ jsxs("li", { children: [
                                  "Usa o ",
                                  /* @__PURE__ */ jsx("strong", { children: "PowerShell" }),
                                  " do Windows para instalar a estrutura do cofre e criar atalhos."
                                ] }),
                                /* @__PURE__ */ jsxs("li", { children: [
                                  "Cria a estrutura de pastas do seu Obsidian Vault no caminho f\xEDsico",
                                  " ",
                                  /* @__PURE__ */ jsx("code", { className: "text-yellow-400 text-xs", children: "C:\\jarvis-vault" }),
                                  "."
                                ] }),
                                /* @__PURE__ */ jsx("li", { children: "Popula os templates Markdown de controle financeiro, de agenda e de perfis no local." }),
                                /* @__PURE__ */ jsx("li", { children: "Integra e configura a API cognitiva ultraveloz do Groq Cloud." })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5", children: [
                                /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]" }),
                                "2. Detalhes de Implementa\xE7\xE3o T\xE9cnica"
                              ] }),
                              /* @__PURE__ */ jsxs("p", { className: "text-zinc-300", children: [
                                "Todo o projeto baseia-se em",
                                " ",
                                /* @__PURE__ */ jsx("strong", { children: "NodeJS, Docker, n8n de orquestra\xE7\xE3o e Groq LPU Cloud" }),
                                ":"
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 mt-2 font-mono text-xs", children: [
                                /* @__PURE__ */ jsxs("div", { className: "bg-zinc-950 p-2.5 rounded border border-zinc-900", children: [
                                  /* @__PURE__ */ jsx("strong", { className: "text-[var(--brand-light)] block mb-0.5", children: "Groq Cloud LPU" }),
                                  "Processamento cognitivo de alt\xEDssima velocidade na nuvem, poupando o consumo local de RAM/VRAM do host."
                                ] }),
                                /* @__PURE__ */ jsxs("div", { className: "bg-zinc-950 p-2.5 rounded border border-zinc-900", children: [
                                  /* @__PURE__ */ jsx("strong", { className: "text-[var(--brand-light)] block mb-0.5", children: "RAG & Google Sheets / Contexto" }),
                                  "O n8n monitora o ecossistema. Qualquer transa\xE7\xE3o ou anota\xE7\xE3o \xE9 processada e estruturada para sincroniza\xE7\xE3o e vetoriza\xE7\xE3o."
                                ] })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5", children: [
                                /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]" }),
                                "3. Comandos de Voz Suportados"
                              ] }),
                              /* @__PURE__ */ jsx("p", { className: "text-zinc-350", children: "O widget din\xE2mico de voz na tela aceita triggers em portugu\xEAs direto. Experimente falar ou digitar no terminal da HUD:" }),
                              /* @__PURE__ */ jsxs("div", { className: "bg-zinc-950/80 p-3 rounded-lg border border-zinc-900 text-zinc-400 font-mono text-xs space-y-1", children: [
                                /* @__PURE__ */ jsxs("div", { children: [
                                  "\u{1F3A4}",
                                  " ",
                                  /* @__PURE__ */ jsx("span", { className: "text-white", children: '"Ativar Modo Cinema"' }),
                                  " ",
                                  ": Apaga o ar, joga as luzes RGB pra Magenta e abre abas no PC."
                                ] }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  "\u{1F3A4}",
                                  " ",
                                  /* @__PURE__ */ jsx("span", { className: "text-white", children: '"Quanto gastei com iFood esse m\xEAs?"' }),
                                  " ",
                                  ": Busca sem\xE2ntica soma seus extratos de alimenta\xE7\xE3o."
                                ] }),
                                /* @__PURE__ */ jsxs("div", { children: [
                                  "\u{1F3A4}",
                                  " ",
                                  /* @__PURE__ */ jsx("span", { className: "text-white", children: '"Prepare meu ambiente de estudos"' }),
                                  " ",
                                  ": Abre Notion, ajusta Lo-Fi e limpa as notifica\xE7\xF5es."
                                ] })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { children: [
                              /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5", children: [
                                /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]" }),
                                "4. Modo Hiberna\xE7\xE3o (Modo Port\xE1til)"
                              ] }),
                              /* @__PURE__ */ jsxs("div", { className: "text-zinc-300 text-xs", children: [
                                'Para economizar recursos computacionais, clique em "Hibernar JARVIS" na bandeja. O app executar\xE1:',
                                /* @__PURE__ */ jsx("pre", { className: "bg-black p-2 rounded text-rose-400 font-mono text-xs mt-1.5", children: "docker compose pause" }),
                                "Isso congela a RAM e CPU liberando o desktop instantaneamente para uso m\xF3vel na faculdade ou trabalho!"
                              ] })
                            ] })
                          ] })
                        ] })
                      ] })
                    ]
                  },
                  activeTab
                ) })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("footer", { className: "pt-4 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-mono gap-3 shrink-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 md:gap-6 justify-center", children: [
              /* @__PURE__ */ jsx("span", { children: "SISTEMA: ONLINE" }),
              /* @__PURE__ */ jsx("span", { children: "SINAL TELEGRAM BOT: AGUARDANDO POLCHING" }),
              /* @__PURE__ */ jsx("span", { children: "DOCKER SUBNET: 172.18.0.0/16" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "LOCAL DEPLOYS: ",
                import.meta.env.VITE_OBSIDIAN_VAULT_PATH || "VAULT LOCAL"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }),
              /* @__PURE__ */ jsx("span", { className: "text-emerald-500 uppercase tracking-tighter", children: "Conex\xE3o Master Host: Ativa" })
            ] })
          ] })
        ] })
      ]
    }
  );
}
