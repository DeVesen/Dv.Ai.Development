import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { insertMember, updateImports } from "./code-edit.js";

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "code-edit-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const CSHARP = [
  "namespace Shop",
  "{",
  "    public class OrderService",
  "    {",
  "        public int Count { get; set; }",
  "",
  "        public void Save()",
  "        {",
  "        }",
  "    }",
  "",
  "    public class Other { }",
  "}",
  "",
].join("\r\n");

describe("insertMember", () => {
  it("InsertMember_CSharpEndOfClass_InsideFirstClassKeepsCrlf", async () => {
    const root = tree({ "OrderService.cs": CSHARP });
    const file = join(root, "OrderService.cs");
    const result = await insertMember(file, { memberKind: "method", signature: "public void Clear()", body: "Count = 0;", position: "end_of_class" });
    const lines = readFileSync(file, "utf-8").split("\r\n");
    assert.equal(result.className, "OrderService");
    assert.equal(result.insertedAtLine, 11);
    assert.deepEqual(lines.slice(9, 15), ["", "        public void Clear()", "        {", "            Count = 0;", "        }", "    }"]);
    assert.equal(lines[16], "    public class Other { }");
  });

  it("InsertMember_CSharpAfterMember_PropertyBelowNamedMember", async () => {
    const root = tree({ "OrderService.cs": CSHARP });
    const file = join(root, "OrderService.cs");
    await insertMember(file, { memberKind: "property", signature: "public string Name { get; set; }", position: "after_member", afterMemberName: "Count" });
    const lines = readFileSync(file, "utf-8").split("\r\n");
    assert.deepEqual(lines.slice(4, 7), ["        public int Count { get; set; }", "", "        public string Name { get; set; }"]);
  });

  it("InsertMember_TypeScriptMethodWithoutBody_StubWithBraceOnHeaderLine", async () => {
    const root = tree({ "cart.ts": "export class Cart {\n  items: string[] = [];\n}\n" });
    const file = join(root, "cart.ts");
    await insertMember(file, { memberKind: "method", signature: "clear(): void", position: "end_of_class" });
    assert.equal(readFileSync(file, "utf-8"), "export class Cart {\n  items: string[] = [];\n\n  clear(): void {\n    throw new Error('Not implemented');\n  }\n}\n");
  });

  it("InsertMember_UnknownAfterMember_Throws", async () => {
    const root = tree({ "cart.ts": "export class Cart {\n  items = [];\n}\n" });
    await assert.rejects(insertMember(join(root, "cart.ts"), { memberKind: "field", signature: "x = 1;", position: "after_member", afterMemberName: "nope" }), /Member not found in Cart: nope/);
  });
});

describe("updateImports", () => {
  it("UpdateImports_DirectoryTypeScriptAndCSharp_RewritesAndSkipsNodeModules", () => {
    const root = tree({
      "src/a.ts": "import { X } from './old/x';\nexport { Y } from './old/x';\nconst z = import('./old/x');\n",
      "src/b.ts": "import { X } from './old/xy';\n",
      "src/C.cs": "using Shop.Old;\nusing static Shop.Old;\nnamespace A;\n",
      "node_modules/lib/c.ts": "import { X } from './old/x';\n",
    });
    const tsResult = updateImports(root, "./old/x", "./new/x", "typescript");
    assert.equal(tsResult.filesUpdated, 1);
    assert.equal(tsResult.changes.length, 3);
    assert.equal(readFileSync(join(root, "src/b.ts"), "utf-8"), "import { X } from './old/xy';\n");
    assert.match(readFileSync(join(root, "node_modules/lib/c.ts"), "utf-8"), /old\/x/);
    const csResult = updateImports(root, "Shop.Old", "Shop.New", "csharp");
    assert.equal(csResult.filesUpdated, 1);
    assert.equal(readFileSync(join(root, "src/C.cs"), "utf-8"), "using Shop.New;\nusing static Shop.New;\nnamespace A;\n");
  });
});
