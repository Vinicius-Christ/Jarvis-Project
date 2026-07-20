import React, {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ShieldAlert, Key, Loader2 } from "lucide-react";
import { GoogleOAuthProvider } from '@react-oauth/google';

// ─── Zoom Control (Ctrl+ / Ctrl- / Ctrl+0) ───────────────────────────────────
let currentZoom = parseFloat(localStorage.getItem('jarvis_zoom') || '1');

function applyZoom(zoom: number) {
  // Revert back to WebKit's native zoom, which properly scales the layout grid.
  // The only reason it broke previously was because of the '100dvh' unit which ignored zoom scale.
  // Now that App uses 'h-full', CSS zoom will perfectly scale the app without breaking mouse coords or layout.
  document.documentElement.style.zoom = String(zoom);
  
  // Clean up the transform hacks on root and body
  const root = document.getElementById('root');
  if (root) {
    root.style.position = '';
    root.style.top = '';
    root.style.left = '';
    root.style.transform = '';
    root.style.transformOrigin = '';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.overflow = '';
  }
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.width = '100%';
  document.body.style.height = '100%';
}

function showZoomToast(level: number) {
  let el = document.getElementById('zoom-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'zoom-toast';
    el.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:rgba(30,20,60,0.92);color:#a78bfa;
      padding:8px 18px;border-radius:10px;font-size:14px;
      font-family:monospace;border:1px solid rgba(139,92,246,0.4);
      box-shadow:0 4px 24px rgba(0,0,0,0.5);transition:opacity 0.3s;
      pointer-events:none;
    `;
    document.body.appendChild(el);
  }
  el.textContent = `Zoom: ${Math.round(level * 100)}%`;
  el.style.opacity = '1';
  clearTimeout((el as any)._t);
  (el as any)._t = setTimeout(() => { if (el) el.style.opacity = '0'; }, 1500);
}

// Apply saved zoom as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => applyZoom(currentZoom));
} else {
  // Already loaded — apply after a microtask so React has mounted #root
  Promise.resolve().then(() => applyZoom(currentZoom));
}

// Reapply on window resize so height compensation stays accurate
window.addEventListener('resize', () => applyZoom(currentZoom));

window.addEventListener('keydown', (e) => {
  if (!e.ctrlKey) return;
  const step = 0.1;
  if (e.key === '=' || e.key === '+') {
    e.preventDefault();
    currentZoom = Math.min(3, parseFloat((currentZoom + step).toFixed(1)));
  } else if (e.key === '-') {
    e.preventDefault();
    currentZoom = Math.max(0.3, parseFloat((currentZoom - step).toFixed(1)));
  } else if (e.key === '0') {
    e.preventDefault();
    currentZoom = 1;
  } else return;
  applyZoom(currentZoom);
  localStorage.setItem('jarvis_zoom', String(currentZoom));
  showZoomToast(currentZoom);
});
// ─────────────────────────────────────────────────────────────────────────────




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
              <div className="holographic-card border border-[var(--brand-primary)]/20 p-8 flex flex-col items-center bg-zinc-950/80 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-light)] to-[var(--brand-primary)]" />
                <ShieldAlert className="w-12 h-12 text-[var(--brand-light)] mb-4 animate-pulse" />
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
                      className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-sm text-zinc-200 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500 uppercase">Senha</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 p-2.5 rounded text-sm text-zinc-200 outline-none focus:border-[var(--brand-primary)] transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)] text-white font-semibold rounded-lg flex items-center justify-center gap-2.5 transition active:scale-98 shadow-md border border-[var(--brand-primary)]/20 text-xs tracking-wider uppercase cursor-pointer disabled:opacity-50 mt-2"
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
