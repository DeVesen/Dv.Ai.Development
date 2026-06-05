# Keycodes

**Kategorie:** Utilities
**Import:** Konstanten from `@angular/cdk/keycodes`
**URL:** https://material.angular.dev/cdk/keycodes/overview

## Übersicht

Das `keycodes`-Paket exportiert numerische Konstanten für Keyboard-Event-Codes. Diese ersetzen Magic Numbers im Code und machen Tastatur-Eventhandler lesbarer und wartbarer. Das Paket deckt alle gängigen Tasten ab, einschließlich Steuerungstasten, Navigationstasten, Funktionstasten und browserabhängige Varianten (insbesondere Firefox-spezifische Unterschiede).

## Wichtige Direktiven/Services/Tokens

Keine Klassen oder Direktiven — nur Konstanten:

| Kategorie | Beispiele |
|---|---|
| Steuerung | `ENTER`, `BACKSPACE`, `TAB`, `ESCAPE`, `SHIFT`, `CONTROL`, `ALT`, `CAPS_LOCK` |
| Navigation | `UP_ARROW`, `DOWN_ARROW`, `LEFT_ARROW`, `RIGHT_ARROW`, `HOME`, `END`, `PAGE_UP`, `PAGE_DOWN` |
| Zahlen | `ZERO` bis `NINE` |
| Buchstaben | `A` bis `Z` |
| Numpad | `NUMPAD_ZERO` bis `NUMPAD_NINE`, `NUMPAD_MULTIPLY`, `NUMPAD_PLUS` etc. |
| Funktionstasten | `F1` bis `F12` |
| Sonderzeichen | `SEMICOLON`, `EQUALS`, `COMMA`, `DASH`, `PERIOD`, `SLASH`, `APOSTROPHE` |
| Klammern | `OPEN_SQUARE_BRACKET`, `CLOSE_SQUARE_BRACKET` |
| Firefox-spez. | `FF_SEMICOLON`, `FF_EQUALS`, `FF_DASH` |
| Medientasten | `MUTE`, `VOLUME_UP`, `VOLUME_DOWN` |
| System | `SPACE`, `META`, `MAC_META`, `WIN_KEY` |

## Verwendungsbeispiel

```typescript
import {
  ENTER, SPACE, ESCAPE, UP_ARROW, DOWN_ARROW, HOME, END
} from '@angular/cdk/keycodes';

@Component({ ... })
export class CustomSelectComponent {
  onKeydown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case ENTER:
      case SPACE:
        this.selectCurrent();
        event.preventDefault();
        break;
      case ESCAPE:
        this.close();
        break;
      case UP_ARROW:
        this.movePrevious();
        event.preventDefault();
        break;
      case DOWN_ARROW:
        this.moveNext();
        event.preventDefault();
        break;
      case HOME:
        this.moveFirst();
        event.preventDefault();
        break;
      case END:
        this.moveLast();
        event.preventDefault();
        break;
    }
  }
}
```

## Besonderheiten

- Alle Konstanten sind vom Typ `number` und entsprechen `KeyboardEvent.keyCode`-Werten.
- Das Paket enthält keine Klassen oder Services.
- Firefox verwendet für manche Sonderzeichen andere Key-Codes (z.B. `FF_SEMICOLON = 59` statt `SEMICOLON = 186`).
- Die `hasModifierKey(event, ...modifiers)` Hilfsfunktion prüft ob Modifier-Tasten gedrückt sind.
