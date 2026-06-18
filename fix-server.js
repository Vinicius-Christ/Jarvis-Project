import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace standard unused params: (req, res) -> (_req, res) when req is unused (based on tsc)
// Let's just blindly globally replace `(req, res)` with `(req, res)` where req is unused... wait it's just a few.
const replacements = [
  { line: 478, search: '(req, res)', replace: '(_req, res)' },
  { line: 561, search: '(history: any,', replace: '(_history: any,' },
  { line: 773, search: '(req, res)', replace: '(_req, res)' },
  { line: 793, search: '(req, res)', replace: '(_req, res)' },
  { line: 937, search: '(req, res)', replace: '(_req, res)' },
  { line: 1182, search: '(req, res)', replace: '(_req, res)' },
  { line: 1193, search: '(req, res)', replace: '(_req, res)' },
  { line: 1216, search: 'resolve, reject', replace: 'resolve' },
  { line: 1217, search: '(err, stdout', replace: '(_err, stdout' },
  { line: 1230, search: 'resolve, reject', replace: 'resolve' },
  { line: 1232, search: '(err, stdout', replace: '(_err, stdout' },
  { line: 1258, search: '(req, res)', replace: '(_req, res)' },
  { line: 1288, search: '(err, stdout', replace: '(_err, stdout' },
  { line: 1383, search: 'const HA_TOKEN =', replace: '// const HA_TOKEN =' },
  { line: 1408, search: 'service: string', replace: '_service: string' },
  { line: 1499, search: '(req, res)', replace: '(_req, res)' },
  { line: 1811, search: '(req, res)', replace: '(_req, res)' },
  { line: 1953, search: '(req, res)', replace: '(_req, res)' },
  { line: 1973, search: '(req, res)', replace: '(_req, res)' },
  { line: 2034, search: '(req, res)', replace: '(_req, res)' },
  { line: 2048, search: 'const checkGit =', replace: 'const _checkGit =' },
  { line: 2126, search: '(err, stdout, stderr)', replace: '(err, _stdout, stderr)' },
  { line: 2132, search: '(err, stdout, stderr)', replace: '(err, _stdout, stderr)' },
  { line: 2166, search: '(error, stdout, stderr)', replace: '(error, stdout, _stderr)' },
  { line: 2179, search: '(error, stdout, stderr)', replace: '(error, _stdout, _stderr)' },
  { line: 2256, search: '(err, stdout, stderr)', replace: '(err, stdout, _stderr)' },
  { line: 2275, search: '(req, res)', replace: '(_req, res)' },
  { line: 2297, search: '(req, res)', replace: '(_req, res)' }
];

let lines = content.split('\n');
replacements.forEach(r => {
  if (lines[r.line - 1]) {
    lines[r.line - 1] = lines[r.line - 1].replace(r.search, r.replace);
  }
});

fs.writeFileSync('server.ts', lines.join('\n'));
