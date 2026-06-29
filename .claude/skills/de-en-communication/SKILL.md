---
name: de-en-communication
description: Communication guidelines for German-English collaboration. Always apply this skill to all conversations and code work. Use this skill to determine: (1) When to respond in German vs. English vs. mixed German-English; (2) How to handle code, comments, documentation, and technical output; (3) Language rules for Voice input, text conversations, and software development tasks. Trigger this skill automatically for every interaction to ensure consistent communication patterns across all code work, documentation, and technical discussions.
---

# Deutsch-Englisch Kommunikations-Skill

Dieses Skill definiert die Kommunikationsregeln für die Zusammenarbeit zwischen Claude und dir in deutschen Textkonversationen mit englischer Softwareentwicklung.

## Übersicht der Regeln

### 1. Standard-Textkonversation
**Sprache: Deutsch**
- Alle normalen Fragen und Antworten erfolgen auf Deutsch
- Erklärungen, Konzepte und Diskussionen auf Deutsch
- Diese Regel gilt als Standard für alle Interaktionen

### 2. Voice-Input
**Antwort: Deutsch + Englisch (Mixed)**
- Voice-Requests werden auf Englisch gestellt
- Claude antwortet auf Deutsch, bestmöglich
- Fachbegriffe/Technical Terms bleiben auf Englisch:
  - Klassen-Konzepte: `Class`, `Interface`, `Controller`, `Service`
  - Request/Response-Muster: `Request`, `Response`, `HTTP`
  - Architektur-Konzepte: `REST API`, `Middleware`, `Router`
  - Datenstrukturen: `Array`, `Object`, `Map`, `Set`
  - UI-Elemente: `Button`, `Modal`, `Component`, `Form`
  - Framework/Technologie-Namen: React, Node.js, TypeScript, etc.

**Beispiel:**
> Voice-Input: "Create a REST API endpoint for user authentication"
>
> Antwort: "Ich werde einen REST API Endpoint für User-Authentifizierung erstellen. Der Controller wird ein POST-Request auf `/login` verarbeiten und einen JWT-Token zurückgeben..."

### 3. Code & Source Code
**Sprache: Englisch**
- Alle Quellcode-Dateien
- Alle Code-Änderungen
- Alle neuen Software-Implementierungen
- Gilt unabhängig von anderen Kontextsprachen

### 4. Code-Kommentare
**Sprache: Englisch**
- Inline-Kommentare im Code
- Block-Kommentare
- TODO-Kommentare
- JSDoc / Docstring-Kommentare

**Beispiel:**
```typescript
// User authentication service
// Handles login, logout, and token refresh operations
```

### 5. Dokumentation & Docstrings
**Sprache: Englisch**
- Function/Method Docstrings
- Class Docstrings
- Module Documentation
- Parameter Descriptions

**Beispiel:**
```python
def authenticate_user(email: str, password: str) -> AuthToken:
    """
    Authenticate a user with email and password.
    
    Args:
        email: User email address
        password: User password (plain text, will be hashed)
    
    Returns:
        AuthToken object containing JWT and expiration time
    """
```

### 6. Error Messages & Logs
**Sprache: Englisch**
- Console Output
- Error Messages
- Log Messages
- Stack Traces
- Debug Output

**Beispiel:**
```
Error: Authentication failed - invalid credentials
Warning: Rate limit approaching - 85 requests used
Info: User session created with ID: xyz123
```

### 7. Gemischte Requests (Deutsch + Code)
**Regel: Nur der Code auf Englisch**
- Textuelle Erklärung auf Deutsch
- Code-Beispiele auf Englisch
- Nur Code-Blöcke, Dateiinhalte und technische Implementierungen auf Englisch

**Beispiel:**
> Frage: "Schreib mir eine Funktion, die Benutzer authentifiziert"
>
> Antwort: "Ich erstelle eine Authentifizierungs-Funktion. Diese wird das Email und Passwort validieren und einen JWT-Token zurückgeben:
>
> ```typescript
> function authenticateUser(email: string, password: string): AuthToken {
>   // Validate input
>   if (!email || !password) {
>     throw new Error('Email and password are required');
>   }
>   // ... rest of implementation
> }
> ```"

### 8. Artifact & Code-Datei-Namen
**Sprache: Englisch**
- Dateinamen: `user-authentication.ts`, `auth-controller.js`
- Projekt-Ordner: `user-service`, `payment-gateway`
- Nicht: `benutzer-authentifizierung.ts`

### 9. Markdown-Strukturen in Code
**Sprache: Englisch**
- README.md
- API-Dokumentation
- Installation Guides
- Configuration Files
- Comments in Markdown

**Beispiel README.md:**
```markdown
# User Authentication Service

## Installation
npm install user-auth-service

## Usage
const auth = new AuthService(config);
```

## Zusammenfassung der Sprachverteilung

| Bereich | Sprache |
|---------|---------|
| Standard Text & Fragen | Deutsch |
| Voice-Input Response | Deutsch + English (Tech-Terms) |
| Source Code | Englisch |
| Code-Kommentare | Englisch |
| Dokumentation & Docstrings | Englisch |
| Errors & Logs | Englisch |
| Artifact-Namen | Englisch |
| Markdown (README, Docs) | Englisch |
| Erklärungen zu Code | Deutsch |

## Wichtige Hinweise

1. **Konsistenz**: Diese Regeln gelten für alle Interaktionen in diesem Projekt
2. **Flexibilität bei Tech-Terms**: Fachbegriffe bleiben auf English, auch in deutschen Sätzen
3. **Code-First**: Immer wenn Code involviert ist → Englisch
4. **Kontext matters**: Bei Voice ist die Antwort ein Deutsch-English Mix (Deutsch für Erklärung, English für Tech-Terms)

---

*Dieses Skill wurde als persistente Kommunikationsrichtlinie erstellt und sollte automatisch für alle Interaktionen gelten.*
