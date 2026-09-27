import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { analyzeAngularArchitecture, readComponentBundle } from "./angular-readers.js";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "angular-readers-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const COMPONENT = `@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, PriceComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  readonly items = input.required<Item[]>();
  remove(item: Item): void {}
}
`;

describe("readComponentBundle", () => {
  it("ReadComponentBundle_SummaryMode_MetadataSignaturesBindings", async () => {
    const root = project({
      "cart/cart.component.ts": COMPONENT,
      "cart/cart.component.html": '<ul>@for (item of items(); track item.id) {<li [class.big]="item.big" (click)="remove(item)">{{ item.name }}</li>}</ul>',
      "cart/cart.component.scss": "ul { margin: 0; }",
      "cart/cart.component.spec.ts": "describe('CartComponent', () => { it('works', () => {}); });\nfunction helper(): void {}\n",
    });
    const bundle = await readComponentBundle(join(root, "cart/cart.component.ts"), { includeTemplate: true, templateMode: "summary", includeStyles: true, includeSpec: true });
    assert.equal(bundle.selector, "app-cart");
    assert.equal(bundle.standalone, true);
    assert.deepEqual(bundle.imports, ["CommonModule", "PriceComponent"]);
    assert.deepEqual(bundle.typescript.map((s) => s.signature), ["readonly items = input.required<Item[]>()", "remove(item: Item): void"]);
    assert.deepEqual(bundle.template?.bindings, ['[class.big]="item.big"', '(click)="remove(item)"', "@for (item of items(); track item.id)"]);
    assert.equal(bundle.template?.content, undefined);
    assert.equal(bundle.styles?.hasStyles, true);
    assert.deepEqual(bundle.spec?.signatures?.map((s) => s.signature), ["function helper(): void"]);
  });

  it("ReadComponentBundle_InlineTemplateFullMode_ReturnsTemplateText", async () => {
    const root = project({ "x.component.ts": "@Component({ selector: 'app-x', template: `<p>{{ a }}</p>` })\nexport class XComponent {}\n" });
    const bundle = await readComponentBundle(join(root, "x.component.ts"), { includeTemplate: true, templateMode: "full", includeStyles: false, includeSpec: false });
    assert.equal(bundle.template?.content, "<p>{{ a }}</p>");
    assert.equal(bundle.standalone, null);
    assert.equal(bundle.styles, undefined);
  });
});

describe("analyzeAngularArchitecture", () => {
  it("AnalyzeAngularArchitecture_ThreeRules_ViolationsReported", () => {
    const root = project({
      "src/app/core/api/orders-api.service.ts": "export class OrdersApiService { private http = inject(HttpClient); private router = inject(Router); }",
      "src/app/features/cart/services/cart.service.ts": "export class CartService { constructor(private http: HttpClient) {} }",
      "src/app/features/cart/cart-api.service.ts": "export class CartApiService { private http = inject(HttpClient); }",
      "src/app/features/cart/services/ok.service.ts": "export class OkService { private api = inject(OrdersApiService); }",
      "node_modules/lib/bad-api.service.ts": "export class BadApiService {}",
    });
    const result = analyzeAngularArchitecture(root);
    assert.equal(result.summary.filesScanned, 4);
    assert.deepEqual(result.misplaced.map((m) => m.class), ["CartApiService"]);
    assert.deepEqual(result.httpInFeatureService.map((m) => m.class), ["CartService"]);
    assert.deepEqual(result.namingViolations.map((m) => m.issue), ["OrdersApiService injects Router — violates HTTP-only contract"]);
    assert.equal(result.summary.violations, 3);
  });
});
