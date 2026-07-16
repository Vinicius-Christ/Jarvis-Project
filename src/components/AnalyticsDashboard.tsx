import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function AnalyticsDashboard() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/evals')
            .then(res => res.json())
            .then(json => {
                setData(json);
            })
            .catch(err => console.error("Falha ao puxar evals", err));
    }, []);

    if (data.length === 0) {
        return <div className="p-4 text-gray-400">Nenhum dado analítico gerado ainda pela pipeline de Learning Loop.</div>;
    }

    // Aggregate metrics
    const successCount = data.filter(d => d.status === 'success').length;
    const failCount = data.filter(d => d.status === 'failed').length;

    const chartData = [
        { name: "Sucessos", value: successCount, fill: "#4ade80" },
        { name: "Erros", value: failCount, fill: "#f87171" }
    ];

    const skillGroups: Record<string, any> = {};
    data.forEach(d => {
        if (!skillGroups[d.skill]) skillGroups[d.skill] = { name: d.skill, latencies: [] };
        skillGroups[d.skill].latencies.push(d.latency_seconds);
    });

    const latencyData = Object.values(skillGroups).map(g => ({
        name: g.name,
        mediaLatencia: Number((g.latencies.reduce((a: number, b: number) => a + b, 0) / g.latencies.length).toFixed(2))
    }));

    return (
        <div className="p-6 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl flex flex-col gap-6 w-full backdrop-blur-md bg-opacity-80">
            <h2 className="text-2xl font-bold mb-2 font-sans tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Telemetry & AI Analytics</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-medium text-gray-300 mb-4">Taxa de Sucesso (Skills Evals)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700/50">
                    <h3 className="text-lg font-medium text-gray-300 mb-4">Latência Média por Contexto (Segundos)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={latencyData}>
                            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                            <Line type="monotone" dataKey="mediaLatencia" stroke="#60a5fa" strokeWidth={4} dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
