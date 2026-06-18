
export const getServerUrl = () => {
  let url = "";
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    const stored = localStorage.getItem("JARVIS_SERVER_URL");
    if (stored) url = stored;
  }
  
  if (!url) {
    const envUrl = import.meta.env.VITE_SERVER_URL;
    if (envUrl) url = envUrl;
  }

  if (isBrowser) {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isFile = window.location.protocol === "file:";

    // Prevent using localhost as the server URL if we are hosted remotely
    if (!isFile && !isLocalhost && (url.includes("localhost") || url.includes("127.0.0.1"))) {
      url = "";
    } 
    
    // Provide default for Desktop Apps
    if (!url && isFile) {
      url = "http://localhost:3000";
    }
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, "");
};

