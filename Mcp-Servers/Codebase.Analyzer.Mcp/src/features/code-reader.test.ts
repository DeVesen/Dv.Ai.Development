import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { readClassSummary, readMethod, readSignaturesOnly } from "./code-reader.js";

function file(name: string, content: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "code-reader-")), name);
  writeFileSync(path, content);
  return path;
}

const CSHARP = `// Größe: Umlaute vor dem Code verschieben keine Positionen
namespace Shop.Orders
{
    public class OrderService : ServiceBase, IOrderService, IDisposable
    {
        private readonly string _tricky = @"brace { in string";
        public OrderService(IRepository repository) : base(repository) { }
        public decimal Discount { get; set; }
        int Hidden { get; }
        [HttpGet("{id}")]
        public async Task<Order> LoadAsync(Guid id, CancellationToken ct = default)
        {
            var text = $"{{ {id} }}";
            if (id == Guid.Empty) { return null; }
            return await _repo.Get(id, ct);
        }
        public int Total(int a) => a * 2;
        public int Total(int a, int b) => a + b;
        public void Dispose() { }
    }

    public interface IOrderService { Task<Order> LoadAsync(Guid id, CancellationToken ct); }
}
`;

const TYPESCRIPT = `import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService extends BaseStore implements OnDestroy {
  private readonly http = inject(HttpClient);
  protected items: Item[] = [];
  readonly count = computed(() => this.items.length);
  #secret = 1;

  constructor(private readonly log: Logger) { super(); }

  get total(): number { return this.items.reduce((sum, i) => sum + i.price, 0); }

  async add(item: Item, quantity = 1): Promise<void> {
    if (quantity < 1) { throw new Error('{'); }
    this.items.push(item);
  }

  private reset(): void { this.items = []; }

  ngOnDestroy(): void {}
}

export function formatPrice(value: number): string { return value.toFixed(2); }
`;

describe("readSignaturesOnly", () => {
  it("ReadSignaturesOnly_CSharp_PublicMembersWithoutBodiesAndPrivateHidden", async () => {
    const signatures = await readSignaturesOnly(file("OrderService.cs", CSHARP));
    const texts = signatures.map((s) => s.signature);
    assert.ok(texts.includes("public OrderService(IRepository repository) : base(repository)"), texts.join("\n"));
    assert.ok(texts.includes("public decimal Discount { get; set; }"));
    assert.ok(texts.includes('[HttpGet("{id}")] public async Task<Order> LoadAsync(Guid id, CancellationToken ct = default)'));
    assert.ok(texts.includes("public int Total(int a, int b)"));
    assert.ok(!texts.some((t) => t.includes("Hidden")), "private property must be hidden");
    assert.ok(texts.some((t) => t === "Task<Order> LoadAsync(Guid id, CancellationToken ct)"), "interface member is public");
    const load = signatures.find((s) => s.signature.includes("class") === false && s.signature.includes("LoadAsync") && s.access === "public" && s.line > 5);
    assert.equal(load?.line, 10);
  });

  it("ReadSignaturesOnly_CSharpIncludePrivate_ShowsPrivateProperty", async () => {
    const signatures = await readSignaturesOnly(file("OrderService.cs", CSHARP), true);
    assert.ok(signatures.some((s) => s.signature === "int Hidden { get; }" && s.access === "private"));
  });

  it("ReadSignaturesOnly_TypeScript_ClassMembersAndFunctions", async () => {
    const signatures = await readSignaturesOnly(file("cart.service.ts", TYPESCRIPT));
    const texts = signatures.map((s) => s.signature);
    assert.ok(texts.includes("async add(item: Item, quantity = 1): Promise<void>"), texts.join("\n"));
    assert.ok(texts.includes("get total(): number"));
    assert.ok(texts.includes("constructor(private readonly log: Logger)"));
    assert.ok(texts.includes("export function formatPrice(value: number): string"));
    assert.ok(texts.includes("readonly count = computed(() => this.items.length)"));
    assert.ok(!texts.some((t) => t.includes("reset") || t.includes("#secret") || t.includes("http")), "private members must be hidden");
  });
});

describe("readMethod", () => {
  it("ReadMethod_CSharpBracesInStrings_ReturnsWholeMethod", async () => {
    const [method] = await readMethod(file("OrderService.cs", CSHARP), "LoadAsync", "OrderService");
    assert.equal(method.startLine, 10);
    assert.equal(method.endLine, 16);
    assert.match(method.body, /return await _repo\.Get\(id, ct\);\n\s+}$/);
    assert.equal(method.className, "OrderService");
  });

  it("ReadMethod_CSharpOverloads_ReturnsAll", async () => {
    const methods = await readMethod(file("OrderService.cs", CSHARP), "Total");
    assert.deepEqual(methods.map((m) => m.signature), ["public int Total(int a)", "public int Total(int a, int b)"]);
  });

  it("ReadMethod_TypeScriptMethodAndFunction_Found", async () => {
    const path = file("cart.service.ts", TYPESCRIPT);
    const [add] = await readMethod(path, "add");
    assert.equal(add.signature, "async add(item: Item, quantity = 1): Promise<void>");
    assert.match(add.body, /this\.items\.push\(item\);\n\s+}$/);
    const [format] = await readMethod(path, "formatPrice");
    assert.equal(format.className, null);
  });

  it("ReadMethod_Unknown_Throws", async () => {
    await assert.rejects(readMethod(file("OrderService.cs", CSHARP), "Nope"), /Method not found: Nope/);
  });
});

describe("readClassSummary", () => {
  it("ReadClassSummary_CSharp_BaseClassInterfacesMembers", async () => {
    const summary = await readClassSummary(file("OrderService.cs", CSHARP));
    assert.equal(summary.className, "OrderService");
    assert.equal(summary.baseClass, "ServiceBase");
    assert.deepEqual(summary.interfaces, ["IOrderService", "IDisposable"]);
    assert.deepEqual(summary.properties.map((p) => `${p.access} ${p.type} ${p.name}`), ["public decimal Discount", "private int Hidden"]);
    assert.deepEqual(summary.methods.find((m) => m.name === "LoadAsync"), { name: "LoadAsync", returnType: "Task<Order>", parameters: ["Guid id", "CancellationToken ct = default"], line: 10 });
  });

  it("ReadClassSummary_TypeScript_ExtendsImplementsMembers", async () => {
    const summary = await readClassSummary(file("cart.service.ts", TYPESCRIPT), "CartService");
    assert.equal(summary.baseClass, "BaseStore");
    assert.deepEqual(summary.interfaces, ["OnDestroy"]);
    assert.ok(summary.properties.some((p) => p.name === "items" && p.type === "Item[]" && p.access === "protected"));
    assert.ok(summary.methods.some((m) => m.name === "reset" && m.returnType === "void"));
  });

  it("ReadClassSummary_UnsupportedFile_Throws", async () => {
    await assert.rejects(readClassSummary(file("x.py", "class A: pass")), /Unsupported file type/);
  });
});
