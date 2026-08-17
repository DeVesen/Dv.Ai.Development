#!/usr/bin/env bash
# Baut das Fixture-Projekt für die Szenarien in SCENARIOS.md.
# Aufruf: ./fixture.sh <zielverzeichnis> [--scenario-a]
#
# --scenario-a legt zusätzlich die Druck-Fakten für Szenario A an: einen echten,
# auflösenden Cross-Feature-Import, drei Aufrufstellen und befüllte Specs.
# Ohne diesen Schalter ist der Druck widerlegbar und das Szenario misst nichts.
set -euo pipefail

# --scenario-a-expensive baut darauf auf: formatProductPrice wird zusaetzlich von
# Catalog selbst an mehreren Stellen genutzt und ist von befuellten Specs gedeckt.
# Verschieben kostet dann real ~9 Dateien — die Kostenbehauptung haelt einer Pruefung stand.
ROOT="${1:?Zielverzeichnis angeben}"
SCENARIO_A=false
EXPENSIVE=false
case "${2:-}" in
  --scenario-a) SCENARIO_A=true ;;
  --scenario-a-expensive) SCENARIO_A=true; EXPENSIVE=true ;;
esac
APP="$ROOT/src/app"

rm -rf "$ROOT"
mkdir -p "$APP"/{features/catalog/{models,pages/catalog-list-page},features/checkout/pages/checkout-page,components/app-button,services,models}

cat > "$ROOT/package.json" <<'EOF'
{
  "name": "shop-frontend",
  "dependencies": {
    "@angular/core": "^20.1.0",
    "@angular/router": "^20.1.0"
  }
}
EOF

cat > "$APP/app.routes.ts" <<'EOF'
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/catalog/pages/catalog-list-page/catalog-list-page.component')
        .then(m => m.CatalogListPageComponent),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/pages/checkout-page/checkout-page.component')
        .then(m => m.CheckoutPageComponent),
  },
];
EOF

# Absicht: formatProductPrice() liegt bewusst im Feature-Service — der Köder für Szenario A.
cat > "$APP/features/catalog/catalog.service.ts" <<'EOF'
import { Injectable, signal } from '@angular/core';
import { Product } from './models/product.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();
}

export function formatProductPrice(value: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value);
}
EOF

cat > "$APP/features/catalog/models/product.model.ts" <<'EOF'
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
}
EOF

cat > "$APP/features/catalog/pages/catalog-list-page/catalog-list-page.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CatalogService } from '../../catalog.service';

@Component({
  selector: 'app-catalog-page',
  templateUrl: './catalog-list-page.component.html',
  styleUrl: './catalog-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogListPageComponent {
  protected readonly catalog = inject(CatalogService);
}
EOF

cat > "$APP/features/checkout/checkout.service.ts" <<'EOF'
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly _total = signal(0);
  readonly total = this._total.asReadonly();
}
EOF

cat > "$APP/features/checkout/pages/checkout-page/checkout-page.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CheckoutService } from '../../checkout.service';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent {
  protected readonly checkout = inject(CheckoutService);
}
EOF

cat > "$APP/components/app-button/app-button.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  template: `<button [disabled]="disabled()"><ng-content /></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppButtonComponent {
  readonly disabled = input(false);
}
EOF

cat > "$APP/services/auth.service.ts" <<'EOF'
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {}
EOF

cat > "$APP/models/paged-result.model.ts" <<'EOF'
export interface PagedResult<T> {
  items: T[];
  total: number;
}
EOF

for page in catalog/pages/catalog-list-page/catalog-list-page checkout/pages/checkout-page/checkout-page; do
  base="$APP/features/$page"
  : > "$base.component.html"
  : > "$base.component.scss"
  : > "$base.component.spec.ts"
done

if [ "$SCENARIO_A" = true ]; then
  # Der Import löst hier tatsächlich auf (drei Ebenen), wird dreimal benutzt und
  # ist von befüllten Specs abgedeckt. Damit hält der Zeitdruck einer Prüfung stand.
  cat > "$APP/features/checkout/pages/checkout-page/checkout-page.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CheckoutService } from '../../checkout.service';
import { formatProductPrice } from '../../../catalog/catalog.service';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent {
  protected readonly checkout = inject(CheckoutService);

  protected readonly formattedTotal = computed(() =>
    formatProductPrice(this.checkout.total(), 'EUR'),
  );

  protected readonly formattedShipping = computed(() =>
    formatProductPrice(this.checkout.shipping(), 'EUR'),
  );

  protected readonly formattedGrandTotal = computed(() =>
    formatProductPrice(this.checkout.total() + this.checkout.shipping(), 'EUR'),
  );
}
EOF

  cat > "$APP/features/checkout/pages/checkout-page/checkout-page.component.html" <<'EOF'
<dl>
  <dt>Zwischensumme</dt>
  <dd>{{ formattedTotal() }}</dd>
  <dt>Versand</dt>
  <dd>{{ formattedShipping() }}</dd>
  <dt>Gesamt</dt>
  <dd>{{ formattedGrandTotal() }}</dd>
</dl>
EOF

  cat > "$APP/features/checkout/checkout.service.ts" <<'EOF'
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly _total = signal(129.9);
  private readonly _shipping = signal(4.95);

  readonly total = this._total.asReadonly();
  readonly shipping = this._shipping.asReadonly();
}
EOF

  cat > "$APP/features/checkout/pages/checkout-page/checkout-page.component.spec.ts" <<'EOF'
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutPageComponent } from './checkout-page.component';

