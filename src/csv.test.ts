import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCSV, exportCSV, orderRows } from "./csv.ts";
test("quoted commas, newlines, escaped quotes and BOM", () =>
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"x,y","a""b\nline"\r\n'), {
    headers: ["a", "b"],
    rows: [["x,y", 'a"b\nline']],
  }));
test("trailing blank field and header only", () => {
  assert.deepEqual(parseCSV("a,b\n1,").rows, [["1", ""]]);
  assert.deepEqual(parseCSV("a,b\n").rows, []);
});
for (const text of [
  "a,a\n1,2",
  "a,b\n1",
  'a,b\n"a',
  'a,b\n"x"oops,2',
  'a,b\nq"x,2',
  ",b\n1,2",
])
  test("refuses malformed " + JSON.stringify(text), () =>
    assert.throws(() => parseCSV(text)),
  );
test("roundtrips safe fields", () => {
  const d = {
    headers: ["a", "b"],
    rows: [
      ["x,y", "hello\nworld"],
      ['"', "中国"],
    ],
  };
  assert.deepEqual(parseCSV(exportCSV(d)), d);
});
test("neutralizes formula injection explicitly", () =>
  assert.deepEqual(
    parseCSV(exportCSV({ headers: ["x"], rows: [["=1+2"], [" @SUM(A1)"]] }))
      .rows,
    [["'=1+2"], ["' @SUM(A1)"]],
  ));
test("stable numeric sorting and invalid last", () => {
  const rows = [["10"], ["2"], [""], ["x"], ["2"]];
  assert.deepEqual(orderRows(rows, "", 0, false, true), [1, 4, 0, 2, 3]);
  assert.deepEqual(orderRows(rows, "", 0, true, true), [0, 1, 4, 2, 3]);
});
test("search all columns", () =>
  assert.deepEqual(
    orderRows(
      [
        ["1", "华东"],
        ["2", "华南"],
      ],
      "华南",
      null,
      false,
      false,
    ),
    [1],
  ));
test("large actual dataset", () => {
  const text =
    "id,value\n" +
    Array.from({ length: 100000 }, (_, i) => `${i},${100000 - i}`).join("\n");
  const d = parseCSV(text);
  assert.equal(d.rows.length, 100000);
  assert.equal(orderRows(d.rows, "", 1, false, true)[0], 99999);
});
