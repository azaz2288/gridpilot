import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { exportCSV, type Dataset } from "./csv";
import "./style.css";
type Edit = { row: number; column: number; before: string; after: string };
function App() {
  const [data, setData] = useState<Dataset>({ headers: [], rows: [] }),
    [order, setOrder] = useState<number[]>([]),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState<number | null>(null),
    [descending, setDescending] = useState(false),
    [numeric, setNumeric] = useState(false),
    [status, setStatus] = useState("导入CSV，或加载原创大数据示例。"),
    [busy, setBusy] = useState(false),
    [scroll, setScroll] = useState(0),
    [height, setHeight] = useState(420),
    [selected, setSelected] = useState<[number, number]>([0, 0]),
    [editing, setEditing] = useState<string | null>(null),
    [history, setHistory] = useState<Edit[]>([]),
    [redo, setRedo] = useState<Edit[]>([]),
    [width, setWidth] = useState(180);
  const worker = useRef<Worker | null>(null),
    seq = useRef(0),
    latestLoad = useRef(0),
    latestView = useRef(0),
    viewport = useRef<HTMLDivElement>(null),
    loaded = useRef(false);
  useEffect(() => {
    const w = new Worker("./grid.worker.js", { type: "module" });
    worker.current = w;
    w.onmessage = (event) => {
      const m = event.data;
      if (
        (m.type === "load" && m.id !== latestLoad.current) ||
        (m.type === "view" && m.id !== latestView.current)
      )
        return;
      if (m.error) {
        setBusy(false);
        setStatus(m.error);
        return;
      }
      if (m.type === "load") {
        loaded.current = true;
        setData(m.dataset);
        setOrder(m.dataset.rows.map((_: string[], i: number) => i));
        setQuery("");
        setSort(null);
        setHistory([]);
        setRedo([]);
        setSelected([0, 0]);
        setEditing(null);
        setScroll(0);
        viewport.current?.scrollTo(0, 0);
        setStatus(
          `已导入 ${m.dataset.rows.length.toLocaleString()} 行 / ${m.dataset.headers.length} 列。数据只在浏览器内存中。`,
        );
        setBusy(false);
      }
      if (m.type === "view") {
        setOrder(m.order);
        setBusy(false);
        setScroll(0);
        viewport.current?.scrollTo(0, 0);
        setSelected([0, 0]);
      }
    };
    w.onerror = () => {
      setBusy(false);
      setStatus("Worker异常，请重新加载页面。");
    };
    return () => w.terminate();
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => {
      const id = ++seq.current;
      latestView.current = id;
      setBusy(true);
      worker.current?.postMessage({
        id,
        type: "view",
        query,
        column: sort,
        descending,
        numeric,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [query, sort, descending, numeric, data]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function load(text: string) {
    if (busy) return;
    const id = ++seq.current;
    latestLoad.current = id;
    latestView.current = 0;
    setBusy(true);
    worker.current?.postMessage({ id, type: "load", text });
  }
  function change(row: number, column: number, value: string) {
    const rows = data.rows.slice();
    rows[row] = rows[row].slice();
    rows[row][column] = value;
    setData({ ...data, rows });
    worker.current?.postMessage({
      id: ++seq.current,
      type: "edit",
      row,
      column,
      value,
    });
  }
  function commit() {
    const row = order[selected[0]],
      column = selected[1];
    if (row == null || editing == null) return;
    const before = data.rows[row][column];
    if (before !== editing) {
      change(row, column, editing);
      setHistory((h) => [
        ...h.slice(-99),
        { row, column, before, after: editing },
      ]);
      setRedo([]);
    }
    setEditing(null);
    viewport.current?.focus();
  }
  function undo() {
    const edit = history.at(-1);
    if (!edit) return;
    change(edit.row, edit.column, edit.before);
    setHistory((h) => h.slice(0, -1));
    setRedo((r) => [...r, edit]);
    setEditing(null);
  }
  function reapply() {
    const edit = redo.at(-1);
    if (!edit) return;
    change(edit.row, edit.column, edit.after);
    setRedo((r) => r.slice(0, -1));
    setHistory((h) => [...h, edit]);
    setEditing(null);
  }
  function key(event: React.KeyboardEvent) {
    if (editing !== null) {
      if (event.key === "Escape") {
        setEditing(null);
        event.preventDefault();
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? reapply() : undo();
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
    };
    if (event.key === "Enter" && order[selected[0]] != null) {
      event.preventDefault();
      setEditing(data.rows[order[selected[0]]][selected[1]]);
      return;
    }
    if (moves[event.key] && order.length) {
      event.preventDefault();
      const d = moves[event.key],
        r = Math.max(0, Math.min(order.length - 1, selected[0] + d[0])),
        c = Math.max(0, Math.min(data.headers.length - 1, selected[1] + d[1]));
      setSelected([r, c]);
      const v = viewport.current;
      if (v) {
        if (r * 44 < v.scrollTop) v.scrollTop = r * 44;
        else if ((r + 1) * 44 > v.scrollTop + v.clientHeight)
          v.scrollTop = (r + 1) * 44 - v.clientHeight;
        const x = (c + 1) * width;
        if (x > v.scrollLeft + v.clientWidth) v.scrollLeft = x - v.clientWidth;
        if (c * width < v.scrollLeft) v.scrollLeft = c * width;
      }
    }
  }
  const start = Math.max(0, Math.floor(scroll / 44) - 5),
    end = Math.min(order.length, start + Math.ceil(height / 44) + 11),
    visible = useMemo(() => order.slice(start, end), [order, start, end]);
  return (
    <>
      <header>
        <strong>▤ GridPilot</strong>
        <span>PRIVATE BY DESIGN · BROWSER WORKSPACE</span>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">数据工作台 / FRONTEND ENGINEERING</p>
          <h1>十万行，也能轻松浏览。</h1>
          <p>
            Worker解析与检索，虚拟表格只渲染可见行。双击或按Enter编辑，方向键选择，Ctrl+Z撤销。
          </p>
        </section>
        <section className="toolbar">
          <label className="file">
            导入 CSV
            <input
              type="file"
              accept=".csv"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 32 * 1024 * 1024) {
                  setStatus("文件最大32 MiB");
                  return;
                }
                try {
                  const bytes = await file.arrayBuffer();
                  load(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
                } catch {
                  setStatus("需要有效UTF-8文本；未替换坏字节。");
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => {
              const rows = ["id,region,revenue,category,note"];
              for (let i = 0; i < 100000; i++)
                rows.push(
                  `${i + 1},${["华东", "华南", "华北"][i % 3]},${(((i * 7919) % 100000) / 100).toFixed(2)},${["订阅", "服务", "产品"][i % 3]},原创示例-${i + 1}`,
                );
              load(rows.join("\n"));
            }}
          >
            加载10万行原创示例
          </button>
          <button
            disabled={!data.rows.length || busy}
            onClick={() => {
              const url = URL.createObjectURL(
                  new Blob(
                    [
                      exportCSV({
                        headers: data.headers,
                        rows: order.map((i) => data.rows[i]),
                      }),
                    ],
                    { type: "text/csv;charset=utf-8" },
                  ),
                ),
                a = document.createElement("a");
              a.href = url;
              a.download = "gridpilot-view.csv";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            导出当前视图
          </button>
          <button disabled={!history.length || busy} onClick={undo}>
            撤销 ({history.length})
          </button>
          <button disabled={!redo.length || busy} onClick={reapply}>
            重做
          </button>
        </section>
        <section className="filters">
          <input
            aria-label="搜索所有列"
            placeholder="搜索所有列…"
            value={query}
            onChange={(e) => {
              setEditing(null);
              setQuery(e.target.value);
            }}
          />
          <label>
            <input
              type="checkbox"
              checked={numeric}
              onChange={(e) => setNumeric(e.target.checked)}
            />
            数值排序
          </label>
          <label>
            列宽
            <select
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            >
              <option value="130">紧凑</option>
              <option value="180">标准</option>
              <option value="260">宽</option>
            </select>
          </label>
          <span>
            {order.length.toLocaleString()} /{" "}
            {data.rows.length.toLocaleString()} 行
          </span>
        </section>
        <p role="status" className="status">
          {busy ? "Worker处理中…" : status}
        </p>
        <div className="grid-shell">
          <div
            className="headers"
            style={{
              gridTemplateColumns: `repeat(${data.headers.length},${width}px)`,
              width: Math.max(data.headers.length * width, 1),
            }}
          >
            {data.headers.map((h, c) => (
              <button
                key={h}
                onClick={() => {
                  setEditing(null);
                  setSort(c);
                  setDescending(sort === c ? !descending : false);
                }}
              >
                {h} {sort === c ? (descending ? "↓" : "↑") : ""}
              </button>
            ))}
          </div>
          <div
            className="viewport"
            ref={viewport}
            role="grid"
            aria-label="CSV数据表"
            aria-rowcount={order.length + 1}
            aria-colcount={data.headers.length}
            tabIndex={0}
            onKeyDown={key}
            onScroll={(e) => {
              setScroll(e.currentTarget.scrollTop);
              const head = e.currentTarget
                .previousElementSibling as HTMLElement;
              if (head)
                head.style.transform = `translateX(${-e.currentTarget.scrollLeft}px)`;
            }}
          >
            <div
              className="spacer"
              style={{
                height: order.length * 44,
                width: Math.max(data.headers.length * width, 1),
              }}
            >
              {visible.map((rowId, offset) => {
                const position = start + offset;
                return (
                  <div
                    role="row"
                    aria-rowindex={position + 2}
                    className="row"
                    key={rowId}
                    style={{
                      top: position * 44,
                      gridTemplateColumns: `repeat(${data.headers.length},${width}px)`,
                    }}
                  >
                    {data.rows[rowId].map((cell, c) => (
                      <div
                        role="gridcell"
                        aria-colindex={c + 1}
                        aria-selected={
                          selected[0] === position && selected[1] === c
                        }
                        className={
                          selected[0] === position && selected[1] === c
                            ? "cell selected"
                            : "cell"
                        }
                        key={c}
                        onClick={() => {
                          if (editing !== null) return;
                          setSelected([position, c]);
                          viewport.current?.focus();
                        }}
                        onDoubleClick={() => {
                          setSelected([position, c]);
                          setEditing(cell);
                        }}
                        title={cell}
                      >
                        {editing !== null &&
                        selected[0] === position &&
                        selected[1] === c ? (
                          <input
                            aria-label="编辑单元格"
                            value={editing}
                            autoFocus
                            onChange={(e) => setEditing(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                commit();
                              }
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setEditing(null);
                                viewport.current?.focus();
                              }
                            }}
                          />
                        ) : (
                          cell
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {editing !== null && (
          <div className="edit-actions">
            <button onClick={commit}>保存编辑</button>
            <button onClick={() => setEditing(null)}>取消</button>
          </div>
        )}
        <footer>
          数据不上传服务器 · 编辑未持久化，关闭前请导出 ·
          导出对公式起始字符添加单引号保护，避免电子表格自动执行公式
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