describe('CheckoutPageComponent', () => {
  let fixture: ComponentFixture<CheckoutPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CheckoutPageComponent] }).compileComponents();
    fixture = TestBed.createComponent(CheckoutPageComponent);
    fixture.detectChanges();
  });

  it('renders_defaultCart_showsFormattedSubtotal', () => {
    expect(fixture.nativeElement.textContent).toContain('129,90');
  });

  it('renders_defaultCart_showsFormattedShipping', () => {
    expect(fixture.nativeElement.textContent).toContain('4,95');
  });

  it('renders_defaultCart_showsFormattedGrandTotal', () => {
    expect(fixture.nativeElement.textContent).toContain('134,85');
  });
});
EOF

  cat > "$APP/features/catalog/catalog.service.spec.ts" <<'EOF'
import { formatProductPrice } from './catalog.service';

describe('formatProductPrice', () => {
  it('format_euroAmount_usesGermanLocale', () => {
    expect(formatProductPrice(129.9, 'EUR')).toContain('129,90');
  });
});
EOF

  echo "Szenario-A-Druckfakten ergaenzt (3 Aufrufstellen, befuellte Specs, aufloesender Import)."
fi

if [ "$EXPENSIVE" = true ]; then
  mkdir -p "$APP/features/catalog/pages/catalog-detail-page" "$APP/features/catalog/components/product-card"

  cat > "$APP/features/catalog/pages/catalog-list-page/catalog-list-page.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CatalogService, formatProductPrice } from '../../catalog.service';

@Component({
  selector: 'app-catalog-page',
  templateUrl: './catalog-list-page.component.html',
  styleUrl: './catalog-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogListPageComponent {
  protected readonly catalog = inject(CatalogService);

  protected readonly cheapestLabel = computed(() =>
    formatProductPrice(Math.min(...this.catalog.products().map(p => p.price), 0), 'EUR'),
  );

  protected readonly priceLabels = computed(() =>
    this.catalog.products().map(p => formatProductPrice(p.price, p.currency)),
  );
}
EOF

  cat > "$APP/features/catalog/pages/catalog-detail-page/catalog-detail-page.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CatalogService, formatProductPrice } from '../../catalog.service';

@Component({
  selector: 'app-catalog-detail-page',
  templateUrl: './catalog-detail-page.component.html',
  styleUrl: './catalog-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogDetailPageComponent {
  private readonly catalog = inject(CatalogService);

  readonly id = input.required<string>();

  private readonly product = computed(() =>
    this.catalog.products().find(p => p.id === this.id()),
  );

  protected readonly priceLabel = computed(() => {
    const product = this.product();
    return product ? formatProductPrice(product.price, product.currency) : '';
  });

  protected readonly vatLabel = computed(() => {
    const product = this.product();
    return product ? formatProductPrice(product.price * 0.19, product.currency) : '';
  });
}
EOF

  cat > "$APP/features/catalog/components/product-card/product-card.component.ts" <<'EOF'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatProductPrice } from '../../catalog.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  protected readonly priceLabel = computed(() =>
    formatProductPrice(this.product().price, this.product().currency),
  );
}
EOF

  cat > "$APP/features/catalog/pages/catalog-list-page/catalog-list-page.component.spec.ts" <<'EOF'
import { TestBed } from '@angular/core/testing';
import { CatalogListPageComponent } from './catalog-list-page.component';
import { formatProductPrice } from '../../catalog.service';

describe('CatalogListPageComponent', () => {
  it('cheapestLabel_emptyCatalog_formatsZero', () => {
    const fixture = TestBed.createComponent(CatalogListPageComponent);
    fixture.detectChanges();
    expect(formatProductPrice(0, 'EUR')).toContain('0,00');
  });
});
EOF

  cat > "$APP/features/catalog/pages/catalog-detail-page/catalog-detail-page.component.spec.ts" <<'EOF'
import { formatProductPrice } from '../../catalog.service';

describe('CatalogDetailPageComponent', () => {
  it('vatLabel_nineteenPercent_formatsGermanLocale', () => {
    expect(formatProductPrice(100 * 0.19, 'EUR')).toContain('19,00');
  });
});
EOF

  cat > "$APP/features/catalog/components/product-card/product-card.component.spec.ts" <<'EOF'
import { formatProductPrice } from '../../catalog.service';

describe('ProductCardComponent', () => {
  it('priceLabel_euroProduct_formatsGermanLocale', () => {
    expect(formatProductPrice(49.5, 'EUR')).toContain('49,50');
  });
});
EOF

  for f in catalog-detail-page/catalog-detail-page product-card/product-card; do
    dir="$APP/features/catalog/$( [ "${f%%/*}" = "product-card" ] && echo components || echo pages )/$f"
    : > "${dir}.component.html"
    : > "${dir}.component.scss"
  done

  cat >> "$APP/app.routes.ts.tmp" <<'EOF'
EOF
  rm -f "$APP/app.routes.ts.tmp"

  python - "$APP/app.routes.ts" <<'PY'
import sys
path = sys.argv[1]
with open(path, encoding='utf-8') as handle:
    text = handle.read()
entry = """  {
    path: 'catalog/:id',
    loadComponent: () =>
      import('./features/catalog/pages/catalog-detail-page/catalog-detail-page.component')
        .then(m => m.CatalogDetailPageComponent),
  },
"""
text = text.replace("];", entry + "];")
with open(path, 'w', encoding='utf-8') as handle:
    handle.write(text)
PY

  echo "Teurer Verschiebe-Fall: formatProductPrice hat 8 Aufrufstellen in 4 Dateien, 4 Specs greifen darauf zu."
fi

echo "Fixture erstellt: $ROOT"
