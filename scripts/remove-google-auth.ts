import fs from "fs";

let content = fs.readFileSync("server.ts", "utf-8");

// Remove Google auth middleware
content = content.replace(/const googleClient = new OAuth2Client\(process\.env\.GOOGLE_CLIENT_ID\);[\s\S]*?return next\(\);\n   } catch \(error\) \{\n      console\.error\("Token verification failed:", error\);\n      return res\.status\(401\)\.json\(\(\{ error: "Token inválido ou expirado\. Faça o login novamente\." \}\)\);\n   \}\n\}\);/g, `
// JWT Login endpoint verification middleware
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || 'viniciusc.castro09@gmail.com';
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "jarvis_super_secret_key_007";

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password) {
     return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { email: user.email, role: user.role } });
});

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/public/') || req.path.startsWith('/api/auth/login')) {
     return next();
  }

  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  if (apiKeyHeader && apiKeyHeader === process.env.JARVIS_API_KEY) {
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: "Unauthorized missing token" });
  }

  const token = authHeader.split(' ')[1];
  try {
     const decoded = jwt.verify(token, JWT_SECRET);
     (req as any).user = decoded;
     return next();
  } catch(error) {
     return res.status(401).json({ error: "Expired or invalid token" });
  }
});

// Users management API
app.get("/api/users", async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  res.json(users);
});
app.post("/api/users", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await prisma.user.create({ data: { email, password, role: role || "user" }, select: { id: true, email: true, role: true } });
    res.json(user);
  } catch(e) {
    res.status(400).json({error: "Failed to create user. Email may exist."});
  }
});
app.delete("/api/users/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});
`);

// Add jwt dependency implicitly by changing import or use require above.
if(!content.includes('import { OAuth2Client } from "google-auth-library";')) {
  content = content.replace("import { OAuth2Client } from 'google-auth-library';", "");
}

fs.writeFileSync("server.ts", content);
