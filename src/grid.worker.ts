import { parseCSV, orderRows, type Dataset } from "./csv";
let dataset: Dataset = { headers: [], rows: [] };
self.onmessage = (event: MessageEvent) => {
  const { id, type, ...value } = event.data;
  try {
    if (type === "load") {
      dataset = parseCSV(value.text);
      self.postMessage({ id, type, dataset });
    } else if (type === "view") {
      self.postMessage({
        id,
        type,
        order: orderRows(
          dataset.rows,
          value.query,
          value.column,
          value.descending,
          value.numeric,
        ),
      });
    } else if (type === "edit") {
      if (
        !dataset.rows[value.row] ||
        !Number.isInteger(value.column) ||
        value.column < 0 ||
        value.column >= dataset.headers.length ||
        typeof value.value !== "string" ||
        value.value.length > 1024 * 1024
      )
        throw Error("无效单元格编辑");
      dataset.rows[value.row][value.column] = value.value;
      self.postMessage({ id, type });
    } else throw Error("未知操作");
  } catch (e) {
    self.postMessage({
      id,
      type,
      error: e instanceof Error ? e.message : "处理失败",
    });
  }
};
