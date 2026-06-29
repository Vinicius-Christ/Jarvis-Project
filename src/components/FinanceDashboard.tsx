import React, { useState, useMemo } from 'react';
import { DollarSign, Copy, Trash2, Info, ChevronRight, PieChart as PieChartIcon, Edit2, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ComposedChart, Area, PieChart, Pie, Legend } from 'recharts';
import { fetchAutenticado } from '../lib/api';

interface FinanceDashboardProps {
  systemState: any;
  fetchSystemState: () => void;
  handleExportPDF: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleDeleteFinance: (description: string) => void;
  handleDeleteGoal: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'];

export default function FinanceDashboard({
  systemState, fetchSystemState, handleExportPDF, handleFileUpload, handleDeleteFinance, handleDeleteGoal
}: FinanceDashboardProps) {
  
  const [financeForm, setFinanceForm] = useState({ id: null as number | null, value: "", type: "Despesa", category: "EducaÃ§Ã£o", description: "" });
  const [goalForm, setGoalForm] = useState({ limit: "", reason: "" });

  const handleFinanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeForm.value || !financeForm.description) return;
    try {
      const categoryToUse = financeForm.type === "Receita" ? "Receita" : financeForm.category;
      await fetchAutenticado("/api/update/finance", {
        method: "POST",
        body: JSON.stringify({
          value: parseFloat(financeForm.value),
          category: categoryToUse,
          description: financeForm.description,
          date: new Date().toISOString().split("T")[0],
          id: financeForm.id
        }),
      });
      setFinanceForm({ id: null, value: "", type: "Despesa", category: "EducaÃ§Ã£o", description: "" });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.limit || !goalForm.reason) return;
    try {
      await fetchAutenticado("/api/update/goal", {
        method: "POST",
        body: JSON.stringify({ limit: parseFloat(goalForm.limit), reason: goalForm.reason }),
      });
      setGoalForm({ limit: "", reason: "" });
      fetchSystemState();
    } catch { /* ignore */ }
  };

  const handleEditFinance = (item: any) => {
    setFinanceForm({
      id: item.id,
      value: item.value.toString(),
      type: item.type || "Despesa",
      category: item.category || "EducaÃ§Ã£o",
      description: item.description || ""
    });
    document.getElementById("finance-report-area")?.scrollIntoView({ behavior: "smooth" });
  };

  const currentGoal = systemState?.goal || { limit: 1500, reason: "Aposentadoria" };
  
  const { totalIncome, totalExpense, guardado } = useMemo(() => {
    if (!systemState?.finances) return { totalIncome: 0, totalExpense: 0, guardado: 0 };
    const res = systemState.finances.reduce(
        (acc: any, f: any) => {
          const val = Math.abs(typeof f.value === 'number' ? f.value : parseFloat(f.value) || 0);
          if (f.type === "Receita" || ["renda", "receita", "salÃ¡rio", "salario"].includes((f.category || "").toLowerCase())) acc.income += val;
          else acc.expense += val;
          return acc;
        },
        { income: 0, expense: 0 }
    );
    return {
        totalIncome: res.income,
        totalExpense: res.expense,
        guardado: res.income - res.expense
    };
  }, [systemState?.finances]);

  const savingsData = useMemo(() => {
    const monthlyData: Record<string, { income: number, expense: number }> = {};
    
    const today = new Date();
    const boundaryDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { income: 0, expense: 0 };
    }
    
    let accumulatedSavings = 0;

    if (systemState?.finances) {
        systemState.finances.forEach((f: any) => {
           if (!f.date) return;
           const [yearStr, monthStr, dayStr] = f.date.split('T')[0].split('-');
           const localDate = new Date(parseInt(yearStr), parseInt(monthStr)-1, parseInt(dayStr) || 1);
           
           if (isNaN(localDate.getTime())) return;
           
           const val = Math.abs(typeof f.value === 'number' ? f.value : parseFloat(f.value) || 0);
           const isIncome = f.type === "Receita" || ["renda", "receita", "salÃ¡rio", "salario"].includes((f.category || "").toLowerCase());
           
           if (localDate < boundaryDate) {
               if (isIncome) accumulatedSavings += val;
               else accumulatedSavings -= val;
           } else {
               const monthKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}`;
               if (monthlyData[monthKey]) {
                   if (isIncome) monthlyData[monthKey].income += val;
                   else monthlyData[monthKey].expense += val;
               } else {
                   // Se por acaso for de um mÃªs no futuro (improvÃ¡vel, mas possÃ­vel)
                   if (isIncome) accumulatedSavings += val;
                   else accumulatedSavings -= val;
               }
           }
        });
    }

    const sortedKeys = Object.keys(monthlyData).sort();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return sortedKeys.map(key => {
        const data = monthlyData[key];
        const monthSavings = data.income - data.expense;
        accumulatedSavings += monthSavings;
        const [year, month] = key.split('-');
        const label = `${monthNames[parseInt(month, 10) - 1]}/${year.slice(2)}`;
        
        return { 
           mes: label, 
           acumulado: accumulatedSavings,
           receita: data.income,
           despesa: data.expense,
           saldo: monthSavings
        };
    });
  }, [systemState?.finances]);

  const categoryChartData = useMemo(() => {
    if (!systemState?.finances) return [];
    const gastos: Record<string, number> = {};
    systemState.finances.forEach((f: any) => {
      if (f.type !== "Receita" && !["renda", "receita", "salÃ¡rio", "salario"].includes((f.category || "").toLowerCase())) {
        const val = Math.abs(typeof f.value === 'number' ? f.value : parseFloat(f.value) || 0);
        const cat = f.category || "Outros";
        gastos[cat] = (gastos[cat] || 0) + val;
      }
    });

    return Object.keys(gastos).map(c => ({
      name: c,
      value: gastos[c]
    })).sort((a, b) => b.value - a.value);
  }, [systemState?.finances]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
        <div className="flex justify-between items-center holographic-card bg-gradient-to-r from-[var(--brand-dark)]/20 to-zinc-950 border-[var(--brand-primary)]/30 hover-glow">
            <div className="flex flex-col">
                <h3 className="text-[var(--brand-light)] font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Wallet className="h-5 w-5" /> InteligÃªncia Financeira
                </h3>
                <span className="text-zinc-500 font-mono text-[11px] mt-1">AnÃ¡lise de Fluxo de Caixa e ProjeÃ§Ãµes</span>
            </div>
            <button 
                onClick={handleExportPDF}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 hover:border-zinc-400 px-4 py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
                Exportar .PDF <ChevronRight className="h-3 w-3" />
            </button>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel border border-white/10 p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="h-16 w-16 text-[var(--brand-primary)]" />
                </div>
                <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Total de Receitas</span>
                <span className="text-2xl font-semibold text-[var(--brand-light)]">R$ {totalIncome.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="glass-panel hover-glow p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown className="h-16 w-16 text-red-500" />
                </div>
                <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Total de Despesas</span>
                <span className="text-2xl font-semibold text-red-400">R$ {totalExpense.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="glass-panel hover-glow border-[var(--brand-primary)] p-5 rounded-2xl flex flex-col justify-center relative overflow-hidden group shadow-[0_0_20px_var(--brand-glow)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="h-16 w-16 text-[var(--brand-light)]" />
                </div>
                <span className="text-[11px] text-zinc-400 font-mono uppercase tracking-wider mb-1">Saldo Atual (LÃ­quido)</span>
                <span className={`text-3xl font-bold ${guardado >= 0 ? 'text-[var(--brand-light)]' : 'text-red-500'}`}>
                    R$ {guardado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
            </div>
        </div>

        <div id="finance-report-area" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Lado Esquerdo: Metas e LanÃ§amento */}
            <div className="space-y-6">
                
                {/* Meta Financeira */}
                <div className="holographic-card p-5 space-y-5 rounded-2xl glass-panel border border-white/10 backdrop-blur-md">
                    <div>
                        <h3 className="text-xs font-mono font-medium text-[var(--brand-light)] uppercase flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4" /> Meta de Economia Mensal
                        </h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 font-mono">Objetivo</span>
                                <span className="text-sm font-semibold text-zinc-200">{currentGoal.reason}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 font-mono">Valor Limite</span>
                                <span className="text-sm font-semibold text-[var(--brand-light)]">R$ {typeof currentGoal.limit === 'number' && !isNaN(currentGoal.limit) ? currentGoal.limit.toFixed(2) : '0.00'}</span>
                            </div>
                        </div>
                        
                        {/* Barra de Progresso do Saldo vs Meta */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10/50">
                            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-2">
                                <span>Progresso da Meta</span>
                                <span>{currentGoal.limit > 0 ? Math.max(0, (guardado / currentGoal.limit) * 100).toFixed(1) : 0}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                                <div className="h-2.5 rounded-full transition-all duration-1000 ease-out" 
                                     style={{ width: `${Math.min(100, Math.max(0, currentGoal.limit > 0 ? (guardado / currentGoal.limit) * 100 : 0))}%`, 
                                              backgroundColor: guardado >= currentGoal.limit ? '#10b981' : 'var(--brand-primary)' }}>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleGoalSubmit} className="space-y-3 pt-3 border-t border-white/10/50">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="number" step="0.01" required
                                value={goalForm.limit}
                                onChange={(e) => setGoalForm({ ...goalForm, limit: e.target.value })}
                                placeholder="Valor R$"
                                className="bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                            />
                            <input
                                type="text" required
                                value={goalForm.reason}
                                onChange={(e) => setGoalForm({ ...goalForm, reason: e.target.value })}
                                placeholder="Motivo (ex: Viagem)"
                                className="bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                            />
                        </div>
                        <button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg py-2.5 text-xs font-mono uppercase tracking-wider transition-all">
                            Ajustar Meta
                        </button>
                    </form>
                </div>

                {/* Formulario de LanÃ§amento */}
                <div className="holographic-card p-5 rounded-2xl glass-panel border border-white/10 backdrop-blur-md">
                    <h3 className="text-xs font-mono font-medium text-[var(--brand-light)] uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Edit2 className="h-4 w-4" /> LanÃ§amento RÃ¡pido
                    </h3>
                    
                    <form onSubmit={handleFinanceSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] text-zinc-500 font-mono block mb-1">DescriÃ§Ã£o</label>
                            <input
                                type="text" required
                                value={financeForm.description}
                                onChange={(e) => setFinanceForm({ ...financeForm, description: e.target.value })}
                                placeholder="Ex: Supermercado"
                                className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-zinc-500 font-mono block mb-1">Valor</label>
                                <input
                                    type="number" step="0.01" required
                                    value={financeForm.value}
                                    onChange={(e) => setFinanceForm({ ...financeForm, value: e.target.value })}
                                    placeholder="R$"
                                    className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 font-mono block mb-1">Tipo</label>
                                <select
                                    value={financeForm.type}
                                    onChange={(e) => setFinanceForm({ ...financeForm, type: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                                >
                                    <option value="Receita">Receita</option>
                                    <option value="Despesa">Despesa</option>
                                </select>
                            </div>
                        </div>
                        {financeForm.type === "Despesa" && (
                            <div>
                                <label className="text-[10px] text-zinc-500 font-mono block mb-1">Categoria</label>
                                <select
                                    value={financeForm.category}
                                    onChange={(e) => setFinanceForm({ ...financeForm, category: e.target.value })}
                                    className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[var(--brand-border)] transition-colors"
                                >
                                    <option value="ServiÃ§os">ServiÃ§os</option>
                                    <option value="EducaÃ§Ã£o">EducaÃ§Ã£o</option>
                                    <option value="Lazer">Lazer</option>
                                    <option value="AlimentaÃ§Ã£o">AlimentaÃ§Ã£o</option>
                                    <option value="SaÃºde">SaÃºde</option>
                                    <option value="Moradia">Moradia</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        )}
                        <button type="submit" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-light)] text-black font-bold rounded-lg py-3 text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_var(--brand-glow)]">
                            {financeForm.id ? "Salvar AlteraÃ§Ã£o" : "LanÃ§ar Registro"}
                        </button>
                        {financeForm.id && (
                            <button
                                type="button"
                                onClick={() => setFinanceForm({ id: null, value: "", type: "Despesa", category: "EducaÃ§Ã£o", description: "" })}
                                className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 rounded-lg py-2 text-xs font-mono uppercase tracking-wider transition-all"
                            >
                                Cancelar
                            </button>
                        )}
                    </form>

                    <div className="mt-6 pt-5 border-t border-white/10/50">
                        <label className="cursor-pointer flex items-center justify-center gap-2 w-full border border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 hover:bg-[var(--brand-primary)]/10 text-[var(--brand-light)] text-xs font-mono py-4 px-4 rounded-xl transition-all text-center">
                            <Info className="h-4 w-4" /> Importar Extrato (PDF/CSV) via IA
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, "FinanÃ§as")}
                                accept=".pdf,.xml,.csv"
                            />
                        </label>
                    </div>
                </div>

            </div>

            {/* Lado Direito: Dashboards e Tabela */}
            <div className="col-span-1 xl:col-span-2 flex flex-col space-y-6">
                
                {/* GrÃ¡ficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* GrÃ¡fico de EvoluÃ§Ã£o (Composed) */}
                    <div className="holographic-card p-5 rounded-2xl glass-panel border border-white/10 backdrop-blur-md h-[320px] flex flex-col">
                        <h4 className="text-[11px] uppercase tracking-widest text-[var(--brand-light)] font-mono mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> EvoluÃ§Ã£o de Fluxo de Caixa
                        </h4>
                        <div className="flex-1 w-full">
                            {savingsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={savingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis dataKey="mes" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(1)+'k' : value}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                                            itemStyle={{ fontSize: 11, fontFamily: "monospace" }}
                                            labelStyle={{ color: "#a1a1aa", fontSize: 12, marginBottom: "8px", fontWeight: "bold" }}
                                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: "10px" }} />
                                        <Bar dataKey="receita" name="Receita" fill="#10b981" barSize={10} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="despesa" name="Despesa" fill="#ef4444" barSize={10} radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="var(--brand-primary)" strokeWidth={3} dot={{ r: 4, fill: "black", stroke: "var(--brand-primary)", strokeWidth: 2 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono">Sem dados histÃ³ricos</div>
                            )}
                        </div>
                    </div>

                    {/* GrÃ¡fico de Categorias (Pie) */}
                    <div className="holographic-card p-5 rounded-2xl glass-panel border border-white/10 backdrop-blur-md h-[320px] flex flex-col">
                        <h4 className="text-[11px] uppercase tracking-widest text-[var(--brand-light)] font-mono mb-4 flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4" /> Despesas por Categoria
                        </h4>
                        <div className="flex-1 w-full relative">
                            {categoryChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px" }}
                                            itemStyle={{ fontSize: 11, fontFamily: "monospace", color: "#fff" }}
                                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Valor"]}
                                        />
                                        <Legend 
                                            layout="vertical" 
                                            verticalAlign="middle" 
                                            align="right"
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 10, lineHeight: "24px" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 text-xs font-mono">Sem dados de despesa</div>
                            )}
                            
                            {/* Centro do GrÃ¡fico */}
                            {categoryChartData.length > 0 && (
                                <div className="absolute top-1/2 left-[50%] md:left-[35%] lg:left-[30%] xl:left-[35%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <span className="block text-[10px] text-zinc-500 font-mono">Total</span>
                                    <span className="block text-sm font-bold text-white">R$ {totalExpense.toFixed(0)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabela de TransaÃ§Ãµes */}
                <div className="holographic-card rounded-2xl glass-panel border border-white/10 backdrop-blur-md overflow-hidden flex flex-col flex-1">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <h4 className="text-[11px] uppercase tracking-widest text-zinc-300 font-mono font-bold">HistÃ³rico de TransaÃ§Ãµes</h4>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left font-mono text-[11px] border-collapse relative">
                            <thead className="sticky top-0 glass-panel backdrop-blur z-10 shadow-sm">
                                <tr className="text-zinc-500">
                                    <th className="py-3 px-4 font-medium">Data</th>
                                    <th className="py-3 px-4 font-medium">DescriÃ§Ã£o</th>
                                    <th className="py-3 px-4 font-medium">Categoria</th>
                                    <th className="py-3 px-4 font-medium text-right">Valor</th>
                                    <th className="py-3 px-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {systemState?.finances && systemState.finances.length > 0 ? (
                                    systemState.finances.slice().sort((a: any, b: any) => {
                                        const dA = new Date(a.date.split('T')[0]);
                                        const dB = new Date(b.date.split('T')[0]);
                                        return dB.getTime() - dA.getTime() || b.id - a.id;
                                    }).map((item: any) => (
                                        <tr key={item.id} className="text-zinc-300 group hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                                                {item.date ? item.date.split('T')[0].split('-').reverse().join('/') : ''}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-white">
                                                {item.description}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] bg-white/5 border border-white/10 ${item.type === 'Receita' ? 'text-[var(--brand-light)] border-[var(--brand-dark)]/50' : 'text-zinc-400'}`}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 text-right font-medium ${item.type === 'Receita' ? 'text-[var(--brand-light)]' : 'text-red-400'}`}>
                                                {item.type === 'Receita' ? '+' : '-'} R$ {typeof item.value === 'number' && !isNaN(item.value) ? item.value.toFixed(2) : '0.00'}
                                            </td>
                                            <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                <button onClick={() => handleEditFinance(item)} className="text-zinc-500 hover:text-[var(--brand-primary)] transition-colors p-1" title="Editar">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => handleDeleteFinance(item.description)} className="text-zinc-500 hover:text-red-500 transition-colors p-1 ml-1" title="Excluir">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs font-mono">
                                            Nenhuma transaÃ§Ã£o registrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
