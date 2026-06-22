
export const getServerUrl = () => {
  return typeof window !== "undefined" && window.location.protocol === "file:" 
        ? "http://localhost:3000" 
        : "";
};

/**
 * Função utilitária para fazer requisições à API enviando automaticamente
 * o token de autorização (Bearer Token) do Google, se ele existir.
 */
export const fetchAutenticado = async (endpoint: string, options: RequestInit = {}) => {
  // Tenta recuperar o token que foi salvo no localStorage
  const token = localStorage.getItem("google_token"); 
  
  // Prepara os cabeçalhos (headers) da requisição
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  
  // Se existir um token, adiciona no cabeçalho de Autorização
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Faz a chamada original usando a URL do servidor + endpoint
  return fetch(`${getServerUrl()}${endpoint}`, {
    ...options,
    headers
  });
};

