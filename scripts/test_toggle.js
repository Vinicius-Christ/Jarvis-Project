import fetch from "node-fetch";

fetch("http://127.0.0.1:3000/api/system/toggle", { method: "POST" })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
