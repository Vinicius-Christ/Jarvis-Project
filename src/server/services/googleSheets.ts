export async function syncToGoogleSheets(sheetUrl: string, tabName: string, rows: string[], token: string) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return;
  const spreadsheetId = match[1];

  try {
    // 1. Get spreadsheet metadata to see if the tab exists
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!metaRes.ok) {
      console.error("Failed to read sheet metadata:", await metaRes.text());
      return;
    }
    const meta: any = await metaRes.json();
    const sheetTitles = meta.sheets?.map((s: any) => s.properties.title) || [];

    // 2. If tab does not exist, create it
    if (!sheetTitles.includes(tabName)) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: tabName }
            }
          }]
        })
      });
      if (!createRes.ok) {
        console.error("Failed to create tab:", await createRes.text());
      }
    }

    // 3. Parse rows (e.g. "Coluna1: Valor1 | Coluna2: Valor2")
    for (const rawRow of rows) {
      const parts = rawRow.split("|").map(p => p.trim());
      const rowData: Record<string, string> = {};
      parts.forEach(part => {
        const idx = part.indexOf(":");
        if (idx !== -1) {
          const col = part.substring(0, idx).trim();
          const val = part.substring(idx + 1).trim();
          rowData[col] = val;
        }
      });

      if (Object.keys(rowData).length === 0) continue;

      // 4. Read first row to see if we have headers
      const rangeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:Z1`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      let headers: string[] = [];
      if (rangeRes.ok) {
        const rangeData: any = await rangeRes.json();
        headers = rangeData.values?.[0] || [];
      }

      const rowKeys = Object.keys(rowData);

      // 5. If sheet has no headers, write headers first
      if (headers.length === 0) {
        headers = rowKeys;
        const writeHeadersRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            values: [headers]
          })
        });
        if (!writeHeadersRes.ok) {
          console.error("Failed to write headers:", await writeHeadersRes.text());
        }
      } else {
        // Look for any headers of the new row that are missing inside the existing headers
        const missingHeaders = rowKeys.filter(k => !headers.includes(k));
        if (missingHeaders.length > 0) {
          headers.push(...missingHeaders);
          // Overwrite the headers row with the new combined set of headers
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              values: [headers]
            })
          });
        }
      }

      // 6. Align rawRow values to headers
      const valuesRow = headers.map(h => rowData[h] || "");

      // 7. Append row
      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          values: [valuesRow]
        })
      });
      if (!appendRes.ok) {
        console.error("Failed to append row:", await appendRes.text());
      }
    }
  } catch (err) {
    console.error("Google Sheets sync failed:", err);
  }
}
