import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { getServerUrl } from '../lib/api';

export default function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/users", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("jarvis_token")}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
       console.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    if(!email || !password) return;
    try {
      const res = await fetch(getServerUrl() + "/api/users", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jarvis_token")}`
        },
        body: JSON.stringify({ email, password, role })
      });
      if (res.ok) {
        setEmail('');
        setPassword('');
        fetchUsers();
      }
    } catch(e) {}
  };

  const handleUpdate = async (id: number) => {
    try {
      const res = await fetch(getServerUrl() + "/api/users/" + id, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("jarvis_token")}`
        },
        body: JSON.stringify({ email, role, password })
      });
      if (res.ok) {
        setEditingId(null);
        setEmail('');
        setPassword('');
        fetchUsers();
      }
    } catch(e) {}
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Remover usuário?")) return;
    try {
      const res = await fetch(getServerUrl() + "/api/users/" + id, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("jarvis_token")}` }
      });
      if (res.ok) fetchUsers();
    } catch(e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4 text-emerald-400">
        <Shield className="w-5 h-5" />
        <h2 className="font-bold text-lg">Controle de Usuários</h2>
      </div>

      <div className="holographic-card p-4 space-y-4">
        <h3 className="text-xs font-bold text-zinc-300 uppercase">{editingId ? "Editar Usuário" : "Novo Usuário"}</h3>
        <div className="flex flex-col gap-3">
          <input 
            type="email" 
            placeholder="E-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="bg-black/50 border border-zinc-800 p-2 rounded text-sm text-zinc-200 outline-none focus:border-emerald-500" 
          />
          <input 
            type={editingId ? "text" : "password"} 
            placeholder={editingId ? "Nova Senha (Opcional)" : "Senha"} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="bg-black/50 border border-zinc-800 p-2 rounded text-sm text-zinc-200 outline-none focus:border-emerald-500" 
          />
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="bg-black/50 border border-zinc-800 p-2 rounded text-sm text-zinc-200 outline-none focus:border-emerald-500"
          >
            <option value="user">Usuário Comum</option>
            <option value="admin">Administrador</option>
          </select>
          {editingId ? (
            <div className="flex gap-2">
              <button onClick={() => handleUpdate(editingId)} className="flex-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/40 p-2 rounded flex justify-center items-center gap-2 transition-all">
                <Check className="w-4 h-4" /> Salvar Edição
              </button>
              <button 
                onClick={() => { setEditingId(null); setEmail(""); setPassword(""); }} 
                className="bg-red-500/10 text-red-400 p-2 hover:bg-red-500/20 border border-red-500/20 rounded transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2 rounded flex justify-center items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          )}
        </div>
      </div>

      <div className="holographic-card overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="text-xs uppercase bg-black/40 text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-mono">{u.id}</td>
                <td className="px-4 py-3 text-white">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 pb-3 flex justify-end gap-2">
                  <button onClick={() => { setEditingId(u.id); setEmail(u.email); setRole(u.role); setPassword(""); }} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600">Nenhum usuário cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
