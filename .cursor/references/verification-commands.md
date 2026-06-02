# Verifikationsbefehle

Dieses Dokument definiert die offiziellen Build- und Test-Befehle für dieses Projekt.
Agents lesen den Abschnitt `Agents — mandatory verification after changes` um zu wissen,
welche Befehle nach Code-Änderungen ausgeführt werden müssen — kein Raten erlaubt.

---

## Agents — mandatory verification after changes

### Frontend

```powershell
cd {frontend-path}
npm install
ng build          # production build
ng test           # Karma + Jasmine
```

> Dev-Server (kein Verifikationsbefehl): `ng serve` → http://localhost:4200 (proxies /api → https://localhost:7071)

### Backend

```powershell
cd {backend-path}
dotnet restore
dotnet build --configuration Release
dotnet test                        # all test projects under tests/
```

> Einzelnen Service starten (kein Verifikationsbefehl): `dotnet run --project LAC.GatewayService`

---

> **Hinweis:** Der Abschnittstitel `Agents — mandatory verification after changes` darf nicht umbenannt werden.
