# Defining Providers

## Automatic provision

```ts
@Injectable({ providedIn: 'root' })
export class BasicDataStore { /* ... */ }
```

## `InjectionToken` (non-class dependencies)

```ts
export interface AppConfig { apiUrl: string; }

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({apiUrl: 'https://api.example.com'}),
});
```

## Manual provision (`providers` array)

Use when a service lacks `providedIn`, you want a new instance for a specific component, or you're configuring runtime values.

```ts
@Component({
  providers: [
    LocalService,                                          // shorthand for useClass: LocalService
    {provide: Logger, useClass: BetterLogger},              // swap implementation
    {provide: API_URL_TOKEN, useValue: 'https://api.example.com'}, // static value
    {provide: ApiClient, useFactory: (http = inject(HttpClient)) => new ApiClient(http)}, // dynamic
    {provide: OldLogger, useExisting: NewLogger},            // alias
    {provide: INTERCEPTOR_TOKEN, useClass: AuthInterceptor, multi: true}, // multi-value token
  ],
})
export class Example {}
```

## Scopes

- **Application bootstrap:** global singletons — HTTP clients, logging, app-wide config.
- **Component/Directive:** isolated instances, destroyed with the component — component-specific state or forms.
- **Route:** feature-specific services loaded only with certain routes.

## Library pattern: `provide*` functions

Library authors export a function returning a provider array instead of raw provider objects, to encapsulate configuration:

```ts
export function provideAnalytics(config: AnalyticsConfig): Provider[] {
  return [{provide: ANALYTICS_CONFIG, useValue: config}, AnalyticsService];
}
```
