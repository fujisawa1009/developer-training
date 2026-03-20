import { describe, it, expect } from "vitest";
import { generateCSV, csvResponse } from "@/lib/csv";

describe("generateCSV", () => {
  it("空配列を渡すと空文字列を返す", () => {
    expect(generateCSV([])).toBe("");
  });

  it("オブジェクトのキーがヘッダーになる", () => {
    const csv = generateCSV([{ name: "太郎", age: 25 }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[0]).toBe('"name","age"');
  });

  it("オブジェクトの値が行になる", () => {
    const csv = generateCSV([{ name: "太郎", age: 25 }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe('"太郎","25"');
  });

  it("複数行を処理できる", () => {
    const csv = generateCSV([
      { name: "太郎", age: 25 },
      { name: "花子", age: 30 },
    ]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe('"太郎","25"');
    expect(lines[2]).toBe('"花子","30"');
  });

  it("ダブルクォート内のダブルクォートがエスケープされる", () => {
    const csv = generateCSV([{ text: 'He said "hello"' }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe('"He said ""hello"""');
  });

  it("null値が空文字列になる", () => {
    const csv = generateCSV([{ value: null }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe('""');
  });

  it("undefined値が空文字列になる", () => {
    const csv = generateCSV([{ value: undefined }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    expect(lines[1]).toBe('""');
  });

  it("UTF-8 BOMが先頭に付与される", () => {
    const csv = generateCSV([{ a: 1 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("CRLF改行が使用される", () => {
    const csv = generateCSV([{ a: 1 }]);
    const content = csv.replace("\uFEFF", "");
    expect(content).toContain("\r\n");
    // LF単独は含まない（CRLFの一部を除く）
    const withoutCRLF = content.replace(/\r\n/g, "");
    expect(withoutCRLF).not.toContain("\n");
  });

  it("全フィールドがダブルクォートで囲まれる", () => {
    const csv = generateCSV([{ name: "test", num: 42 }]);
    const lines = csv.replace("\uFEFF", "").split("\r\n");
    // ヘッダー
    expect(lines[0]).toMatch(/^"[^"]*","[^"]*"$/);
    // データ行
    expect(lines[1]).toMatch(/^"[^"]*","[^"]*"$/);
  });
});

describe("csvResponse", () => {
  it("Response オブジェクトを返す", () => {
    const res = csvResponse("test", "file.csv");
    expect(res).toBeInstanceOf(Response);
  });

  it("Content-Type が text/csv; charset=utf-8 である", () => {
    const res = csvResponse("test", "file.csv");
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
  });

  it("Content-Disposition にURLエンコードされたファイル名が含まれる", () => {
    const res = csvResponse("test", "レポート.csv");
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(
      `filename*=UTF-8''${encodeURIComponent("レポート.csv")}`
    );
  });

  it("body にCSV文字列が含まれる", async () => {
    const csvContent = "header1,header2\nval1,val2";
    const res = csvResponse(csvContent, "test.csv");
    const body = await res.text();
    expect(body).toBe(csvContent);
  });
});
