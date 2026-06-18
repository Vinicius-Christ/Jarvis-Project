
export const getServerUrl = () => {
  return typeof window !== "undefined" && window.location.protocol === "file:" 
        ? "http://localhost:3000" 
        : "";
};

