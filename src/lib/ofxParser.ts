// Mobile-safe OFX/CSV parser — no XLSX, no pdfjs, no browser APIs

export type ParsedItem = {
  id: string;
  type: "RECEITA" | "DESPESA";
  title: string;
  amountCents: number;
  dateISO: string;
  fitId?: string;
};

export type LedgerBal = { balanceCents: number; dateISO: string };

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function stripTags(v: string): string {
  return v.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function readTag(block: string, tag: string): string {
  const closed = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (closed?.[1]) return stripTags(closed[1]);
  const open = block.match(new RegExp(`<${tag}[^>]*>([^\\r\\n<]+)`, "i"));
  return stripTags(open?.[1] ?? "");
}

function ofxDate(v: string): string {
  const c = v.replace(/[^\d]/g, "");
  const y = c.slice(0, 4), m = c.slice(4, 6), d = c.slice(6, 8);
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

function ofxCents(v: string): number {
  const n = Number(v.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) : 0;
}

function inferType(block: string, amountRaw: string): "RECEITA" | "DESPESA" {
  const typeRaw = readTag(block, "TRNTYPE").toUpperCase();
  const amount = Number(amountRaw.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(amount) && amount > 0) return "RECEITA";
  if (["CREDIT", "DEP", "INT", "DIV"].includes(typeRaw)) return "RECEITA";
  return "DESPESA";
}

export function parseOfx(text: string): { items: ParsedItem[]; ledgerBal: LedgerBal | null } {
  const blocks = text.match(/<STMTTRN\b[^>]*>[\s\S]*?(?=<STMTTRN\b|<\/BANKTRANLIST>|<\/OFX>|$)/gi) ?? [];

  const items: ParsedItem[] = blocks
    .map(block => {
      const amountRaw = readTag(block, "TRNAMT");
      const amountCents = ofxCents(amountRaw);
      const title = readTag(block, "MEMO") || readTag(block, "NAME") || readTag(block, "CHECKNUM") || "Lançamento importado";
      const fitId = readTag(block, "FITID") || undefined;
      return {
        id: fitId || uid(),
        fitId,
        type: inferType(block, amountRaw),
        title,
        amountCents,
        dateISO: ofxDate(readTag(block, "DTPOSTED") || readTag(block, "DTUSER")),
      };
    })
    .filter(it => it.amountCents > 0 && it.title.trim());

  const balRaw = text.match(/<LEDGERBAL[\s\S]*?<BALAMT>([^\r\n<]+)/i)?.[1]?.trim();
  const balDate = text.match(/<LEDGERBAL[\s\S]*?<DTASOF>([^\r\n<]+)/i)?.[1]?.trim();
  let ledgerBal: LedgerBal | null = null;
  if (balRaw && balDate) {
    const cents = Math.round(Number(balRaw.replace(",", ".").replace(/[^\d.-]/g, "")) * 100);
    if (Number.isFinite(cents)) ledgerBal = { balanceCents: cents, dateISO: ofxDate(balDate) };
  }

  return { items, ledgerBal };
}

export function parseCsv(text: string): ParsedItem[] {
  const sep = ((): string => {
    const sample = text.split(/\r?\n/).find(l => l.trim()) ?? "";
    return [";", ",", "\t"].reduce((b, c) => sample.split(c).length > sample.split(b).length ? c : b, ";");
  })();

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i], nx = line[i + 1];
      if (ch === '"' && nx === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { quoted = !quoted; continue; }
      if (ch === sep && !quoted) { cells.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const rows = text.split(/\r?\n/).filter(l => l.trim()).map(l => splitLine(l));
  if (rows.length < 2) return [];

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const colIdx = (headers: string[], pats: RegExp[]) => headers.findIndex(h => pats.some(p => p.test(h)));

  const headers = rows[0].map(h => h);
  const normH = headers.map(norm);

  const dateI  = colIdx(normH, [/^data/, /date/]);
  const descI  = colIdx(normH, [/descricao/, /historico/, /lancamento/, /memo/, /nome/]);
  const amtI   = colIdx(normH, [/^valor$/, /amount/, /total/]);
  const debI   = colIdx(normH, [/debito/, /saida/]);
  const creI   = colIdx(normH, [/credito/, /entrada/]);

  return rows.slice(1).flatMap((cells): ParsedItem[] => {
    const get = (i: number) => (i >= 0 ? cells[i] ?? "" : "");
    const dateRaw = get(dateI) || cells.find(c => /\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(c)) || "";
    const title   = get(descI) || cells.find(c => !/\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(c) && c.length > 3) || "Lançamento";
    let amtRaw = get(amtI);
    if (!amtRaw && debI >= 0 && get(debI)) amtRaw = `-${get(debI)}`;
    if (!amtRaw && creI >= 0 && get(creI)) amtRaw = get(creI);
    if (!amtRaw) amtRaw = cells.find(c => /\d+[,.]\d{2}/.test(c)) ?? "";

    const rawN = amtRaw.replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(rawN);
    if (!Number.isFinite(n) || n === 0) return [];
    const cents = Math.round(Math.abs(n) * 100);
    if (cents <= 0) return [];

    const brParts = dateRaw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    const isoParts = dateRaw.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    let dateISO = new Date().toISOString().slice(0, 10);
    if (brParts) { const y = brParts[3]!.length === 2 ? `20${brParts[3]}` : brParts[3]; dateISO = `${y}-${brParts[2]!.padStart(2,"0")}-${brParts[1]!.padStart(2,"0")}`; }
    else if (isoParts) dateISO = `${isoParts[1]}-${isoParts[2]!.padStart(2,"0")}-${isoParts[3]!.padStart(2,"0")}`;

    return [{ id: uid(), type: n < 0 ? "DESPESA" : "RECEITA", title: title.trim() || "Lançamento", amountCents: cents, dateISO }];
  });
}
