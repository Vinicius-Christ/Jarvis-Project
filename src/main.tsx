import React, {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { ShieldAlert } from "lucide-react";

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
  
    const token = localStorage.getItem("google_token");
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

// Check if running on localhost container/development (bypasses auth usually on backend)
const isPrivateIP = (hostname: string) => {
  return hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
};
const isLocal = isPrivateIP(window.location.hostname);
let globalAllowedEmail = "viniciusc.castro09@gmail.com";

function GoogleLoginButton({ onSuccess, onError }: { onSuccess: (token: string, email: string) => void; onError: (msg: string) => void }) {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!tokenResponse.access_token) {
          onError("Nenhum access token retornado do Google.");
          return;
        }

        // Busca o perfil do usuário pelo access token via Google API oficial no client
        const checkRes = await originalFetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });

        if (!checkRes.ok) {
          onError("Erro ao carregar informações de perfil do Google.");
          return;
        }

        const profile = await checkRes.json();
        if (profile.email !== globalAllowedEmail) {
          onError(`Acesso Negado: O e-mail ${profile.email || "desconhecido"} não tem autorização.`);
          return;
        }

        // Se o email está autorizado, salva o token e conclui
        onSuccess(tokenResponse.access_token, profile.email);
      } catch (err) {
        console.error("Login verification failed", err);
        onError("Falha na verificação de conta.");
      }
    },
    onError: () => onError("Login cancelado ou erro no popup do Google.")
  });

  return (
    <button
      onClick={() => login()}
      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2.5 transition active:scale-98 shadow-md border border-emerald-500/20 text-xs tracking-wider uppercase cursor-pointer"
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 1.455 15.42.5 12.24.5 5.866.5.68 5.645.68 12s5.185 11.5 11.56 11.5c6.645 0 11.066-4.636 11.066-11.237 0-.756-.08-1.333-.18-1.978H12.24z"/>
      </svg>
      Logar com sua Conta Google
    </button>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [clientId, setClientId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(isLocal);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Escuta erros de auth das chamadas fetch
    const handleAuthError = () => {
       setIsAuthenticated(false);
       localStorage.removeItem("google_token");
    };
    window.addEventListener('auth_error', handleAuthError);
    
    // Verifica se já temos token salvo
    const token = localStorage.getItem("google_token");
    if (token) {
        setIsAuthenticated(true);
    }

    // Busca o Google Client ID da API publica
    originalFetch("/api/public/config").then(r => r.json()).then(data => {
        if (data.googleClientId) {
            setClientId(data.googleClientId);
        }
        if (data.allowedEmail) {
            globalAllowedEmail = data.allowedEmail;
        }
    }).catch(e => console.error("Could not load config", e));

    return () => window.removeEventListener('auth_error', handleAuthError);
  }, []);

  const renderContent = () => {
    if (isLocal) {
        return <>{children}</>;
    }

    if (!isAuthenticated || !clientId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white font-mono gap-6 p-4">
                <div className="holographic-card border border-emerald-500/20 p-8 flex flex-col items-center bg-zinc-950/80 rounded-2xl max-w-sm w-full shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-500" />
                  <ShieldAlert className="w-12 h-12 text-emerald-400 mb-4 animate-pulse" />
                  <h1 className="text-xl font-bold tracking-widest text-[var(--brand-light)] mb-2">JARVIS CORE PORTAL</h1>
                  <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
                     Acesso estrito.<br/>Apenas e-mail autorizado pode acessar este servidor remotamente.
                  </p>

                  {errorMsg && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded w-full text-center border border-red-500/20 mb-4">{errorMsg}</p>}

                  {!clientId ? (
                     <p className="text-xs text-amber-400 text-center">Pendente: Configure o <code>GOOGLE_CLIENT_ID</code> nas configurações do painel ou como variável de ambiente para liberar o login.</p>
                  ) : (
                     <GoogleLoginButton
                       onSuccess={(token) => {
                          localStorage.setItem("google_token", token);
                          setIsAuthenticated(true);
                          setErrorMsg("");
                       }}
                       onError={(msg) => setErrorMsg(msg)}
                     />
                  )}
                </div>
            </div>
        );
    }

    return <>{children}</>;
  };

  if (clientId) {
    return (
      <GoogleOAuthProvider clientId={clientId}>
        {renderContent()}
      </GoogleOAuthProvider>
    );
  }

  return <>{renderContent()}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper>
      <App />
    </AuthWrapper>
  </StrictMode>,
);
