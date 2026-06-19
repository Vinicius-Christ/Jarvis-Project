import { getServerUrl } from "./lib/api";
import PackagerModule from "./components/PackagerModule";
import React, { useState, useEffect, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Terminal,
  Activity,
  Calendar,
  DollarSign,
  BookOpen,
  Sliders,
  Clock,
  Home,
  Shield,
  Copy,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Database,
  Settings,
  Workflow,
  Code,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Installer from "./components/Installer";
import JarvisAssistant from "./components/JarvisAssistant";
import LogsDocker from "./components/LogsDocker";
import DeviceConfig from "./components/DeviceConfig";
import SystemUpdater from "./components/SystemUpdater";
import ChromaInspector from "./components/ChromaInspector";
import CUDATelemetryHUD from "./components/CUDATelemetryHUD";
import SSHDiagnostics from "./components/SSHDiagnostics";
import MCPSettings from "./components/MCPSettings";
import TokensManager from "./components/TokensManager";

const HOLO_THEMES = {
  cyan: {
    primary: "#06b6d4",
    light: "#22d3ee",
    glow: "rgba(6,182,212,0.05)",
    glowStrong: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.15)",
    dark: "rgba(6,182,212,0.05)",
  },
  amber: {
    primary: "#f59e0b",
    light: "#fbbf24",
    glow: "rgba(245,158,11,0.05)",
    glowStrong: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.15)",
    dark: "rgba(245,158,11,0.05)",
  },
  violet: {
    primary: "#8b5cf6",
    light: "#a78bfa",
    glow: "rgba(139,92,246,0.05)",
    glowStrong: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.15)",
    dark: "rgba(139,92,246,0.05)",
  },
  emerald: {
    primary: "#10b981",
    light: "#34d399",
    glow: "rgba(16,185,129,0.05)",
    glowStrong: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.15)",
    dark: "rgba(16,185,129,0.05)",
  },
  rose: {
    primary: "#f43f5e",
    light: "#fb7185",
    glow: "rgba(244,63,94,0.05)",
    glowStrong: "rgba(244,63,94,0.1)",
    border: "rgba(244,63,94,0.15)",
    dark: "rgba(244,63,94,0.05)",
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "finance" | "agenda" | "settings" | "readme" | "diagnostics"
  >("dashboard");
  const [settingsTab, setSettingsTab] = useState<
    | "general"
    | "appearance"
    | "installer"
    | "obsidian"
    | "logs"
    | "updates"
    | "chromadb"
    | "cudautil"
    | "mcp"
    | "tokens"
    | "packager"
  >("general");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [systemState, setSystemState] = useState<any>(null);
  const [hardwareStats, setHardwareStats] = useState<any>(null);
  const [timeStr, setTimeStr] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Modo Trabalho");

  // Motor de Auto-Atualização sem perda de dados
  const [updateState, setUpdateState] = useState<any>({
    status: "idle",
    progress: 0,
    localCommit: "",
    remoteCommit: "",
    remoteMessage: "",
    logs: [],
    githubRepo: "Vinicius-Christ/Jarvis-Project-",
  });

  const [financeForm, setFinanceForm] = useState({
    value: "",
    type: "Despesa",
    category: "Educação",
    description: "",
  });
  const [goalForm, setGoalForm] = useState({ limit: "", reason: "" });
  const [agendaForm, setAgendaForm] = useState({
    title: "",
    datetime: "",
    category: "Trabalho",
    notes: "",
  });

  const [currentTheme, setCurrentTheme] = useState<
    "cyan" | "amber" | "violet" | "emerald" | "rose"
  >(() => {
    try {
      const saved = localStorage.getItem("jarvis_holo_theme");
      if (
        saved &&
        ["cyan", "amber", "violet", "emerald", "rose"].includes(saved)
      ) {
        return saved as any;
      }
    } catch { /* ignore */ }
    return "violet";
  });

  const [healthStatus, setHealthStatus] = useState({
    docker: { status: "online", latency: 8 },
    groq: { status: "online", latency: 45 },
    network: { status: "online", latency: 12 },
    lastUpdated: new Date().toLocaleTimeString("pt-BR"),
  });

  const changeTheme = (
    theme: "cyan" | "amber" | "violet" | "emerald" | "rose",
  ) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem("jarvis_holo_theme", theme);
    } catch (e) { /* ignore */ }
  };

  // Health check loop polling every 10 seconds
  useEffect(() => {
    const runHealthCheck = async () => {
      try {
        const start = performance.now();
        const res = await fetch(getServerUrl() + "/api/system/health");
        const duration = Math.round(performance.now() - start);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setHealthStatus({
              docker: data.docker || { status: "online", latency: 7 },
              groq: data.groq || { status: "online", latency: 42 },
              network: { status: "online", latency: duration },
              lastUpdated: new Date().toLocaleTimeString("pt-BR"),
            });
          }
        }
      } catch (err: any) {
        if (err.message !== "Failed to fetch") {
          console.error("Falha ao ler telemetria de saúde:", err);
        }
      }
    };

    runHealthCheck();
    const timer = setInterval(runHealthCheck, 10000); // 10 seconds
    return () => clearInterval(timer);
  }, []);

  // Fetch updated records from backend
  const fetchSystemState = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/db");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setSystemState(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      }
    } catch (err) {
      // Ignorar erros transientes
    }
  };

  const fetchUpdateState = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/system/update/status");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setUpdateState(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      }
    } catch (err) { /* ignore */ }
  };

  const fetchHardwareStats = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/system/hardware");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setHardwareStats(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        }
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchSystemState();
    fetchHardwareStats();
    fetchUpdateState();

    // Auto check update once on startup
    fetch(getServerUrl() + "/api/system/update/check")
      .then(() => fetchUpdateState())
      .catch(() => {});

    // Poll state every 10 seconds to watch simulated live installation without spamming
    const interval = setInterval(() => {
      fetchSystemState();
      fetchUpdateState();
    }, 10000);
    const hwInterval = setInterval(() => {
      fetchHardwareStats();
    }, 3000); // 3 seconds for hardware to avoid spamming
    return () => {
      clearInterval(interval);
      clearInterval(hwInterval);
    };
  }, []);

  // Sync clock output to UTC and local presentation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("pt-BR", { hour12: false }) + " PT");
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Send interactive message to JARVIS core
  const handleSendMessage = async (
    text: string,
    file?: any,
    model?: string,
  ) => {
    try {
      const res = await fetch(getServerUrl() + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          file,
          model: model || "llama-3.3-70b-versatile",
        }),
      });
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("Invalid content-type from /api/chat");
      }

      // If there is an XML command embedded, synchronize it in backend
      if (data.text) {
        // Find all matches of <command type="..." ... />
        const cmdRegex = /<command\s+([^>]+)\/>/g;
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
            if (toMatch && toMatch[1]) setActiveTab(toMatch[1] as any);
            if (
              tabMatch &&
              tabMatch[1] &&
              toMatch &&
              toMatch[1] === "settings"
            ) {
              setSettingsTab(tabMatch[1] as any);
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
                  description: descMatch
                    ? descMatch[1]
                    : "Inserido via voz/anexo JARVIS",
                }),
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
                  category: "Trabalho",
                }),
              });
            }
          } else if (type === "PC") {
            const workspaceMatch = attributesStr.match(/workspace="([^"]+)"/);
            if (workspaceMatch) {
              await fetch(getServerUrl() + "/api/update/pc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace: workspaceMatch[1] }),
              });
            }
          } else if (type === "FinanceDelete") {
            const descMatch = attributesStr.match(/description="([^"]+)"/);
            if (descMatch) {
              await fetch(getServerUrl() + "/api/delete/finance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: descMatch[1] }),
              });
            }
          } else if (type === "AgendaDelete") {
            const titleMatch = attributesStr.match(/title="([^"]+)"/);
            if (titleMatch) {
              await fetch(getServerUrl() + "/api/delete/agenda", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: titleMatch[1] }),
              });
            }
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
                body: JSON.stringify({ path: pathMatch[1] }),
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
  useEffect(() => { handleSendMessageRef.current = handleSendMessage; }, [handleSendMessage]);

  const onSendMessageStable = useCallback((text: string, file?: any, model?: string) => {
    return handleSendMessageRef.current(text, file, model);
  }, []);

  const fetchSystemStateRef = useRef(fetchSystemState);
  useEffect(() => { fetchSystemStateRef.current = fetchSystemState; }, [fetchSystemState]);

  const onRefreshStable = useCallback(() => {
    return fetchSystemStateRef.current();
  }, []);

  const fetchUpdateStateRef = useRef(fetchUpdateState);
  useEffect(() => { fetchUpdateStateRef.current = fetchUpdateState; }, [fetchUpdateState]);

  const onUpdateRefreshStable = useCallback(() => {
    return fetchUpdateStateRef.current();
  }, []);

  // Change preset in Home Assistant
  const triggerPresetChange = async (presetName: string) => {
    try {
      await fetch(getServerUrl() + "/api/update/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetName }),
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle individual home lights or ar-condicionado
  const toggleDeviceState = async (deviceId: string, currentState: string) => {
    try {
      await fetch(getServerUrl() + "/api/update/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          state: currentState === "on" ? "off" : "on",
        }),
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };

  // Change individual note content inside simulated Obsidian
  const updateObsidianNote = async (path: string, newContent: string) => {
    try {
      await fetch(getServerUrl() + "/api/update/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: newContent }),
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
      systemState.finances.forEach((item: any) => {
        const val = typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0;
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
    reason: "Aposentadoria",
  };
  const guardado = financeStats.saldo;

  const [categoryLimits, setCategoryLimits] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    if (systemState?.obsidianNotes) {
      const metasNote = systemState.obsidianNotes.find((n: any) =>
        n.path.includes("metas.md"),
      );
      if (metasNote) {
        const limits: { [key: string]: number } = {};
        const lines = metasNote.content.split("\n");
        let parsingLimits = false;
        lines.forEach((line: string) => {
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
    const expenses: { [key: string]: number } = {};
    if (systemState?.finances) {
      systemState.finances.forEach((item: any) => {
        if (item.category !== "Renda") {
          const val = typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0;
          expenses[item.category] = (expenses[item.category] || 0) + val;
        }
      });
    }
    const data: any[] = [];
    const allCategories = new Set([
      ...Object.keys(categoryLimits),
      ...Object.keys(expenses),
    ]);
    allCategories.forEach((cat) => {
      data.push({
        category: cat,
        gasto: expenses[cat] || 0,
        limite: categoryLimits[cat] || 0,
      });
    });
    return data;
  }, [categoryLimits, systemState]);

  const savingsData = React.useMemo(() => {
    if (!systemState?.finances || systemState.finances.length === 0) {
      return [{ mes: "Atual", guardado: guardado }]; // Fallback
    }

    const grouped: {
      [key: string]: { mes: string; receitas: number; despesas: number };
    } = {};
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
      "Dez",
    ];

    systemState.finances.forEach((item: any) => {
      const d = new Date(item.date);
      const keyStr = monthNames[d.getMonth()];
      const sortKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;

      if (!grouped[sortKey])
        grouped[sortKey] = { mes: keyStr, receitas: 0, despesas: 0 };

      const val = typeof item.value === 'number' && !isNaN(item.value) ? item.value : 0;

      if (item.category === "Renda") {
        grouped[sortKey].receitas += val;
      } else {
        grouped[sortKey].despesas += val;
      }
    });

    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map((k) => ({
      mes: grouped[k].mes,
      guardado: grouped[k].receitas - grouped[k].despesas,
    }));
  }, [systemState?.finances, guardado]);

  const handleFinanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeForm.value || !financeForm.description) return;
    try {
      const categoryToUse =
        financeForm.type === "Receita" ? "Renda" : financeForm.category;

      await fetch(getServerUrl() + "/api/update/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parseFloat(financeForm.value),
          category: categoryToUse,
          description: financeForm.description,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      setFinanceForm({
        value: "",
        type: "Despesa",
        category: "Educação",
        description: "",
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.limit || !goalForm.reason) return;
    try {
      await fetch(getServerUrl() + "/api/update/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: parseFloat(goalForm.limit),
          reason: goalForm.reason,
        }),
      });
      setGoalForm({ limit: "", reason: "" });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleExportPDF = async () => {
    const el = document.getElementById("finance-report-area");
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("relatorio_financeiro_jarvis.pdf");
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };

  const handleAgendaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaForm.title || !agendaForm.datetime) return;
    try {
      await fetch(getServerUrl() + "/api/update/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: agendaForm.title,
          datetime: agendaForm.datetime,
          category: agendaForm.category,
          notes: agendaForm.notes,
        }),
      });
      setAgendaForm({
        title: "",
        datetime: "",
        category: "Trabalho",
        notes: "",
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleDeleteAgenda = async (title: string) => {
    try {
      await fetch(getServerUrl() + "/api/delete/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleDeleteFinance = async (description: string) => {
    try {
      await fetch(getServerUrl() + "/api/delete/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleDeleteGoal = async () => {
    try {
      await fetch(getServerUrl() + "/api/delete/goal", {
        method: "POST"
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };
  
  const handleDeleteObsidian = async (path: string) => {
    try {
      await fetch(getServerUrl() + "/api/delete/obsidian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSendMessage(
        `Analisar arquivo anexo e lançar em ${type}. [Arquivo recebido]`,
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
    "--brand-dark": activeHoloTheme.dark,
  } as React.CSSProperties;

  return (
    <div
      style={themeStyles}
      className={`w-full min-h-screen flex font-sans overflow-hidden select-none transition-all duration-300 bg-[size:20px_20px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] ${
        "dark bg-[#020408] text-zinc-300"
      }`}
    >
      {/* Sidebar Navigation */}
      <aside
        className={`glass-panel ${isSidebarOpen ? "w-64" : "w-16"} transition-all duration-300 flex flex-col border-r ${
          "border-zinc-900 bg-[#020408]"
        } shrink-0 z-20`}
      >
        <div className={`h-[73px] flex items-center justify-between p-4 border-b shrink-0 sticky top-0 bg-transparent ${
          "border-zinc-900 bg-[#020408]"
        } z-30`}>
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <Shield className="h-5 w-5 text-[var(--brand-light)] shrink-0" />
              <span className={`font-bold tracking-widest text-xs ${"text-white"}`}>
                JARVIS OS
              </span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg transition border shrink-0 ${
              isSidebarOpen ? "" : "mx-auto"
            } ${
              "bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border-transparent hover:border-zinc-700"
            }`}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--brand-light)]" />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 p-2 font-mono flex-1 overflow-y-auto overflow-x-hidden w-full">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "dashboard"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_4px_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Painel de Controle (HUD)"
          >
            <Sliders className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Painel de Controle</span>}
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "finance"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Financeiro"
          >
            <Database className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Financeiro</span>}
          </button>

          <button
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "agenda"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Agenda"
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Agenda</span>}
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "settings"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Configurações & IoT"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Configs & IoT</span>}
          </button>

          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "diagnostics"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Diagnósticos & SSH"
          >
            <Terminal className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Diagnósticos & SSH</span>}
          </button>

          <button
            onClick={() => setActiveTab("readme")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap w-full border ${
              activeTab === "readme"
                ? "bg-[var(--brand-glow)] text-[var(--brand-light)] border-[var(--brand-border)] font-bold shadow-[0_0_12px_var(--brand-glow-strong)]"
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-900/60"
            }`}
            title="Documentação Técnica (README)"
          >
            <Info className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Documentação</span>}
          </button>
        </nav>

        {/* Simple collapse indication / settings at bottom if wanted */}
        <div className={`p-3 flex justify-center font-mono text-[8px] tracking-widest shrink-0 mt-auto truncate w-full border-t ${
          "border-zinc-900 text-zinc-600"
        }`}>
          {isSidebarOpen ? "TERMINAL MESTRE" : "TM"}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto overflow-x-hidden p-4 md:p-6 w-full">
        {/* Immersive HUD Header Section */}
        <header className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4 mb-6 shrink-0 relative ${
          "border-zinc-900"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 border border-[var(--brand-border)] rounded-full flex items-center justify-center shadow-[0_4px_12px_var(--brand-glow-strong)] ${
              "bg-slate-950"
            }`}>
              <div
                className={`w-4-dot w-4 h-4 rounded-full ${systemState?.systemActive ? (systemState?.installer?.status === "installing" ? " bg-yellow-400" : "transition-opacity duration-300 bg-[var(--brand-light)]") : "bg-zinc-600"}`}
              ></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  id="main_title"
                  className={`text-2xl font-bold tracking-widest font-sans flex items-center gap-1.5 ${"text-white"}`}
                >
                  JARVIS{" "}
                  <span className="text-[var(--brand-light)]">CHRIST</span>
                </h1>
                <span className="text-[9px] bg-[var(--brand-glow)] text-[var(--brand-light)] px-2 py-0.5 rounded border border-[var(--brand-border)] font-mono">
                  v5.0-LOCAL
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--brand-light)]/70 font-semibold font-mono">
                Automated Deployment & AI Control System
              </p>
            </div>
          </div>

          {/* HUD Quick Info & Network status */}
          <div className="flex items-center gap-6 self-end md:self-auto">
            {/* System Shortcuts */}
            <div className="flex items-center gap-2">
              <a
                href="http://localhost:5678"
                target="_blank"
                rel="noreferrer"
                className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${
                  "border-zinc-800 bg-zinc-900"
                }`}
                title="Abrir n8n (Porta 5678)"
              >
                <Workflow className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" />
              </a>
              <a
                href="http://localhost:8123"
                target="_blank"
                rel="noreferrer"
                className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${
                  "border-zinc-800 bg-zinc-900"
                }`}
                title="Abrir Home Assistant (Porta 8123)"
              >
                <Home className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" />
              </a>
              <a
                href="/api-docs"
                target="_blank"
                rel="noreferrer"
                className={`w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[var(--brand-glow)] hover:border-[var(--brand-border)] hover:text-[var(--brand-light)] transition-all group ${
                  "border-zinc-800 bg-zinc-900"
                }`}
                title="Abrir JARVIS Web/Dev (Porta 3000)"
              >
                <Code className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[var(--brand-light)]" />
              </a>
            </div>

            <div className={`border-l pl-4 text-right font-mono ${"border-zinc-800"}`}>
              <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">
                Servidor {hardwareStats?.cpu || "Notebook (Servidor)"}
              </span>
              <div
                className={`flex items-center gap-1.5 justify-end text-xs ${systemState?.systemActive ? "opacity-100" : "opacity-30"} ${
                  "text-white"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${systemState?.systemActive ? "bg-emerald-500 " : "bg-zinc-500"}`}
                ></span>
                {hardwareStats?.gpus?.[0]?.model || "GTX 1650"} CUDA:{" "}
                {systemState?.systemActive ? "ATIVO" : "INATIVO"}
              </div>
            </div>
            <div className={`border-l pl-4 text-right font-mono ${"border-zinc-800"}`}>
              <span className="text-[9px] text-zinc-500 uppercase block tracking-wider">
                Estação Horária
              </span>
              <span
                id="digital_clock"
                className={`text-sm font-semibold tracking-widest flex items-center gap-1 ${
                  "text-white"
                }`}
              >
                <Clock className="h-3 w-3 text-[var(--brand-light)]" />
                {timeStr}
              </span>
            </div>
            <div className={`border-l pl-4 flex items-center justify-center ${"border-zinc-800"}`}>
              <button
                onClick={async () => {
                  try {
                    await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
                    fetchSystemState();
                  } catch (e) {
                    console.error("Failed to toggle system", e);
                  }
                }}
                className={`px-4 py-2 border rounded hover-glow font-mono text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95
                  ${
                    systemState?.systemActive
                      ? "bg-zinc-900 border-zinc-700 text-yellow-500 hover:bg-zinc-800"
                      : "bg-[var(--brand-primary)] border-[var(--brand-light)] text-white hover:bg-[var(--brand-light)] hover:text-black shadow-[0_2px_8px_var(--brand-glow-strong)]"
                  }
                `}
              >
                {systemState?.systemActive ? "Pausar JARVIS" : "Iniciar JARVIS"}
              </button>
            </div>
          </div>
        </header>

        {/* Holographic Notification Update Strip */}
        {updateState && updateState.status === "available" && (
          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-950/20 text-cyan-200 rounded-2xl font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.08)] transition-all">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400  shrink-0"></span>
              <div>
                <span className="font-bold text-white uppercase tracking-wider block sm:inline">
                  [🔄 ATUALIZAÇÃO REPOSITÓRIO]{" "}
                </span>
                <span>
                  Uma nova alteração de código-fonte foi sincronizada no Git
                  remoto. Commit:{" "}
                  <span className="text-cyan-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 font-bold">
                    {updateState.remoteCommit}
                  </span>{" "}
                  - "{updateState.remoteMessage}"
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab("settings");
                setSettingsTab("updates");
              }}
              className="px-4 py-1.5 hover-glow bg-cyan-500/15 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-500/50 text-cyan-300 font-bold tracking-wider rounded transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              Sincronizar Código Agora
            </button>
          </div>
        )}

        {/* Main Container Dashboard */}
        <main className="flex-1 overflow-visible mb-6 flex flex-col w-full relative">
          {!systemState?.systemActive ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] border border-zinc-900 rounded-2xl">
              <div className="w-16 h-16 mb-4 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-zinc-600"></span>
              </div>
              <h2 className="text-2xl font-bold font-sans tracking-widest text-zinc-500 uppercase">
                Sistema Hibernado
              </h2>
              <p className="text-zinc-600 font-mono text-xs mt-2 max-w-sm text-center">
                Todos os containers, modelos Groq e processos de IA foram
                pausados com sucesso para economizar processamento e memória RAM
                no host.
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
                    fetchSystemState();
                  } catch (e) {
                    console.error("Failed to toggle system", e);
                  }
                }}
                className="mt-8 px-6 py-2 hover-glow bg-[var(--brand-primary)] border border-[var(--brand-light)] text-white hover:bg-[var(--brand-light)] hover:text-black font-bold uppercase tracking-wider rounded font-mono shadow-[0_0_15px_var(--brand-glow-strong)] transition-all cursor-pointer"
              >
                🚀 Ligar JARVIS
              </button>
              <div className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col items-center">
                <span className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">
                  Recursos em Repouso
                </span>
                <div className="flex gap-4 mt-2">
                  <span className="text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800">
                    4GB VRAM (CUDA)
                  </span>
                  <span className="text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800">
                    Docker Subnet
                  </span>
                  <span className="text-[10px] bg-zinc-900/50 text-zinc-600 px-2.5 py-1 rounded border border-zinc-800">
                    Websockets IoT
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`flex-1 transition-opacity duration-500 ${!systemState?.systemActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            {/* TAB 1: HUD COCKPIT */}
            {activeTab === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Column 1 & 2: Main AI Voice Terminal Interface */}
                <div className="xl:col-span-3 space-y-6">
                  <div className={`p-1 rounded-xl border transition-colors ${
                    "bg-zinc-950/20 border-zinc-900"
                  }`}>
                    <JarvisAssistant
                      conversations={systemState?.conversations || []}
                      onSendMessage={onSendMessageStable}
                    />
                  </div>

                  {/* Home Assistant Quick IoT toggles */}
                  <div className="holographic-card p-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
                      <div>
                        <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase flex items-center gap-1.5">
                          <Home className="h-4 w-4" />
                          Domótica Residencial (Home Assistant Cores)
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                          Sincronizado via IP Local da Máquina com Zigbee e
                          Matter
                        </p>
                      </div>

                      {/* Presets dropdown style buttons */}
                      <div className="flex gap-1.5 font-mono text-[10px]">
                        {["Modo Trabalho", "Modo Cinema", "Modo Noturno"].map(
                          (p) => (
                            <button
                              key={p}
                              onClick={() => triggerPresetChange(p)}
                              className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                                selectedPreset === p
                                  ? "bg-[var(--brand-dark)] border-[var(--brand-primary)] text-[var(--brand-light)] font-bold"
                                  : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {systemState?.homeAssistant?.devices?.map(
                        (device: any) => (
                          <div
                            key={device.id}
                            className={`p-3 rounded-xl border transition-all ${
                              device.state === "on"
                                ? "bg-[var(--brand-dark)] border-[var(--brand-border)]"
                                : "bg-zinc-950/40 border-zinc-900/60 text-zinc-500"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-mono text-zinc-500 tracking-wider block uppercase">
                                {device.type}
                              </span>
                              <button
                                onClick={() =>
                                  toggleDeviceState(device.id, device.state)
                                }
                                className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out cursor-pointer relative flex items-center shrink-0 active:scale-90 hover:brightness-110 shadow-inner ${
                                  device.state === "on"
                                    ? "bg-[var(--brand-primary,rgb(6,182,212))] shadow-[0_0_10px_var(--brand-primary,rgba(6,182,212,0.45))]"
                                    : "bg-zinc-800 border border-zinc-700/35"
                                }`}
                                title={
                                  device.state === "on" ? "Desligar" : "Ligar"
                                }
                              >
                                <div
                                  className={`bg-zinc-950 w-4.5 h-4.5 rounded-full shadow-inner transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1.2)] flex items-center justify-center ${
                                    device.state === "on"
                                      ? "transform translate-x-5"
                                      : "transform translate-x-0"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${device.state === "on" ? "bg-[var(--brand-light,rgb(6,182,212))] animate-pulse" : "bg-zinc-650"}`}
                                  />
                                </div>
                              </button>
                            </div>
                            <div className="mt-2.5">
                              <span className="text-xs font-semibold text-zinc-200 block">
                                {device.name}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
                                {device.status}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 3: Telemetry, Pipeline preview, CPU graphics (HUD style sidebar) */}
                <div className="space-y-6">
                  {/* MONITOR DE SAÚDE DO SISTEMA (DOCKER, GROQ, REDE) */}
                  <div className="holographic-card p-4 space-y-4 shadow-[0_0_15px_var(--brand-glow)]">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <h3 className="text-xs font-mono font-bold tracking-widest text-[var(--brand-light)] uppercase flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-[var(--brand-light)] animate-pulse" />
                        Monitor de Saúde do Sistema
                      </h3>
                      <span className="text-[8px] bg-[var(--brand-glow)] border border-[var(--brand-border)] px-1.5 py-0.5 font-bold rounded font-mono text-[var(--brand-light)] animate-pulse">
                        LIVE (10s)
                      </span>
                    </div>

                    <div className="space-y-3.5 font-mono text-xs">
                      {/* Docker Latency */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Latência do Docker
                          </span>
                          <span className="font-bold text-[var(--brand-light)]">
                            {healthStatus.docker.latency} ms
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[var(--brand-primary)] h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(5, (healthStatus.docker.latency / 25) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Groq Latency */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Latência do Groq API
                          </span>
                          <span className="font-bold text-[var(--brand-light)]">
                            {healthStatus.groq.latency} ms
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[var(--brand-primary)] h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(5, (healthStatus.groq.latency / 120) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Network API Latency */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="text-zinc-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            API de Rede (RTT)
                          </span>
                          <span className="font-bold text-emerald-400">
                            {healthStatus.network.latency} ms
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(5, (healthStatus.network.latency / 120) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-zinc-500 pt-1 font-mono border-t border-zinc-900">
                      <span>WSL2 INTRAHOST</span>
                      <span>
                        ÚLTIMA ATUALIZAÇÃO: {healthStatus.lastUpdated}
                      </span>
                    </div>
                  </div>

                  {/* Mini Pipeline Progression tracking */}
                  <div className="holographic-card p-4 space-y-4">
                    <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase border-l border-[var(--brand-primary)] pl-2">
                      Pipeline de Deploy
                    </h3>
                    <div className="space-y-3 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">
                          1. Ambiente WSL2 / Docker
                        </span>
                        <span
                          className={
                            systemState?.installer?.modules?.docker?.status ===
                            "completed"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }
                        >
                          {systemState?.installer?.modules?.docker?.status ===
                          "completed"
                            ? "Pronto"
                            : "Ok"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden">
                        <div
                          className="bg-[var(--brand-primary)] h-full transition-all"
                          style={{
                            width: `${systemState?.installer?.modules?.docker?.progress || 100}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">
                          2. Obsidian Vault Base
                        </span>
                        <span
                          className={
                            systemState?.installer?.modules?.obsidian
                              ?.status === "completed"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }
                        >
                          {systemState?.installer?.modules?.obsidian?.status ===
                          "completed"
                            ? "Estruturado"
                            : "Ok"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden">
                        <div
                          className="bg-[var(--brand-primary)] h-full transition-all"
                          style={{
                            width: `${systemState?.installer?.modules?.obsidian?.progress || 100}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">
                          3. Modelos Llama 3.3
                        </span>
                        <span
                          className={
                            systemState?.installer?.modules?.ollama?.status ===
                            "completed"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }
                        >
                          {systemState?.installer?.modules?.ollama?.status ===
                          "completed"
                            ? "CUDA-Cache"
                            : "Ok"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden">
                        <div
                          className="bg-lime-500 h-full transition-all"
                          style={{
                            width: `${systemState?.installer?.modules?.ollama?.progress || 100}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">4. Workflows n8n</span>
                        <span
                          className={
                            systemState?.installer?.modules?.n8n?.status ===
                            "completed"
                              ? "text-emerald-400"
                              : "text-zinc-500"
                          }
                        >
                          {systemState?.installer?.modules?.n8n?.status ===
                          "completed"
                            ? "Online"
                            : "Ok"}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-950 h-1 rounded overflow-hidden">
                        <div
                          className="bg-[var(--brand-primary)] h-full transition-all"
                          style={{
                            width: `${systemState?.installer?.modules?.n8n?.progress || 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Spec monitors (simulating Native child monitoring threads) */}
                  <div className="holographic-card p-4 space-y-4">
                    <div className="flex justify-between items-center border-l border-[var(--brand-primary)] pl-2">
                      <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase">
                        Métricas de VRAM & Processamento
                      </h3>
                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          setSettingsTab("cudautil");
                        }}
                        className="text-[9px] text-zinc-500 hover:text-[var(--brand-light)] underline cursor-pointer uppercase font-mono"
                      >
                        HUD Detalhado
                      </button>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span
                            className="text-zinc-500 uppercase truncate max-w-[150px]"
                            title={
                              hardwareStats?.gpuModel || "Dispositivo CUDA"
                            }
                          >
                            GPU VRAM (
                            {hardwareStats?.gpuModel
                              ? hardwareStats.gpuModel
                                  .replace("NVIDIA GeForce", "")
                                  .trim()
                              : "Detectando..."}
                            )
                          </span>
                          <span className="text-[var(--brand-light)]">
                            {hardwareStats?.gpuVramUsed
                              ? `${(hardwareStats.gpuVramUsed / 1024).toFixed(1)} GB / ${(hardwareStats.gpuVramTotal ? hardwareStats.gpuVramTotal / 1024 : 12.0).toFixed(1)} GB`
                              : "4.2 GB / 12.0 GB"}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded overflow-hidden">
                          <div
                            className="bg-[var(--brand-primary)] h-full transition-all duration-500 animate-pulse"
                            style={{
                              width: `${hardwareStats?.gpuVramUsed ? Math.round((hardwareStats.gpuVramUsed / (hardwareStats.gpuVramTotal || 12288)) * 100) : 38}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-zinc-500 uppercase">
                            Temperatura GPU
                          </span>
                          <span className="text-red-400">
                            {hardwareStats?.gpuTemp || 58} °C (Seguro)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded overflow-hidden">
                          <div
                            className="h-full bg-red-500 transition-all cursor-pulse"
                            style={{
                              width: `${Math.min(100, Math.max(0, hardwareStats?.gpuTemp || 58))}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span
                            className="text-zinc-500 uppercase truncate max-w-[180px]"
                            title={hardwareStats?.cpu || "Host CPU"}
                          >
                            CPU (
                            {hardwareStats?.cpu
                              ? hardwareStats.cpu
                                  .replace("(TM)", "")
                                  .replace("(R)", "")
                                  .trim()
                              : "Detectando..."}
                            )
                          </span>
                          <span className="text-[var(--brand-light)]">
                            {hardwareStats?.cpuUsage || 38}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-950 h-1.5 rounded overflow-hidden">
                          <div
                            className="bg-[var(--brand-primary)] h-full opacity-70 transition-all duration-1000"
                            style={{
                              width: `${hardwareStats?.cpuUsage || 38}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-900 font-mono text-[10px] text-zinc-500 space-y-1">
                      <div className="flex justify-between">
                        <span>IP do Servidor</span>
                        <span className="text-zinc-300">{typeof window !== 'undefined' ? window.location.hostname : "localhost"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status de Conexão</span>
                        <span className="text-[var(--brand-primary)]">Túnel Ativo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ChromaDB Port</span>
                        <span className="text-zinc-300">8000</span>
                      </div>
                    </div>
                  </div>

                  {/* Fast triggers area */}
                  <div className="bg-gradient-to-r from-[var(--brand-dark)] to-blue-950/20 border border-[var(--brand-border)] p-4.5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-yellow-400" />
                      Atalhos de Simulação
                    </h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Envie gatilhos simulando comandos do PC e voz ao JARVIS
                      para ver o console operar comandos complexos:
                    </p>
                    <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                      <button
                        onClick={() =>
                          handleSendMessage(
                            "Preparar meu ambiente de estudos no PC principal",
                          )
                        }
                        className="w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center"
                      >
                        <span>📚 Modo Estudos (Macro PC)</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage(
                            "Quanto gastei na minha categoria de Alimentação este mês?",
                          )
                        }
                        className="w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center"
                      >
                        <span>💳 Consulta de iFood (RAG / DB)</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage(
                            "Como está meu briefing de agenda para amanhã?",
                          )
                        }
                        className="w-full text-left bg-zinc-900/60 hover:bg-[var(--brand-dark)] p-2 rounded border border-zinc-800 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center"
                      >
                        <span>📅 Eventos Agendados</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FINANCE */}
            {activeTab === "finance" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center bg-zinc-950/80 p-4 border border-zinc-800 rounded-xl">
                  <div className="flex flex-col">
                    <h3 className="text-[var(--brand-light)] font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
                       <Copy className="h-4 w-4" /> Exportação Contábil
                    </h3>
                    <span className="text-zinc-500 font-mono text-[10px] mt-1">Gerar Snapshot PDF do Balanço Atual e Evolução.</span>
                  </div>
                  <button 
                      onClick={handleExportPDF}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500 px-4 py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                      Exportar .PDF <ChevronRight className="h-3 w-3" />
                  </button>
                </div>

                <div id="finance-report-area" className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 -m-4 bg-[#09090b] rounded-xl">
                  {/* Financial Summary & Chart */}
                  <div className="holographic-card p-5 space-y-6">
                    <div>
                      <h3 className="text-xs font-mono font-medium text-[var(--brand-light)] uppercase flex items-center gap-1.5 mb-1">
                        <DollarSign className="h-4 w-4" />
                        Balanço e Metas Financeiras
                      </h3>
                      <p className="text-[10px] text-zinc-500">
                        Monitoramento e progresso anual de economia
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Meta de Economia Mensal
                        </span>
                        <span className="text-sm font-semibold text-white">
                          R$ {typeof currentGoal.limit === 'number' && !isNaN(currentGoal.limit) ? currentGoal.limit.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                        <span className="text-[10px] text-emerald-500 font-mono">
                          Valor Total Guardado/Disponível
                        </span>
                        <span className="text-xl font-light text-emerald-400 font-mono">
                          R$ {typeof guardado === 'number' && !isNaN(guardado) ? guardado.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-900 group">
                        <div className="flex items-baseline gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono">
                            Motivo da Meta
                            </span>
                            <span className="text-xs text-white">
                            {currentGoal.reason}
                            </span>
                        </div>
                        {currentGoal.limit > 0 && (
                            <button
                                onClick={handleDeleteGoal}
                                className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Apagar Meta Atual"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                      </div>
                    </div>

                    <form
                      onSubmit={handleGoalSubmit}
                      className="space-y-3 pt-3 border-t border-zinc-800"
                    >
                      <h4 className="text-[11px] uppercase tracking-widest text-zinc-400 font-mono font-bold">
                        Ajustar Meta Financeira
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={goalForm.limit}
                          onChange={(e) =>
                            setGoalForm({ ...goalForm, limit: e.target.value })
                          }
                          placeholder="Valor Final R$"
                          className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--brand-border)]"
                        />
                        <input
                          type="text"
                          required
                          value={goalForm.reason}
                          onChange={(e) =>
                            setGoalForm({ ...goalForm, reason: e.target.value })
                          }
                          placeholder="Motivo (ex: Carro)"
                          className="bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--brand-border)]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-zinc-800 hover:bg-[var(--brand-dark)] border border-zinc-700 hover:border-[var(--brand-border)] text-zinc-300 hover:text-white rounded py-2 text-xs font-mono uppercase tracking-wider transition-all"
                      >
                        Atualizar Meta
                      </button>
                    </form>

                    <div className="h-44 pt-4 border-t border-zinc-800">
                      <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mb-2">
                        Evolução de Economia
                      </h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={savingsData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#27272a"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="mes"
                            stroke="#52525b"
                            fontSize={9}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#52525b"
                            fontSize={8}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#09090b",
                              borderColor: "#27272a",
                            }}
                            labelStyle={{ color: "#a1a1aa", fontSize: 10 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="guardado"
                            stroke="var(--brand-primary)"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "var(--brand-light)" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Form & Table */}
                  <div className="holographic-card p-5 col-span-1 xl:col-span-2 flex flex-col space-y-6">
                    <div>
                      <h3 className="text-xs font-mono font-medium text-[var(--brand-light)] uppercase tracking-widest border-l border-[var(--brand-primary)] pl-2 mb-4">
                        Lançamento Manual & RAG Financeiro
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <form
                          onSubmit={handleFinanceSubmit}
                          className="space-y-3 bg-zinc-950 border border-zinc-800 p-4 rounded-xl"
                        >
                          <h4 className="text-[11px] text-zinc-400 font-mono mb-2">
                            Registrar nova despesa/ganho
                          </h4>
                          <div>
                            <label className="text-[10px] text-zinc-500 block mb-1">
                              Descrição
                            </label>
                            <input
                              type="text"
                              required
                              value={financeForm.description}
                              onChange={(e) =>
                                setFinanceForm({
                                  ...financeForm,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Ex: Conta de Luz"
                              className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">
                                Valor
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={financeForm.value}
                                onChange={(e) =>
                                  setFinanceForm({
                                    ...financeForm,
                                    value: e.target.value,
                                  })
                                }
                                placeholder="R$"
                                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">
                                Tipo
                              </label>
                              <select
                                value={financeForm.type}
                                onChange={(e) =>
                                  setFinanceForm({
                                    ...financeForm,
                                    type: e.target.value,
                                  })
                                }
                                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                              >
                                <option value="Receita">Receita</option>
                                <option value="Despesa">Despesa</option>
                              </select>
                            </div>
                          </div>
                          {financeForm.type === "Despesa" && (
                            <div>
                              <label className="text-[10px] text-zinc-500 block mb-1">
                                Categoria de Despesa
                              </label>
                              <select
                                value={financeForm.category}
                                onChange={(e) =>
                                  setFinanceForm({
                                    ...financeForm,
                                    category: e.target.value,
                                  })
                                }
                                className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                              >
                                <option value="Serviços">Serviços</option>
                                <option value="Educação">Educação</option>
                                <option value="Lazer">Lazer</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Saúde">Saúde</option>
                              </select>
                            </div>
                          )}
                          <button
                            type="submit"
                            className="w-full mt-2 bg-zinc-800 hover:bg-[var(--brand-dark)] border border-zinc-700 hover:border-[var(--brand-border)] text-zinc-300 hover:text-white rounded py-2 text-xs font-mono uppercase tracking-wider transition-all"
                          >
                            Lançar Registro
                          </button>
                        </form>

                        <div className="bg-[var(--brand-glow)] border border-[var(--brand-border)] p-4 rounded-xl flex flex-col justify-center items-center text-center space-y-3">
                          <div className="text-[var(--brand-light)] h-8 w-8 rounded-full bg-black/50 flex items-center justify-center border border-[var(--brand-dark)]">
                            <Info className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white mb-1">
                              Lançamento por IA RAG
                            </h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                              A IA pode ler PDFS, documentos e planilhas,
                              extraindo os dados e lançando automaticamente.
                              Também funciona por comando de voz!
                            </p>
                            <label className="cursor-pointer bg-[var(--brand-primary)] hover:bg-[var(--brand-light)] text-white text-xs font-mono py-2 px-4 rounded shadow-[0_0_10px_var(--brand-glow-strong)] transition-all">
                              Fazer Upload Extrato (PDF)
                              <input
                                type="file"
                                className="hidden transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_var(--brand-glow)]"
                                onChange={(e) =>
                                  handleFileUpload(e, "Finanças")
                                }
                                accept=".pdf,.xml,.csv"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <h4 className="text-[11px] uppercase tracking-widest text-[var(--brand-light)] font-mono mb-2">
                        Monitoramento de Despesas (Limites do Obsidian)
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={categoryChartData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#27272a"
                              horizontal={true}
                              vertical={false}
                            />
                            <XAxis
                              type="number"
                              stroke="#52525b"
                              fontSize={9}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="category"
                              stroke="#52525b"
                              fontSize={9}
                              tickLine={false}
                              width={80}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#09090b",
                                borderColor: "#18181b",
                              }}
                              labelStyle={{ color: "#a1a1aa", fontSize: 10 }}
                            />
                            <Bar
                              dataKey="gasto"
                              name="Gasto Atual"
                              fill="var(--brand-primary)"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                            >
                              {categoryChartData.map((entry, index) => (
                                <React.Fragment key={`cell-${index}`}>
                                  <Cell
                                    fill={
                                      entry.gasto > entry.limite
                                        ? "#ef4444"
                                        : "var(--brand-primary)"
                                    }
                                  />
                                </React.Fragment>
                              ))}
                            </Bar>
                            <Bar
                              dataKey="limite"
                              name="Limite Definido"
                              fill="#3f3f46"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex-1 min-h-[200px] overflow-x-auto mt-4 pt-4 border-t border-zinc-800">
                      <table className="w-full text-left font-mono text-[11px] border-collapse relative">
                        <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur z-10">
                          <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="pb-2">Data e Hora (Local)</th>
                            <th className="pb-2">Local/Lançamento</th>
                            <th className="pb-2">Categoria</th>
                            <th className="pb-2 text-right">Valor</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {systemState?.finances?.map((item: any) => (
                            <tr key={item.id} className="text-zinc-300 group">
                              <td className="py-2.5 text-zinc-500">
                                {new Date(item.date).toLocaleString("pt-BR", {
                                  hour12: false,
                                })}
                              </td>
                              <td className="py-2.5 font-semibold text-white">
                                {item.description}
                              </td>
                              <td className="py-2.5">
                                <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 text-[10px] rounded">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-2.5 text-right font-medium text-[var(--brand-light)]">
                                R$ {typeof item.value === 'number' && !isNaN(item.value) ? item.value.toFixed(2) : '0.00'}
                              </td>
                              <td className="py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDeleteFinance(item.description)}
                                    className="text-zinc-600 hover:text-red-500 transition-colors px-2"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AGENDA */}
            {activeTab === "agenda" && (
              <div className="space-y-6 animate-fade-in">
                <div className="holographic-card p-5 flex flex-col xl:flex-row gap-6">
                  <div className="w-full xl:w-1/3 flex flex-col gap-6">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-xs font-mono font-medium text-[var(--brand-light)] uppercase flex items-center gap-1.5 border-b border-[var(--brand-dark)] pb-2 mb-2 w-full">
                        <Calendar className="h-4 w-4" />
                        Lançamento de Agenda
                      </h3>
                    </div>

                    <form
                      onSubmit={handleAgendaSubmit}
                      className="space-y-3 bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex-1"
                    >
                      <h4 className="text-[11px] text-zinc-400 font-mono mb-2">
                        Agendar novo compromisso
                      </h4>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          Título do Evento
                        </label>
                        <input
                          type="text"
                          required
                          value={agendaForm.title}
                          onChange={(e) =>
                            setAgendaForm({
                              ...agendaForm,
                              title: e.target.value,
                            })
                          }
                          placeholder="Reunião com os Investidores"
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          Data e Hora
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={agendaForm.datetime}
                          onChange={(e) =>
                            setAgendaForm({
                              ...agendaForm,
                              datetime: e.target.value,
                            })
                          }
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          Categoria
                        </label>
                        <select
                          value={agendaForm.category}
                          onChange={(e) =>
                            setAgendaForm({
                              ...agendaForm,
                              category: e.target.value,
                            })
                          }
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                        >
                          <option value="Trabalho">Trabalho</option>
                          <option value="Pessoal">Pessoal</option>
                          <option value="Estudos">Estudos</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 block mb-1">
                          Anotações (Extraídas ou Manual)
                        </label>
                        <textarea
                          rows={2}
                          value={agendaForm.notes}
                          onChange={(e) =>
                            setAgendaForm({
                              ...agendaForm,
                              notes: e.target.value,
                            })
                          }
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] placeholder-zinc-700"
                          placeholder="Levar documentação atualizada..."
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className="w-full mt-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-light)] border border-[var(--brand-border)] text-white shadow-[0_0_10px_var(--brand-glow-strong)] rounded py-2 text-xs font-mono uppercase tracking-wider transition-all"
                      >
                        Salvar Compromisso
                      </button>
                    </form>

                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-center">
                      <h4 className="text-[11px] text-zinc-300 font-mono mb-2">
                        Adição por Arquivos via IA
                      </h4>
                      <p className="text-[10px] text-zinc-500 mb-3">
                        Suba um PDF de calendário acadêmico, voo, ou roteiro
                        para IA agendar automaticamente.
                      </p>
                      <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-[11px] font-mono py-1.5 px-3 rounded transition-all block">
                        📤 Upload de Arquivo (PDF/CSV)
                        <input
                          type="file"
                          className="hidden transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_var(--brand-glow)]"
                          onChange={(e) => handleFileUpload(e, "Agenda")}
                          accept=".pdf,.txt,.ics"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="w-full xl:w-2/3 border-t xl:border-t-0 xl:border-l border-zinc-800 xl:pl-6 pt-6 xl:pt-0">
                    <h3 className="text-xs font-mono font-medium text-zinc-300 uppercase tracking-widest pl-2 border-l-2 border-[var(--brand-primary)] mb-4">
                      Compromissos Registrados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono w-full">
                      {systemState?.agenda?.map((item: any) => (
                        <div
                          key={item.id}
                          className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 flex flex-col h-full hover:border-zinc-700 transition duration-300"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2 py-0.5 bg-[var(--brand-dark)] border border-[var(--brand-border)] text-[9px] text-[var(--brand-light)] rounded">
                              {item.category}
                            </span>
                            <button
                                onClick={() => handleDeleteAgenda(item.title)}
                                className="text-zinc-600 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <h4 className="text-xs font-semibold text-white mt-1 line-clamp-2">
                            {item.title}
                          </h4>
                          <div className="text-[9px] text-zinc-500 pt-2 pb-2 mb-auto mt-2 border-y border-zinc-900 leading-relaxed overflow-hidden text-clip whitespace-pre-wrap">
                            {item.notes || "Sem anotações complementares."}
                          </div>
                          <div className="text-[10px] font-medium mt-3 text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded flex items-center justify-between">
                            <span>
                              {new Date(item.datetime).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                            <span>
                              {new Date(item.datetime).toLocaleTimeString(
                                "pt-BR",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!systemState?.agenda ||
                        systemState?.agenda.length === 0) && (
                        <div className="col-span-2 text-center text-zinc-600 text-[10px] py-10 border border-dashed border-zinc-800 rounded-xl">
                          Nenhum compromisso cadastrado para o período.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CONFIGURAÇÕES & IOT */}
            {activeTab === "settings" && (
              <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden border border-zinc-800 rounded-xl bg-black/20 animate-fade-in relative z-10 shadow-2xl">
                {/* Left Sidebar for Tabs */}
                <div className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-950/50 flex flex-col overflow-y-auto custom-scrollbar">
                  
                  {/* Category: SISTEMA */}
                  <div className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-black/40">
                    Sistema
                  </div>
                  <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                    <button
                      onClick={() => setSettingsTab("general")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "general"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      ⚙️ Configurações & IoT
                    </button>
                    <button
                      onClick={() => setSettingsTab("appearance")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "appearance"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      🎨 Aparência
                    </button>
                    <button
                      onClick={() => setSettingsTab("updates")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap relative ${
                        settingsTab === "updates"
                          ? "bg-cyan-500/20 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      🔄 Atualizações
                      {updateState?.status === "available" && (
                        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                      )}
                    </button>
                    <button
                      onClick={() => setSettingsTab("tokens")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "tokens"
                          ? "bg-amber-500/20 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)] border border-amber-500/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      🔐 Senhas & Tokens
                    </button>
                  </div>

                  {/* Category: WORKSPACE & IA */}
                  <div className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800 mt-2 bg-black/40">
                    Workspace & IA
                  </div>
                  <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                    <button
                      onClick={() => setSettingsTab("chromadb")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "chromadb"
                          ? "bg-cyan-500/20 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      🧠 Memória ChromaDB
                    </button>
                    <button
                      onClick={() => setSettingsTab("obsidian")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "obsidian"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      📝 Obsidian Vault
                    </button>
                    <button
                      onClick={() => setSettingsTab("mcp")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "mcp"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      🔌 Integração MCP
                    </button>
                    <button
                      onClick={() => setSettingsTab("cudautil")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "cudautil"
                          ? "bg-indigo-500/20 text-indigo-400 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      📊 Telemetria CUDA
                    </button>
                  </div>

                  {/* Category: MANUTENÇÃO */}
                  <div className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800 mt-2 bg-black/40">
                    Manutenção
                  </div>
                  <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                    <button
                      onClick={() => setSettingsTab("installer")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "installer"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      📦 Core Engine & Logs
                    </button>
                    <button
                      onClick={() => setSettingsTab("packager")}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${
                        settingsTab === "packager"
                          ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      📦 Gerar Instalador
                    </button>
                  </div>
                </div>

                {/* Right Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/[0.15] custom-scrollbar">
                {settingsTab === "packager" && <PackagerModule />}

                {(settingsTab === "general" ||
                  settingsTab === "appearance") && (
                  <DeviceConfig
                    devices={systemState?.homeAssistant?.devices || []}
                    onRefresh={onRefreshStable}
                    currentTheme={currentTheme}
                    onChangeTheme={changeTheme}
                    configTab={settingsTab}
                  />
                )}

                {settingsTab === "installer" && (
                  <div className="space-y-6">
                    <LogsDocker />
                    <div className="bg-zinc-950/10 border border-zinc-900 p-1 rounded-xl">
                      <Installer
                        installerState={systemState?.installer}
                        onRefresh={onRefreshStable}
                      />
                    </div>
                  </div>
                )}

                {settingsTab === "updates" && (
                  <SystemUpdater
                    updateState={updateState}
                    onRefresh={onUpdateRefreshStable}
                  />
                )}

                {settingsTab === "obsidian" && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-mono">
                    {/* Left selector listing virtual files in obsidian */}
                    <div className="holographic-card p-4 space-y-3">
                      <h3 className="text-xs font-bold text-[var(--brand-light)] uppercase tracking-widest pl-2 border-l border-[var(--brand-primary)] mb-4 animate-pulse">
                        Obsidian Vault Explorer
                      </h3>
                      <p className="text-[11px] text-zinc-400 leading-normal mb-3">
                        Os arquivos Markdown{" "}
                        <code className="text-[10px] text-lime-400 font-bold bg-zinc-950 border border-zinc-900 px-1 rounded">
                          .md
                        </code>{" "}
                        são o cérebro do JARVIS. Você pode ler e editar live
                        abaixo:
                      </p>

                      <div className="space-y-1.5 text-xs">
                        {systemState?.obsidianNotes?.map((note: any) => (
                          <button
                            key={note.path}
                            className="w-full text-left p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900/80 transition text-zinc-300 block hover:border-[var(--brand-border)] text-[11px] cursor-pointer"
                          >
                            <span className="block font-bold text-white text-[10px] text-[var(--brand-light)]">
                              📝 {note.path}
                            </span>
                            <span className="block text-[9px] text-zinc-500 truncate mt-0.5">
                              {note.content?.substring(0, 40)}...
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Note Editor area */}
                    <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                          <div>
                            <h3 className="text-xs font-bold text-white uppercase pr-2">
                              Visualizador de Memórias Ativas (RAG Ingested)
                            </h3>
                            <p className="text-[10px] text-zinc-500">
                              Mapeado fisicamente em: ~/jarvis-vault/
                            </p>
                          </div>
                          <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-1 rounded">
                            Visualizando: perfil/usuario.md
                          </span>
                        </div>

                        <div className="space-y-4">
                          {systemState?.obsidianNotes?.map(
                            (note: any, index: number) => (
                              <div
                                key={index}
                                className="bg-black/40 border border-zinc-800/60 rounded-xl p-4 group"
                              >
                                <div className="text-[10px] font-bold text-yellow-400 mb-2 font-mono flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
                                      {note.path}
                                  </div>
                                  <button
                                      onClick={() => handleDeleteObsidian(note.path)}
                                      className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Apagar Nota do Obsidian"
                                  >
                                      <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                <textarea
                                  rows={6}
                                  defaultValue={note.content}
                                  onChange={(e) =>
                                    updateObsidianNote(
                                      note.path,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-zinc-950 text-xs font-mono text-zinc-350 p-3 rounded-lg border border-zinc-900 focus:outline-none focus:border-[var(--brand-primary)] resize-none leading-relaxed"
                                />
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="border-t border-zinc-800 pt-3 mt-4 text-[10px] text-zinc-500 leading-normal">
                        💡 <strong>Dica do JARVIS:</strong> Ao salvar
                        modificações em arquivos Markdown no Obsidian Vault, os
                        triggers automáticos do n8n atualizam o ChromaDB
                        instantaneamente no Docker.
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "chromadb" && <ChromaInspector />}

                {settingsTab === "mcp" && <MCPSettings />}

                {settingsTab === "cudautil" && <CUDATelemetryHUD />}

                {settingsTab === "tokens" && <TokensManager />}
                </div>
              </div>
            )}

            {/* TAB: SSH & DIAGNOSTICS */}
            {activeTab === "diagnostics" && (
              <div className="space-y-6 flex flex-col h-full overflow-hidden">
                <SSHDiagnostics />
              </div>
            )}

            {/* TAB 7: DOCUMENTATION TECHNICAL README */}
            {activeTab === "readme" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans leading-relaxed text-zinc-300">
                {/* Quick specifications left menu */}
                <div className="holographic-card p-5 space-y-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-[var(--brand-light)] uppercase border-l border-[var(--brand-primary)] pl-2">
                    Guia Definitivo: Deploy Completo (Linux)
                  </h3>

                  <div className="font-sans text-[11px] space-y-4">
                    <div>
                      <strong className="text-white block mb-1 text-xs">
                        1. Deploy Inicial no Servidor (Linux/WSL)
                      </strong>
                      <p className="text-zinc-500 mb-2 leading-relaxed">
                        Abra o terminal do seu servidor. Atualize o repositório com <code className="bg-zinc-950 px-1 py-0.5 rounded text-white font-mono">git pull</code>. Em seguida, na aba lateral "Implantação/Setup", clique em "Baixar .SH Script". Envie este script para a raiz do projeto no servidor e execute: <br/>
                        <code className="bg-zinc-950 px-1 py-0.5 rounded text-[var(--brand-light)] font-mono">sudo bash deploy_jarvis.sh</code><br/>
                        Isso instalará as dependências do Node, o Docker e iniciará o backend. Acesse a porta <strong>3000</strong> no navegador.
                      </p>
                    </div>
                    <div>
                      <strong className="text-emerald-400 block mb-1 text-xs">
                        2. Banco de Dados e Containers
                      </strong>
                      <p className="text-zinc-500 mb-2 leading-relaxed">
                        O script <code className="text-zinc-400 font-mono">.sh</code> roda o comando <code className="text-[10px] text-zinc-400 bg-zinc-950 px-1">docker compose up -d</code> que "levanta" as bases de dados nos bastidores. O banco de dados PostgreSQL guardará suas memórias de longo prazo nativamente e o servidor Vector ChromaDB processará a linguagem em RAG - tudo já orquestrado internamente para não haver necessidade de configuração manual.
                      </p>
                    </div>
                    <div>
                      <strong className="text-[var(--brand-light)] block mb-1 text-xs">
                        3. Inteligência em 100% Cloud (Groq LPU)
                      </strong>
                      <p className="text-zinc-500 mb-2 leading-relaxed">
                        Esqueça Ollama! Economize energia usando LLMs ultrarrápidos através do Groq Cloud. Vá em <strong>Chaves de APIs</strong> no menu superior e preencha a Groq API Key obtida gratuitamente em <a href="https://console.groq.com" target="_blank" className="text-[var(--brand-light)] underline">console.groq.com</a>. O JARVIS automaticamente mudará o roteamento cognitivo usando <code>llama-3.3-70b-versatile</code> para lhe responder na hora.
                      </p>
                    </div>
                    <div>
                      <strong className="text-white block mb-1 text-xs">
                        4. Voz (Edge TTS Gratuito)
                      </strong>
                      <p className="text-zinc-500 mb-2 leading-relaxed">
                        Para a comunicação verbal responsiva, a infraestrutura <strong>Microsoft Edge TTS</strong> é habilitada por padrão sem custo (via Node). Ao mandar comandos de voz no microfone central, o Assistente responderá em Português-BR com uma voz realista ("Antônio" ou "Francisca") sempre que o modo "Retorno de Voz" estiver ativo. Nenhum setup a mais é exigido.
                      </p>
                    </div>
                    <div>
                      <strong className="text-rose-400 block mb-1 text-xs">
                        5. Conectando a Segunda Memória (Obsidian)
                      </strong>
                      <p className="text-zinc-500 leading-relaxed">
                        Agora instale o <a href="https://obsidian.md" target="_blank" className="text-rose-400 underline">Obsidian</a> no seu PC e crie um cofre vazio. No JARVIS, vá em <strong>Configurações Globais</strong>, procure "Caminho do Vault" e indique o path (ex <code className="text-[10px] text-zinc-400">/home/user/documentos/jarvis-vault</code>). O JARVIS irá ler, vetorizar e escrever em <code>.md</code> de forma invisível. Suas anotações no celular agora conversarão com as anotações geradas via IA em tempo pseudo-real. E pronto, seu ecossistema está vivo 🚀.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[var(--brand-dark)] border border-[var(--brand-border)] p-4.5 rounded-xl text-xs space-y-2">
                    <span className="text-[var(--brand-light)] font-mono font-bold block uppercase tracking-wider text-[11px]">
                      ⚡ CUDA RENDERING PERFORMANCE
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      O {hardwareStats?.cpu || "Notebook (Servidor)"} utiliza a
                      placa{" "}
                      <strong>
                        {hardwareStats?.gpus?.[0]?.model ||
                          "NVIDIA GeForce GTX 1650"}{" "}
                        (
                        {hardwareStats?.gpus?.[0]?.vram
                          ? Math.round(hardwareStats.gpus[0].vram / 1024) +
                            "GB VRAM"
                          : "4GB VRAM"}
                        )
                      </strong>
                      . Isso possibilita rodar o modelo Llama 3.3 com tempo
                      de resposta inferior a <strong>800ms por token</strong>{" "}
                      localmente.
                    </p>
                    <div className="w-full bg-zinc-950 h-2 rounded overflow-hidden">
                      <div className="bg-[var(--brand-primary)] h-full w-[85%]"></div>
                    </div>
                  </div>
                </div>

                {/* Readme details */}
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl overflow-y-auto leading-relaxed text-xs space-y-5 shadow-inner">
                  <div className="border-b border-zinc-800 pb-4">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                      JARVIS v5.0 — Manual de Arquitetura
                    </h2>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--brand-light)] font-mono mt-1">
                      Sistemas de Assistência Pessoal Local-First e Privado
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]"></span>
                        1. Como Funciona a Instalação Automatizada?
                      </h3>
                      <p className="text-zinc-300">
                        O aplicativo unificado do JARVIS atua como um{" "}
                        <strong>
                          provisionador de containers e downloads nativos
                        </strong>
                        . Ao clicar em instalar na aba "Pipeline de Instalação":
                      </p>
                      <ul className="list-disc pl-5 mt-1.5 space-y-1 text-zinc-400 text-[11px]">
                        <li>
                          Ele instala o Docker Engine e o Ollama nativamente no terminal root do seu{" "}
                          {hardwareStats?.cpu || "Notebook (Servidor)"}.
                        </li>
                        <li>
                          Usa o gerenciador <strong>apt de pacotes</strong> do
                          Linux (Debian/Ubuntu) para instalar o Docker CLI e Docker Compose de forma
                          silenciosa.
                        </li>
                        <li>
                          Cria a estrutura de pastas do seu Obsidian Vault no
                          caminho físico{" "}
                          <code className="text-yellow-400 text-[10px]">
                            ~/jarvis-vault
                          </code>
                          .
                        </li>
                        <li>
                          Popula os templates Markdown de controle financeiro,
                          de agenda e de perfis no local.
                        </li>
                        <li>
                          Baixa e carrega o Llama 3.2 e nomic-embed-text na
                          GPU via CUDA.
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]"></span>
                        2. Detalhes de Implementação Técnica
                      </h3>
                      <p className="text-zinc-300">
                        Todo o projeto baseia-se em{" "}
                        <strong>
                          NodeJS, Docker, n8n de orquestração e Ollama
                        </strong>
                        :
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-2 font-mono text-[10px]">
                        <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                          <strong className="text-[var(--brand-light)] block mb-0.5">
                            Ollama (Fora do Docker)
                          </strong>
                          Rodado fora dos containers para usufruir da aceleração
                          de hardware CUDA da{" "}
                          {hardwareStats?.gpus?.[0]?.model
                            ?.replace("NVIDIA GeForce", "")
                            .trim() || "GTX 1650"}{" "}
                          de maneira nativa, contornando gargalos do WSL2.
                        </div>
                        <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                          <strong className="text-[var(--brand-light)] block mb-0.5">
                            RAG & ChromaDB Matrix
                          </strong>
                          O n8n monitora o Obsidian. Qualquer extrato bancário
                          em PDF ou anotação inserida é dividida em chunks e
                          guardada no banco vetorial.
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]"></span>
                        3. Comandos de Voz Suportados
                      </h3>
                      <p className="text-zinc-350">
                        O widget dinâmico de voz na tela aceita triggers em
                        português direto. Experimente falar ou digitar no
                        terminal da HUD:
                      </p>
                      <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-900 text-zinc-400 font-mono text-[10px] space-y-1">
                        <div>
                          🎤{" "}
                          <span className="text-white">
                            "Ativar Modo Cinema"
                          </span>{" "}
                          : Apaga o ar, joga as luzes RGB pra Magenta e abre
                          abas no PC.
                        </div>
                        <div>
                          🎤{" "}
                          <span className="text-white">
                            "Quanto gastei com iFood esse mês?"
                          </span>{" "}
                          : Busca semântica soma seus extratos de alimentação.
                        </div>
                        <div>
                          🎤{" "}
                          <span className="text-white">
                            "Prepare meu ambiente de estudos"
                          </span>{" "}
                          : Abre Notion, ajusta Lo-Fi e limpa as notificações.
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-light)]"></span>
                        4. Modo Hibernação (Modo Portátil)
                      </h3>
                      <div className="text-zinc-300 text-xs">
                        Para economizar recursos computacionais, clique em
                        "Hibernar JARVIS" na bandeja. O app executará:
                        <pre className="bg-black p-2 rounded text-rose-400 font-mono text-[10px] mt-1.5">
                          docker compose pause
                        </pre>
                        Isso congela a RAM e CPU liberando o desktop
                        instantaneamente para uso móvel na faculdade ou
                        trabalho!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Futuristic Bottom Status Bar Footer */}
        <footer className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-[10px] text-zinc-500 font-mono gap-3 shrink-0">
          <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
            <span>SISTEMA: ONLINE</span>
            <span>SINAL TELEGRAM BOT: AGUARDANDO POLCHING</span>
            <span>DOCKER SUBNET: 172.18.0.0/16</span>
            <span>LOCAL DEPLOYS: ~/jarvis-vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-500 uppercase tracking-tighter">
              Conexão Master Host: Ativa
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
