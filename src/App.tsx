import CyberGauge from "./components/CyberGauge";
import { HOLO_THEMES } from "./lib/theme";
import { getServerUrl, fetchAutenticado } from "./lib/api";
import PackagerModule from "./components/PackagerModule";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SystemHealthMonitor, HardwareProcessingMonitor } from "./components/HardwareMonitor";
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
  Table,
  LogOut,
  Users
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
import CUDATelemetryHUD from "./components/CUDATelemetryHUD";
import SSHDiagnostics from "./components/SSHDiagnostics";
import FinanceDashboard from "./components/FinanceDashboard";
import MCPSettings from "./components/MCPSettings";
import TokensManager from "./components/TokensManager";
import UserManager from "./components/UserManager";
import DatabaseViewer from "./components/DatabaseViewer";
import { HALightControlModal } from "./components/HALightControlModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "jarvis" | "home" | "system" | "finance" | "agenda" | "database" | "settings" | "readme" | "diagnostics"
  >("jarvis");
  const [settingsTab, setSettingsTab] = useState<
    | "general"
    | "appearance"
    | "installer"
    | "obsidian"
    | "logs"
    | "updates"
    | "cudautil"
    | "mcp"
    | "tokens"
    | "users"
    | "packager"
  >("general");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [systemState, setSystemState] = useState<any>(null);
  const [selectedLight, setSelectedLight] = useState<any>(null);

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
    githubRepo: "Vinicius-Christ/Jarvis-Project",
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
    return "violet"; // User requested deep purple as default
  });

  const [bgImage, setBgImage] = useState(() => {
    try {
      return localStorage.getItem("jarvis_bg_image") || "";
    } catch {
      return "";
    }
  });

  const changeBgImage = (url: string) => {
    setBgImage(url);
    try {
      localStorage.setItem("jarvis_bg_image", url);
    } catch { /* ignore */ }
  };

  const changeTheme = (
    theme: "cyan" | "amber" | "violet" | "emerald" | "rose",
  ) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem("jarvis_holo_theme", theme);
    } catch (e) { /* ignore */ }
  };

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


  useEffect(() => {
    fetchSystemState();
    fetchUpdateState();

    // Auto check update once on startup
    fetch(getServerUrl() + "/api/system/update/check")
      .then(() => fetchUpdateState())
      .catch(() => { });

    // Poll state every 10 seconds to watch simulated live installation without spamming
    const interval = setInterval(() => {
      fetchSystemState();
      fetchUpdateState();
    }, 10000);

    return () => {
      clearInterval(interval);

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
        // Find all matches of <command type="..." ... /> safely
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
            const typeMatchAttr = attributesStr.match(/typeAttr="([^"]+)"/); // AI might use type="..." but type is already the main command type, let's look for financeType or just look for type="..." inside the match? No, wait, type is the XML tag's type!
            // Wait, the AI tag is <command type="Finance" financeType="Receita" /> ?
            const financeTypeMatch = attributesStr.match(/financeType="([^"]+)"/);

            if (valueMatch) {
              const categoryVal = catMatch ? catMatch[1] : "Outros";
              await fetchAutenticado("/api/update/finance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  value: parseFloat(valueMatch[1]),
                  category: categoryVal,
                  type: financeTypeMatch ? financeTypeMatch[1] : undefined,
                  description: descMatch
                    ? descMatch[1]
                    : "Inserido via voz/anexo JARVIS",
                }),
              });
              fetchSystemState(); // Refresh dashboard
            }
          } else if (type === "Agenda") {
            const titleMatch = attributesStr.match(/title="([^"]+)"/);
            const dateMatch = attributesStr.match(/datetime="([^"]+)"/);
            if (titleMatch && dateMatch) {
              await fetchAutenticado("/api/update/agenda", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: titleMatch[1],
                  datetime: dateMatch[1],
                  category: "Trabalho",
                }),
              });
              fetchSystemState();
            }
          } else if (type === "PC") {
            const workspaceMatch = attributesStr.match(/workspace="([^"]+)"/);
            if (workspaceMatch) {
              await fetchAutenticado("/api/update/pc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace: workspaceMatch[1] }),
              });
            }
          } else if (type === "FinanceDelete") {
            const descMatch = attributesStr.match(/description="([^"]+)"/);
            const allMatch = attributesStr.match(/all="([^"]+)"/);
            const isAll = (allMatch && allMatch[1] === "true") || attributesStr.includes("all=") || !descMatch;

            await fetchAutenticado("/api/delete/finance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: descMatch ? descMatch[1] : undefined,
                all: isAll
              }),
            });
          } else if (type === "AgendaDelete") {
            const titleMatch = attributesStr.match(/title="([^"]+)"/);
            const allMatch = attributesStr.match(/all="([^"]+)"/);
            const isAll = (allMatch && allMatch[1] === "true") || attributesStr.includes("all=") || !titleMatch;

            await fetchAutenticado("/api/delete/agenda", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: titleMatch ? titleMatch[1] : undefined,
                all: isAll
              }),
            });
          } else if (type === "GoalDelete") {
            await fetchAutenticado("/api/delete/goal", {
              method: "POST"
            });
          } else if (type === "ObsidianDelete") {
            const pathMatch = attributesStr.match(/path="([^"]+)"/);
            if (pathMatch) {
              await fetchAutenticado("/api/delete/obsidian", {
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
      await fetchAutenticado("/api/update/iot", {
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

      await fetchAutenticado("/api/update/finance", {
        method: "POST",
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
      await fetchAutenticado("/api/update/goal", {
        method: "POST",
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
      await fetchAutenticado("/api/update/agenda", {
        method: "POST",
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
      await fetchAutenticado("/api/delete/agenda", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleDeleteFinance = async (description: string) => {
    try {
      await fetchAutenticado("/api/delete/finance", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleDeleteGoal = async () => {
    try {
      await fetchAutenticado("/api/delete/goal", {
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
  // Convert primary hex to rgb triplet for CSS variable usage
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  const themeStyles = {
    "--brand-primary": activeHoloTheme.primary,
    "--brand-primary-rgb": hexToRgb(activeHoloTheme.primary),
    "--brand-light": activeHoloTheme.light,
    "--brand-glow": activeHoloTheme.glow,
    "--brand-glow-strong": activeHoloTheme.glowStrong,
    "--brand-border": activeHoloTheme.border,
    "--brand-dark": activeHoloTheme.dark,
  } as React.CSSProperties;

  return (
    <div
      style={themeStyles}
      className={`w-full h-full flex font-sans overflow-hidden select-none transition-colors duration-700 text-zinc-100 relative`}
    >
      {/* SVG Displacement Map — invisible, enables liquid refraction via CSS filter: url(#liquid-glass-filter) */}
      <svg style={{ display: 'none' }} aria-hidden="true">
        <defs>
          <filter id="liquid-glass-filter" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="3" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* DYNAMIC BACKGROUND IMAGE */}
      {bgImage && (
        <div
          className="fixed inset-0 z-0 opacity-25 transition-all duration-1000"
          style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', mixBlendMode: 'luminosity' }}
        />
      )}

      {/* Sidebar Navigation — Liquid Glass Primary Panel */}
      <aside
        className={`glass-panel border-r border-white/[0.07] ${isSidebarOpen ? "w-64" : "w-16"
          } transition-[width] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col shrink-0 z-20`}
      >
        <div className="h-[68px] flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
          {isSidebarOpen && (
            <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap animate-slide-left">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/40 to-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30">
                <Shield className="h-3.5 w-3.5 text-[var(--brand-light)]" />
              </div>
              <span className="font-bold tracking-[0.15em] text-xs text-white">
                JARVIS OS
              </span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 rounded-lg magnetic-btn shrink-0 ${isSidebarOpen ? "" : "mx-auto"
              } text-zinc-400 hover:text-white`}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--brand-light)]" />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto overflow-x-hidden w-full">
          {[
            { id: "jarvis", label: "JARVIS Core", icon: Sliders },
            { id: "home", label: "Casa Inteligente", icon: Home },
            { id: "system", label: "Sistema & DevOps", icon: Activity },
            { id: "finance", label: "Financeiro", icon: DollarSign },
            { id: "agenda", label: "Agenda", icon: Calendar },
            { id: "database", label: "Banco de Dados", icon: Database },
            { id: "settings", label: "Configurações", icon: Settings },
            { id: "diagnostics", label: "Diagnósticos & SSH", icon: Terminal },
            { id: "readme", label: "Documentação", icon: Info },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-300 cursor-pointer w-full ${isActive
                  ? "text-white font-semibold"
                  : "text-zinc-500 hover:text-zinc-200"
                  }`}
                title={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarGlass"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: `rgba(${activeHoloTheme.primary.slice(1).match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') || '168,85,247'}, 0.12)`,
                      border: `1px solid rgba(${activeHoloTheme.primary.slice(1).match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') || '168,85,247'}, 0.35)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(${activeHoloTheme.primary.slice(1).match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') || '168,85,247'}, 0.15)`,
                    }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`h-4 w-4 shrink-0 relative z-10 transition-colors ${isActive ? 'text-[var(--brand-light)]' : ''
                  }`} />
                {isSidebarOpen && (
                  <span className="relative z-10 tracking-wide">{item.label}</span>
                )}
              </button>
            );
          })}

          <div className="flex-1" />

          <button
            onClick={() => { localStorage.removeItem("jarvis_token"); window.location.reload(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 cursor-pointer w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
            title="Sair"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </nav>

        <div className="px-4 pb-4 flex justify-center">
          {isSidebarOpen ? (
            <span className="font-mono text-[9px] tracking-[0.25em] text-zinc-700">JARVIS OS v5</span>
          ) : (
            <span className="font-mono text-[8px] text-zinc-800">v5</span>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full overflow-x-hidden p-4 md:p-5 w-full ${(activeTab === "jarvis" || activeTab === "settings") ? "overflow-hidden" : "overflow-y-auto"
        }`}>
        {/* Header */}
        <header className="relative z-50 flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-5 shrink-0">
          <div className="flex items-center gap-3.5">
            {/* Status orb */}
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center border border-[var(--brand-primary)]/20">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${systemState?.systemActive
                  ? systemState?.installer?.status === "installing"
                    ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                    : "bg-[var(--brand-light)] shadow-[0_0_10px_var(--brand-glow-strong)]"
                  : "bg-zinc-600"
                  }`} />
              </div>
              {systemState?.systemActive && (
                <div className="absolute inset-0 rounded-2xl ring-1 ring-[var(--brand-primary)]/20 animate-pulse" />
              )}
            </div>
            <div>
              <h1 id="main_title" className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
                JARVIS
                <span className="text-brand-gradient">CHRIST</span>
                <span className="text-[10px] font-mono glass-card px-2 py-0.5 rounded-lg text-[var(--brand-light)] border border-[var(--brand-primary)]/20 tracking-widest">
                  v5.0-LOCAL
                </span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium mt-0.5">
                AI Control & Automation System
              </p>
            </div>
          </div>

          {/* Right side: shortcuts + status + toggle */}
          <div className="flex items-center gap-3">
            {/* Quick links */}
            <div className="flex items-center gap-1.5">
              {[
                { href: `http://${window.location.hostname}:5678`, icon: Workflow, title: "n8n" },
                { href: `http://${window.location.hostname}:8123`, icon: Home, title: "Home Assistant" },
                { href: "/api-docs", icon: Code, title: "API Docs" },
              ].map(({ href, icon: Icon, title }) => (
                <a
                  key={title}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  title={title}
                  className="w-8 h-8 rounded-xl magnetic-btn flex items-center justify-center text-zinc-400 hover:text-[var(--brand-light)] transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10" />

            {/* Clock */}
            <div className="text-right">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider block">Local Time</span>
              <span id="digital_clock" className="text-xs font-mono font-semibold text-white flex items-center gap-1 justify-end">
                <Clock className="h-3 w-3 text-[var(--brand-light)]" />
                {timeStr}
              </span>
            </div>

            {/* System status pill */}
            <div className="glass-card px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${systemState?.systemActive ? 'status-online' : 'status-offline'
                }`} />
              <span className="text-[10px] font-mono text-zinc-400">
                {systemState?.systemActive ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Toggle */}
            <button
              onClick={async () => {
                try {
                  await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
                  fetchSystemState();
                } catch (e) { console.error(e); }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${systemState?.systemActive
                ? "magnetic-btn text-zinc-300"
                : "liquid-btn text-white"
                }`}
            >
              {systemState?.systemActive ? "Pausar" : "Iniciar"}
            </button>
          </div>
        </header>

        {/* Holographic Notification Update Strip */}
        {updateState && updateState.status === "available" && (
          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 border border-[var(--brand-primary)]/30 bg-[var(--brand-dark)]/10 hover:bg-[var(--brand-dark)]/20 text-cyan-200 rounded-2xl font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.08)] transition-all">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-light)]  shrink-0"></span>
              <div>
                <span className="font-bold text-white uppercase tracking-wider block sm:inline">
                  [🔄 ATUALIZAÇÃO REPOSITÓRIO]{" "}
                </span>
                <span>
                  Uma nova alteração de código-fonte foi sincronizada no Git
                  remoto. Commit:{" "}
                  <span className="text-[var(--brand-light)] bg-black/20 backdrop-blur-md px-1.5 py-0.5 rounded border border-zinc-800/40 font-bold">
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
              className="px-4 py-1.5 hover-glow bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)] hover:text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-[var(--brand-primary)]/50 text-cyan-300 font-bold tracking-wider rounded transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              Sincronizar Código Agora
            </button>
          </div>
        )}

        {/* Main Container Dashboard */}
        <main className={`flex-1 flex flex-col w-full relative min-h-0 ${(activeTab === "jarvis" || activeTab === "settings") ? "mb-0" : "mb-6"}`}>
          {!systemState?.systemActive ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#030712] border border-zinc-900 rounded-2xl">
              <div className="w-16 h-16 mb-4 rounded-full border-4 border-zinc-800/40 flex items-center justify-center">
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
                <span className="text-xs text-zinc-700 font-mono uppercase tracking-widest">
                  Recursos em Repouso
                </span>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm bg-black/20 backdrop-blur-md text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40">
                    4GB VRAM (CUDA)
                  </span>
                  <span className="text-sm bg-black/20 backdrop-blur-md text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40">
                    Docker Subnet
                  </span>
                  <span className="text-sm bg-black/20 backdrop-blur-md text-zinc-600 px-2.5 py-1 rounded border border-zinc-800/40">
                    Websockets IoT
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`flex-1 flex flex-col min-h-0 transition-opacity duration-500 relative ${!systemState?.systemActive ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            {/* The Jarvis Assistant Component (Always mounted, manages its own widget mode layout) */}
            {systemState?.systemActive && (
              <div className={`transition-all duration-500 ${activeTab === "jarvis" ? "absolute inset-0 z-10 pointer-events-auto" : "absolute inset-0 z-50 pointer-events-none"}`}>
                <JarvisAssistant
                  conversations={systemState?.conversations || []}
                  onSendMessage={onSendMessageStable}
                  isWidget={activeTab !== "jarvis"}
                  devices={systemState?.homeAssistant?.devices || []}
                  serverUrl={getServerUrl()}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 30, scale: 0.98, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(10px)" }}
                transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.8 }}
                className="w-full flex-1 flex flex-col min-h-0"
              >
                {/* TAB 1: JARVIS CORE */}
                {activeTab === "jarvis" && (
                  <div className="h-full flex-1 w-full flex flex-col animate-fade-in relative z-0">
                    {/* Placeholder for the layout space. The actual component is rendered globally. */}
                  </div>
                )}

                {/* TAB 2: CASA INTELIGENTE */}
                {activeTab === "home" && (
                  <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
                    <div className="holographic-card p-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/40 pb-3 mb-4">
                        <div>
                          <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase flex items-center gap-1.5">
                            <Home className="h-4 w-4" />
                            Domótica Residencial (Home Assistant Cores)
                          </h3>
                          <p className="text-xs text-zinc-500">
                            Sincronizado via IP Local da Máquina com Zigbee e Matter
                          </p>
                        </div>
                        <div className="flex gap-1.5 font-mono text-xs">
                          {["Modo Trabalho", "Modo Cinema", "Modo Noturno"].map(
                            (p) => (
                              <button
                                key={p}
                                onClick={() => triggerPresetChange(p)}
                                className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${selectedPreset === p
                                  ? "bg-[var(--brand-dark)] border-[var(--brand-primary)] text-[var(--brand-light)] font-bold"
                                  : "bg-black/20 backdrop-blur-md/40 border-zinc-800/40 text-zinc-500 hover:text-zinc-300"
                                  }`}
                              >
                                {p}
                              </button>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {systemState?.homeAssistant?.devices?.filter((d: any) => !systemState?.homeAssistant?.hiddenDevices?.includes(d.id)).map(
                          (device: any) => (
                            <div
                              key={device.id}
                              onClick={(e) => {
                                // Prevent modal open if they clicked the toggle button
                                if ((e.target as HTMLElement).closest('.toggle-btn')) return;
                                if (device.type === "light") {
                                  setSelectedLight(device);
                                }
                              }}
                              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${device.type === "light" ? "cursor-pointer hover:border-[var(--brand-primary)]/50" : ""} ${device.state === "on"
                                ? "bg-[var(--brand-dark)] border-[var(--brand-border)]"
                                : "bg-black/20 backdrop-blur-md/40 border-zinc-900/60 text-zinc-500"
                                }`}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-mono tracking-wider block uppercase">
                                    {device.type}
                                  </span>
                                  <button
                                    onClick={() =>
                                      toggleDeviceState(device.id, device.state)
                                    }
                                    className={`toggle-btn w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out cursor-pointer relative flex items-center shrink-0 active:scale-90 hover:brightness-110 shadow-inner ${device.state === "on"
                                      ? "bg-[var(--brand-primary,rgb(6,182,212))] shadow-[0_0_10px_var(--brand-primary,rgba(6,182,212,0.45))]"
                                      : "bg-zinc-800 border border-zinc-700/35"
                                      }`}
                                  >
                                    <div
                                      className={`bg-black/20 backdrop-blur-md w-4.5 h-4.5 rounded-full shadow-inner transition-transform duration-300 ease-in-out flex items-center justify-center ${device.state === "on"
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
                                <div className="mt-3">
                                  <span className="text-sm font-semibold text-zinc-200 block">
                                    {device.name}
                                  </span>
                                  <span className="text-xs font-mono opacity-80 block mt-1 text-zinc-400">
                                    {device.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SISTEMA E DEVOPS */}
                {activeTab === "system" && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full max-w-7xl mx-auto animate-fade-in">
                    <div className="space-y-6">
                      <SystemHealthMonitor />
                      <HardwareProcessingMonitor hardwareStats={{ cpu: "Servidor Jarvis" }} setActiveTab={setActiveTab} setSettingsTab={setSettingsTab} />
                    </div>

                    <div className="space-y-6">
                      <div className="holographic-card p-5 space-y-4">
                        <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase border-l-2 border-[var(--brand-primary)] pl-2">
                          Pipeline de Deploy Automation
                        </h3>
                        <div className="space-y-4 font-mono">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">1. Ambiente WSL2 / Docker</span>
                            <span className={systemState?.installer?.modules?.docker?.status === "completed" ? "text-[var(--brand-light)]" : "text-zinc-500"}>
                              {systemState?.installer?.modules?.docker?.status === "completed" ? "Pronto" : "Ok"}
                            </span>
                          </div>
                          <div className="w-full bg-black/20 backdrop-blur-md h-1.5 rounded overflow-hidden">
                            <div className="bg-[var(--brand-primary)] h-full transition-all" style={{ width: `${systemState?.installer?.modules?.docker?.progress || 100}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">2. Obsidian Vault Base</span>
                            <span className={systemState?.installer?.modules?.obsidian?.status === "completed" ? "text-[var(--brand-light)]" : "text-zinc-500"}>
                              {systemState?.installer?.modules?.obsidian?.status === "completed" ? "Estruturado" : "Ok"}
                            </span>
                          </div>
                          <div className="w-full bg-black/20 backdrop-blur-md h-1.5 rounded overflow-hidden">
                            <div className="bg-[var(--brand-primary)] h-full transition-all" style={{ width: `${systemState?.installer?.modules?.obsidian?.progress || 100}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-400">3. Workflows n8n</span>
                            <span className={systemState?.installer?.modules?.n8n?.status === "completed" ? "text-[var(--brand-light)]" : "text-zinc-500"}>
                              {systemState?.installer?.modules?.n8n?.status === "completed" ? "Online" : "Ok"}
                            </span>
                          </div>
                          <div className="w-full bg-black/20 backdrop-blur-md h-1.5 rounded overflow-hidden">
                            <div className="bg-[var(--brand-primary)] h-full transition-all" style={{ width: `${systemState?.installer?.modules?.n8n?.progress || 100}%` }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-[var(--brand-dark)] to-black border border-[var(--brand-border)] p-6 rounded-2xl space-y-4">
                        <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          Atalhos de Simulação
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                          Envie gatilhos simulando comandos do PC e voz ao JARVIS para ver o console operar comandos complexos.
                        </p>
                        <div className="flex flex-col gap-2.5 font-mono text-sm pt-2">
                          <button
                            onClick={() => handleSendMessage("Preparar meu ambiente de estudos no PC principal")}
                            className="bg-black hover:bg-[var(--brand-dark)] p-3 rounded-lg border border-zinc-800/60 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center transition-all shadow-sm"
                          >
                            <span>📚 Modo Estudos (Macro PC)</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSendMessage("Quanto gastei na minha categoria de Alimentação este mês?")}
                            className="bg-black hover:bg-[var(--brand-dark)] p-3 rounded-lg border border-zinc-800/60 hover:border-[var(--brand-border)] text-[var(--brand-light)] cursor-pointer flex justify-between items-center transition-all shadow-sm"
                          >
                            <span>💳 Consulta Otimizada RAG Financeira</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: FINANCE */}
                {activeTab === "finance" && (
                  <FinanceDashboard
                    systemState={systemState}
                    fetchSystemState={fetchSystemState}
                    handleExportPDF={handleExportPDF}
                    handleFileUpload={handleFileUpload}
                    handleDeleteFinance={handleDeleteFinance}
                    handleDeleteGoal={handleDeleteGoal}
                  />
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
                          className="space-y-3 bg-black/20 backdrop-blur-md border border-zinc-800/40 p-4 rounded-xl flex-1"
                        >
                          <h4 className="text-sm text-zinc-400 font-mono mb-2">
                            Agendar novo compromisso
                          </h4>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">
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
                              className="w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">
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
                              className="w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">
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
                              className="w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)]"
                            >
                              <option className="bg-black text-white" value="Trabalho">Trabalho</option>
                              <option className="bg-black text-white" value="Pessoal">Pessoal</option>
                              <option className="bg-black text-white" value="Estudos">Estudos</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 block mb-1">
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
                              className="w-full bg-black border border-zinc-800/40 rounded p-2 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] placeholder-zinc-700"
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

                        <div className="bg-black/20 backdrop-blur-md border border-zinc-800/40 p-4 rounded-xl text-center">
                          <h4 className="text-sm text-zinc-300 font-mono mb-2">
                            Adição por Arquivos via IA
                          </h4>
                          <p className="text-xs text-zinc-500 mb-3">
                            Suba um PDF de calendário acadêmico, voo, ou roteiro
                            para IA agendar automaticamente.
                          </p>
                          <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-sm font-mono py-1.5 px-3 rounded transition-all block">
                            📤 Upload de Arquivo (PDF/CSV)
                            <input
                              type="file"
                              className="hidden transition-all duration-300 hover:border-zinc-600 focus:shadow-sm group-hover:shadow-md border border-[var(--brand-glow)] shadow-[var(--brand-glow)]/20 transition-all"
                              onChange={(e) => handleFileUpload(e, "Agenda")}
                              accept=".pdf,.txt,.ics"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="w-full xl:w-2/3 border-t xl:border-t-0 xl:border-l border-zinc-800/40 xl:pl-6 pt-6 xl:pt-0">
                        <h3 className="text-xs font-mono font-medium text-zinc-300 uppercase tracking-widest pl-2 border-l-2 border-[var(--brand-primary)] mb-4">
                          Compromissos Registrados
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono w-full">
                          {systemState?.agenda?.map((item: any) => (
                            <div
                              key={item.id}
                              className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-zinc-800/40 flex flex-col h-full hover:border-zinc-700 transition duration-300"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="px-2 py-0.5 bg-[var(--brand-dark)] border border-[var(--brand-border)] text-xs text-[var(--brand-light)] rounded">
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
                              <div className="text-xs text-zinc-500 pt-2 pb-2 mb-auto mt-2 border-y border-zinc-900 leading-relaxed overflow-hidden text-clip whitespace-pre-wrap">
                                {item.notes || "Sem anotações complementares."}
                              </div>
                              <div className="text-xs font-medium mt-3 text-[var(--brand-light)] bg-[var(--brand-dark)]/20 px-2 py-1.5 rounded flex items-center justify-between">
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
                              <div className="col-span-2 text-center text-zinc-600 text-xs py-10 border border-dashed border-zinc-800/40 rounded-xl">
                                Nenhum compromisso cadastrado para o período.
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: DATABASE & RAG */}
                {activeTab === "database" && (
                  <DatabaseViewer
                    systemState={systemState}
                    fetchSystemState={fetchSystemState}
                  />
                )}

                {/* TAB 6: CONFIGURAÇÕES & IOT */}
                {activeTab === "settings" && (
                  <div className="flex h-full flex-1 min-h-0 w-full overflow-hidden border border-zinc-800/40 rounded-xl bg-black/20 backdrop-blur-md animate-fade-in relative z-10 shadow-2xl">
                    {/* Left Sidebar for Tabs */}
                    <div className="w-56 shrink-0 border-r border-zinc-800/40 bg-black/20 backdrop-blur-md/50 flex flex-col overflow-y-auto custom-scrollbar">

                      {/* Category: SISTEMA */}
                      <div className="p-3 text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800/40 bg-black/20 backdrop-blur-md">
                        Sistema
                      </div>
                      <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                        <button
                          onClick={() => setSettingsTab("general")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "general"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          ⚙️ Configurações & IoT
                        </button>
                        <button
                          onClick={() => setSettingsTab("appearance")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "appearance"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          🎨 Aparência
                        </button>
                        <button
                          onClick={() => setSettingsTab("updates")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap relative ${settingsTab === "updates"
                            ? "bg-[var(--brand-primary)]/20 text-[var(--brand-light)] font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-[var(--brand-primary)]/30"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          🔄 Atualizações
                          {updateState?.status === "available" && (
                            <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[var(--brand-light)] animate-ping"></span>
                          )}
                        </button>
                        <button
                          onClick={() => setSettingsTab("tokens")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "tokens"
                            ? "bg-[var(--brand-primary)]/20 text-[var(--brand-light)] font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)] border border-[var(--brand-primary)]/30"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          🔐 Senhas & Tokens
                        </button>
                        <button
                          onClick={() => setSettingsTab("users")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "users"
                            ? "bg-[var(--brand-primary)]/20 text-[var(--brand-light)] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-[var(--brand-primary)]/30"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          👥 Usuários Pessoas
                        </button>
                      </div>

                      {/* Category: WORKSPACE & IA */}
                      <div className="p-3 text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800/40 mt-2 bg-black/20 backdrop-blur-md">
                        Workspace & IA
                      </div>
                      <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                        <button
                          onClick={() => setSettingsTab("obsidian")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "obsidian"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          🧠 Obsidian RAG
                        </button>
                        <button
                          onClick={() => setSettingsTab("mcp")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "mcp"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          🔌 Integração MCP
                        </button>
                        <button
                          onClick={() => setSettingsTab("cudautil")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "cudautil"
                            ? "bg-indigo-500/20 text-indigo-400 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          📊 Telemetria CUDA
                        </button>
                      </div>

                      {/* Category: MANUTENÇÃO */}
                      <div className="p-3 text-sm font-mono text-zinc-500 uppercase tracking-widest border-b border-t border-zinc-800/40 mt-2 bg-black/20 backdrop-blur-md">
                        Manutenção
                      </div>
                      <div className="flex flex-col p-2 gap-1 font-mono text-xs">
                        <button
                          onClick={() => setSettingsTab("installer")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "installer"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          📦 Core Engine & Logs
                        </button>
                        <button
                          onClick={() => setSettingsTab("packager")}
                          className={`px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer whitespace-nowrap ${settingsTab === "packager"
                            ? "bg-[var(--brand-glow)] text-[var(--brand-light)] font-bold shadow-[0_0_10px_var(--brand-glow-strong)]"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
                            }`}
                        >
                          📦 Gerar Instalador
                        </button>
                      </div>
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/20 backdrop-blur-md custom-scrollbar relative">
                      {settingsTab === "packager" && <PackagerModule />}

                      {(settingsTab === "general" ||
                        settingsTab === "appearance") && (
                          <DeviceConfig
                            devices={systemState?.homeAssistant?.devices || []}
                            onRefresh={onRefreshStable}
                            currentTheme={currentTheme}
                            onChangeTheme={changeTheme}
                            bgImage={bgImage}
                            onChangeBgImage={changeBgImage}
                            configTab={settingsTab}
                            isDarkMode={true}
                            onToggleDarkMode={() => { }}
                          />
                        )}

                      {settingsTab === "installer" && (
                        <div className="space-y-6">
                          <LogsDocker />
                          <div className="bg-black/20 backdrop-blur-md/10 border border-zinc-900 p-1 rounded-xl">
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
                        <div className="grid grid-cols-1 gap-6 font-mono">
                          <div className="holographic-card p-5 space-y-4">
                            <h3 className="text-xs font-bold text-[var(--brand-light)] uppercase tracking-widest pl-2 border-l border-[var(--brand-primary)] mb-4">
                              🧠 Obsidian Vault — Memória RAG
                            </h3>
                            <p className="text-sm text-zinc-400 leading-normal mb-3">
                              O JARVIS injeta o conteúdo do seu Obsidian Vault diretamente no contexto do modelo LLM para respostas contextualizadas.
                              <code className="text-xs text-lime-400 font-bold bg-black/20 backdrop-blur-md border border-zinc-900 px-1 rounded ml-1">
                                Sync Auto
                              </code>
                            </p>

                            <div className="space-y-2 text-xs">
                              {systemState?.obsidianNotes?.length > 0 ? systemState.obsidianNotes.map((note: any, i: number) => (
                                <div
                                  key={i}
                                  className="w-full text-left p-3 rounded-lg border border-zinc-800/40 bg-black/20 backdrop-blur-md hover:bg-zinc-900/80 transition text-zinc-300 block hover:border-[var(--brand-border)] cursor-pointer"
                                >
                                  <span className="block font-bold text-[var(--brand-light)] text-xs">
                                    📄 {note.path}
                                  </span>
                                  <pre className="text-[10px] text-zinc-500 mt-1 whitespace-pre-wrap">{note.content.substring(0, 200)}{note.content.length > 200 ? "..." : ""}</pre>
                                </div>
                              )) : <p className="text-zinc-600 text-xs">Nenhuma nota encontrada no vault.</p>}
                            </div>

                            <div className="border-t border-zinc-800/40 pt-3 mt-4 text-xs text-zinc-500 leading-normal">
                              💡 <strong>Dica do JARVIS:</strong> O vault é lido recursivamente em tempo de boot. Adicione notas com palavras-chave relevantes para que o RAG as encontre automaticamente durante o chat.
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === "mcp" && <MCPSettings />}

                      {settingsTab === "cudautil" && <CUDATelemetryHUD />}

                      {settingsTab === "tokens" && <TokensManager />}

                      {settingsTab === "users" && <UserManager />}
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
                        Guia Definitivo: Deploy Completo (Windows)
                      </h3>

                      <div className="font-sans text-sm space-y-4">
                        <div>
                          <strong className="text-white block mb-1 text-xs">
                            1. Deploy Inicial no Servidor (Windows)
                          </strong>
                          <p className="text-zinc-500 mb-2 leading-relaxed">
                            Abra o PowerShell do seu servidor. Atualize o repositório com <code className="bg-black/20 backdrop-blur-md px-1 py-0.5 rounded text-white font-mono">git pull</code>. Em seguida, na aba lateral "Instalador", baixe o AutoInstaller.ps1 e execute como Administrador. <br />
                            <code className="bg-black/20 backdrop-blur-md px-1 py-0.5 rounded text-[var(--brand-light)] font-mono">./AutoInstaller.ps1</code><br />
                            Isso configurará a pasta do Obsidian. Depois suba os serviços no Docker e inicie o backend usando Node. Acesse a porta <strong>3000</strong> no navegador.
                          </p>
                        </div>
                        <div>
                          <strong className="text-[var(--brand-light)] block mb-1 text-xs">
                            2. Banco de Dados e Containers
                          </strong>
                          <p className="text-zinc-500 mb-2 leading-relaxed">
                            O script <code className="text-zinc-400 font-mono">.ps1</code> gerencia a ativação que "levanta" as bases de dados nos bastidores. O banco de dados PostgreSQL guardará suas tabelas relacionais de longo prazo nativamente e o repositório Obsidian atuará injetando contexto no RAG do modelo principal - tudo já orquestrado internamente para não haver necessidade de configuração manual extra.
                          </p>
                        </div>
                        <div>
                          <strong className="text-[var(--brand-light)] block mb-1 text-xs">
                            3. Inteligência em 100% Cloud (Groq LPU)
                          </strong>
                          <p className="text-zinc-500 mb-2 leading-relaxed">
                            Economize energia usando LLMs ultrarrápidos através do Groq Cloud. Vá em <strong>Chaves de APIs</strong> no menu superior e preencha a Groq API Key obtida gratuitamente em <a href="https://console.groq.com" target="_blank" className="text-[var(--brand-light)] underline">console.groq.com</a>. O JARVIS utiliza o modelo <code>llama-3.3-70b-versatile</code> via LPU para respostas instantâneas.
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
                          <strong className="text-[var(--brand-light)] block mb-1 text-xs">
                            5. Conectando a Segunda Memória (Obsidian)
                          </strong>
                          <p className="text-zinc-500 leading-relaxed">
                            Agora instale o <a href="https://obsidian.md" target="_blank" className="text-[var(--brand-light)] underline">Obsidian</a> no seu PC usando a pasta que configuramos (ex <code className="text-xs text-zinc-400">C:\jarvis-vault</code>). O JARVIS irá ler, vetorizar e escrever em <code>.md</code> de forma invisível. Suas anotações no celular agora conversarão com as anotações geradas via IA em tempo pseudo-real. E pronto, seu ecossistema está vivo 🚀.
                          </p>
                        </div>
                      </div>

                      <div className="bg-[var(--brand-dark)] border border-[var(--brand-border)] p-4.5 rounded-xl text-xs space-y-2">
                        <span className="text-[var(--brand-light)] font-mono font-bold block uppercase tracking-wider text-sm">
                          ⚡ CUDA RENDERING PERFORMANCE
                        </span>
                        <p className="text-sm text-zinc-400">
                          O "Servidor Jarvis" utiliza a
                          placa{" "}
                          <strong>
                            NVIDIA GeForce GTX 1650 (4GB VRAM)
                          </strong>
                          . Isso possibilita rodar o modelo Llama 3.3 com tempo
                          de resposta inferior a <strong>800ms por token</strong>{" "}
                          localmente.
                        </p>
                        <div className="w-full bg-black/20 backdrop-blur-md h-2 rounded overflow-hidden">
                          <div className="bg-[var(--brand-primary)] h-full w-[85%]"></div>
                        </div>
                      </div>
                    </div>

                    {/* Readme details */}
                    <div className="lg:col-span-2 bg-black/20 backdrop-blur-md border border-zinc-800/40 p-6 rounded-2xl overflow-y-auto leading-relaxed text-xs space-y-5 shadow-inner">
                      <div className="border-b border-zinc-800/40 pb-4">
                        <h2 className="text-xl font-bold text-white tracking-wide">
                          JARVIS v5.0 — Manual de Arquitetura
                        </h2>
                        <p className="text-xs uppercase tracking-wider text-[var(--brand-light)] font-mono mt-1">
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
                          <ul className="list-disc pl-5 mt-1.5 space-y-1 text-zinc-400 text-sm">
                            <li>
                              Ele instala o Docker Engine nativamente no terminal root do seu{" "}
                              "Servidor Jarvis".
                            </li>
                            <li>
                              Usa o <strong>PowerShell</strong> do Windows para instalar a estrutura do cofre e criar atalhos.
                            </li>
                            <li>
                              Cria a estrutura de pastas do seu Obsidian Vault no
                              caminho físico{" "}
                              <code className="text-yellow-400 text-xs">
                                C:\jarvis-vault
                              </code>
                              .
                            </li>
                            <li>
                              Popula os templates Markdown de controle financeiro,
                              de agenda e de perfis no local.
                            </li>
                            <li>
                              Integra e configura a API cognitiva ultraveloz do Groq Cloud.
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
                              NodeJS, Docker, n8n de orquestração e Groq LPU Cloud
                            </strong>
                            :
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-2 font-mono text-xs">
                            <div className="bg-black/20 backdrop-blur-md p-2.5 rounded border border-zinc-900">
                              <strong className="text-[var(--brand-light)] block mb-0.5">
                                Groq Cloud LPU
                              </strong>
                              Processamento cognitivo de altíssima velocidade na nuvem,
                              poupando o consumo local de RAM/VRAM do host.
                            </div>
                            <div className="bg-black/20 backdrop-blur-md p-2.5 rounded border border-zinc-900">
                              <strong className="text-[var(--brand-light)] block mb-0.5">
                                RAG & Obsidian Vault / Contexto
                              </strong>
                              O n8n monitora o ecossistema. Qualquer transação ou anotação
                              é processada e estruturada para sincronização e injeção de contexto.
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
                          <div className="bg-black/20 backdrop-blur-md/80 p-3 rounded-lg border border-zinc-900 text-zinc-400 font-mono text-xs space-y-1">
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
                            <pre className="bg-black p-2 rounded text-[var(--brand-light)] font-mono text-xs mt-1.5">
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
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Futuristic Bottom Status Bar Footer */}
        <footer className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-mono gap-3 shrink-0">
          <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
            <span>SISTEMA: ONLINE</span>
            <span>SINAL TELEGRAM BOT: AGUARDANDO POLCHING</span>
            <span>DOCKER SUBNET: 172.18.0.0/16</span>
            <span>LOCAL DEPLOYS: {import.meta.env.VITE_OBSIDIAN_VAULT_PATH || "VAULT LOCAL"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse"></span>
            <span className="text-[var(--brand-primary)] uppercase tracking-tighter">
              Conexão Master Host: Ativa
            </span>
          </div>
        </footer>
        {/* Modals */}
        {selectedLight && (
          <HALightControlModal
            device={selectedLight}
            onClose={() => setSelectedLight(null)}
            serverUrl={getServerUrl()}
          />
        )}
      </div>
    </div>
  );
}
