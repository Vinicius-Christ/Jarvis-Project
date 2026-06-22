import React, {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ShieldAlert, Key, Loader2 } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';

// Override Global Fetch
const originalFetch = window.fetch;
Object.defineProperty(window, "fetch", {
  configurable: true,
  enumerable: true,
  writable: true,
  value: async function (...args: any[]) {
    let [resource, config] = args;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    if (typeof resource === 'string' && resource.includes('/api/public/')) {
        return originalFetch(resource, config);
    }
  
    const token = localStorage.getItem("jarvis_token");
    if (token) {
      if (config.headers instanceof Headers) {
         config.headers.set('Authorization', 'Bearer ' + token);
      } else {
         config.headers = { ...config.headers, 'Authorization': 'Bearer ' + token };
      }
    }
    const response = await originalFetch(resource, config);
    if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new Event('auth_error'));
    }
    return response;
  }
});

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleAuthError = () => {
       setIsAuthenticated(false);
       localStorage.removeItem("jarvis_token");
    };
    window.addEventListener('auth_error', handleAuthError);
    
    const token = localStorage.getItem("jarvis_token");
    if (token) {
        setIsAuthenticated(true);
    }

    return () => window.removeEventListener('auth_error', handleAuthError);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    
    try {
      const res = await originalFetch(window.location.origin + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("jarvis_token", data.token);
        setIsAuthenticated(true);
      } else {
        setErrorMsg(data.error || "Credenciais inválidas.");
      }
    } catch(err) {
      setErrorMsg("Falha ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono gap-6 p-4">
              <div className="holographic-card border border-emerald-500/20 p-8 flex flex-col items-center bg-zinc-950/80 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-500" />
                <ShieldAlert className="w-12 h-12 text-emerald-400 mb-4 animate-pulse" />
                <h1 className="text-xl font-bold tracking-widest text-[var(--brand-light)] mb-2">JARVIS CORE PORTAL</h1>
                <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
                   Acesso estrito.<br/>Insira suas credenciais de acesso seguro.
                </p>

                {errorMsg && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded w-full text-center border border-red-500/20 mb-4">{errorMsg}</p>}

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500 uppercase">E-mail</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500 uppercase">Senha</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-sm text-zinc-200 outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2.5 transition active:scale-98 shadow-md border border-emerald-500/20 text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Acessar
                  </button>
                </form>
              </div>
          </div>
      );
  }

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "108258960134-pe7s1qcv8219eb3r8g8n0j98panblktv.apps.googleusercontent.com"}>
      <AuthWrapper>
        <App />
      </AuthWrapper>
    </GoogleOAuthProvider>
  </StrictMode>,
);
