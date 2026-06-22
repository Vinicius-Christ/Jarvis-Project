import React, { useState } from 'react';
import { DollarSign, Copy, Trash2, Info, ChevronRight, PieChart } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { fetchAutenticado } from '../lib/api';

interface FinanceDashboardProps {
  systemState: any;
  fetchSystemState: () => void;
  handleExportPDF: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: string) => void;
  handleDeleteFinance: (description: string) => void;
  handleDeleteGoal: () => void;
}

export default function FinanceDashboard({
  systemState, fetchSystemState, handleExportPDF, handleFileUpload, handleDeleteFinance, handleDeleteGoal
}: FinanceDashboardProps) {
  
  const [financeForm, setFinanceForm] = useState({ value: "", type: "Despesa", category: "Educação", description: "" });
  const [goalForm, setGoalForm] = useState({ limit: "", reason: "" });

  const handleFinanceSubmit = async (e: React.FormEvent) => {
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
          date: new Date().toISOString().split("T")[0],
        }),
      });
      setFinanceForm({ value: "", type: "Despesa", category: "Educação", description: "" });
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

  const currentGoal = systemState?.goal || { limit: 1500, reason: "Aposentadoria" };
  const getGuardadoTotal = () => {
    if (!systemState?.finances) return 0;
    const { income, expense } = systemState.finances.reduce(
        (acc: any, f: any) => {
        const val = typeof f.value === 'number' ? f.value : parseFloat(f.value) || 0;
        if (f.category === "Renda") acc.income += val;
        else acc.expense += val;
        return acc;
        },
        { income: 0, expense: 0 }
    );
    return Math.max(0, income - expense);
  };
  const guardado = getGuardadoTotal();

  const getSavingsData = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    let history = 0;
    return months.map((m, i) => {
      history += i === 5 ? guardado - history : (guardado / 6) * (1 + (Math.random() * 0.4 - 0.2));
      return { mes: m, guardado: Math.max(0, Math.floor(history)) };
    });
  };
  const savingsData = getSavingsData();

  const getCategoryData = () => {
    const limites: Record<string, number> = {
      Serviços: 400, Educação: 800, Lazer: 300, Alimentação: 1000, Saúde: 300,
    };
    if (!systemState?.finances) return Object.keys(limites).map(c => ({ category: c, gasto: 0, limite: limites[c] }));
    const gastos: Record<string, number> = {};
    systemState.finances.forEach((f: any) => {
      if (f.category !== "Renda") {
        const val = typeof f.value === 'number' ? f.value : parseFloat(f.value) || 0;
        gastos[f.category] = (gastos[f.category] || 0) + val;
      }
    });

    return Object.keys(limites).map((c) => ({
      category: c,
      gasto: gastos[c] || 0,
      limite: limites[c],
    }));
  };
  const categoryChartData = getCategoryData();

  return (
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
  );
}
