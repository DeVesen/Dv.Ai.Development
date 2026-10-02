# Decision log

The log is the single source for checklist and concept. It lives in the conversation and is written to files only on request. Status labels: see shared conventions.

## Entry format

`ID | topic | decision | reason | alternatives rejected | status | affects`

- Reason is mandatory, even for DERIVED.
- `affects` names earlier IDs the entry touches. Ask the user at that moment; never adjust silently.
- A later change is a new entry referencing the old one (old status: superseded), never an overwrite.

## Material from documents

Facts taken from supplied files enter as DERIVED with the source named, unless the source itself marks them as decided and the user confirms that reading. Contradictions between two sources become a question, not a silent pick.

## Open points

Separate list: point, why open (customer / detail / deferred), who decides, when it becomes relevant. Dependencies between modules appear as DERIVED with "to check".
