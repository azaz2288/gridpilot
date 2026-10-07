export type Dataset = { headers: string[]; rows: string[][] };
export function parseCSV(input: string): Dataset {
  const text = input.replace(/^\uFEFF/, "");
  if (text.length > 32 * 1024 * 1024) throw Error("文件最大32 MiB字符");
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    atStart = true;
  const finishField = () => {
    row.push(field);
    field = "";
    closed = false;
    atStart = true;
    if (row.length > 200) throw Error("最多200列");
  };
  const finishRow = () => {
    finishField();
    records.push(row);
    row = [];
    if (records.length > 100001) throw Error("最多100000条数据行");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === ",") finishField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      finishRow();
    } else if (c === '"') {
      if (!atStart || closed) throw Error("引号只能出现在字段起始");
      quoted = true;
      atStart = false;
    } else {
      if (closed) throw Error("闭合引号后只能有分隔符");
      field += c;
      atStart = false;
    }
    if (field.length > 1024 * 1024) throw Error("单元格最大1 MiB字符");
  }
  if (quoted) throw Error("引号未闭合");
  if (
    row.length ||
    field ||
    closed ||
    (!text.endsWith("\n") && !text.endsWith("\r") && text.length)
  )
    finishRow();
  if (!records.length) throw Error("CSV为空");
  const headers = records.shift()!;
  if (
    headers.some((h) => !h.trim()) ||
    new Set(headers).size !== headers.length
  )
    throw Error("列名不能为空或重复");
  if (records.some((r) => r.length !== headers.length))
    throw Error("每行字段数必须与表头一致");
  return { headers, rows: records };
}
export function exportCSV(data: Dataset): string {
  // Spreadsheet formula injection guard: prefix dangerous string cells on export.
  const escaped = (s: string) => {
    const safe = /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
    return /[",\r\n]/.test(safe)
      ? '"' + safe.replaceAll('"', '""') + '"'
      : safe;
  };
  return (
    "\uFEFF" +
    [data.headers, ...data.rows]
      .map((row) => row.map(escaped).join(","))
      .join("\r\n")
  );
}
export function orderRows(
  rows: string[][],
  query: string,
  column: number | null,
  descending: boolean,
  numeric: boolean,
): number[] {
  const q = query.toLocaleLowerCase();
  const order = rows
    .map((_, i) => i)
    .filter(
      (i) => !q || rows[i].some((v) => v.toLocaleLowerCase().includes(q)),
    );
  if (column !== null) {
    order.sort((a, b) => {
      const x = rows[a][column] ?? "",
        y = rows[b][column] ?? "";
      let delta = 0;
      if (numeric) {
        const nx = x.trim() === "" ? NaN : Number(x),
          ny = y.trim() === "" ? NaN : Number(y),
          fx = Number.isFinite(nx),
          fy = Number.isFinite(ny);
        // Missing and nonnumeric values always remain last, independent of direction.
        if (fx !== fy) return fx ? -1 : 1;
        if (fx) delta = nx - ny;
        else return a - b;
      } else delta = x.localeCompare(y);
      return (descending ? -delta : delta) || a - b;
    });
  }
  return order;
}
