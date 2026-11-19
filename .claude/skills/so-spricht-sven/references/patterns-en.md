# AI patterns in English

For English text. Same logic as `muster.md`: each pattern is the model's default choice, the one that fits the widest range of readers. Every sentence you keep must give the reader something new. Patterns 1 to 5 justify an edit on one sighting. Patterns marked *weak alone* need other tells nearby.

## A. Staging instead of stating

### 1. Not X but Y
**Watch for:** not X but Y; not just / only / merely X, but Y; it's not X, it's Y; X isn't the problem, Y is; the answer isn't X, it's Y; "This doesn't mean X. It means Y." across two sentences; "Not because X. Because Y."; "Not a X. Not a Y. A Z."; "stops being X and starts being Y"; a clipped tail ("..., no guessing").
**Problem:** The negative half names something nobody claimed, so the positive half sounds bigger. State Y directly. Keep a contrast only when it corrects a belief the reader really holds, or when both halves carry information.
**Before:** It's not just a build tool; it's a way of thinking about delivery.
**After:** The build tool also fixes the order in which a team ships changes.

### 2. One-line closers and dramatic fragments
**Watch for:** a one-sentence paragraph that repeats the one before; "That's the real win."; "Full stop."; "Let that sink in."; "Read that again."; the same closer after several sections; a sentence after an example that names what it showed ("This highlights the importance of..."); rows of fragments ("No priors. No nostalgia. Just data."); ALL CAPS or every. single. word; a closing "Overall" or "Ultimately" that restates the verdict.
**Problem:** The line asks the reader to pause on a claim instead of adding to it. Cut closers that repeat. Merge fragment rows into one sentence with a concrete claim. Keep a short sentence when it carries a new fact.
**Before:** Then the new flow arrived. No waiting. No extra steps. The old rules were gone.
**After:** The new flow removes the waiting and the extra steps, so the old rules no longer apply.

### 3. Sayings that sound deep
**Watch for:** the real question is; at its core; fundamentally; what really matters; the deeper issue; X is the currency of Y; X becomes a trap; the language of trust; the architecture of collaboration.
**Problem:** An ordinary point is dressed as a hidden truth. Replace the saying with the claim.
**Before:** At its core, this is about readiness. Efficiency becomes a trap when teams forget the human layer.
**After:** The team has to be ready to change how it works. Optimizing only for speed misses how people actually work.

### 4. Staged run-up
**Watch for:** let's dive in; let's break this down; here's what you need to know; here's the thing; the uncomfortable truth is; it turns out; let me be clear; honestly? (as its own sentence); real talk; what if [reframe]?; think about it; and that's okay; "the hard part is"; paragraphs starting with "So,"; announcing the text ("In this section we'll...", "As we'll see...", "Let me walk you through...").
**Problem:** The text announces the point or stages candor instead of making the point. Remove the run-up. "Honestly" inside a casual sentence is fine; the standalone opener before a routine claim is the tell. Any "here's what/this/that" construction is throat-clearing.
**Before:** Let's dive into how caching works. Here's what you need to know.
**After:** Next.js caches data in three layers: request memoization, the data cache, and the router cache.

### 5. Arguing with no one
**Watch for:** this isn't (mainly) about; I'm not saying; to be clear; don't get me wrong; some might say... but; a tempting approach would be; you might think... but.
**Problem:** The text answers an objection that appears nowhere else, usually left over from an earlier draft. Delete it. If it holds a real claim, state the claim. Keep objections that are attributed or fully answered.
**Before:** This isn't mainly about prompt length, and I'm not saying documentation doesn't matter. The question is whether the agent can use the instruction when it acts.
**After:** The question is whether the agent can use the instruction when it acts.

## B. Rhythm by rule

### 6. Forced triads
**Problem:** Ideas come in threes to sound complete. Check that each item adds a separate idea. If not, merge them, develop the strongest, or use two. Keep three when there are three.
**Before:** The event features talks, panels, and networking opportunities, with innovation, inspiration, and insight.
**After:** The event has talks and panels, with time between sessions to talk.

### 7. Repeated openings
**Problem:** Several sentences in a row start with the same subject. Merge them, change the subject, or open with the action. Repetition for rhythm on purpose is fine.

### 8. Dashes as the universal connector
**Rule:** No em dashes (—) or en dashes (–) in the final text, including spaced dashes and ` -- `. Use a period, comma, colon, or parentheses, or rewrite. Leave code, paths, commands, and URLs alone. Sven's short hyphen with spaces and "…" as pauses stay. *Weak alone*; a text full of them is not.
**Before:** The new policy — announced without warning — affects thousands.
**After:** The new policy, announced without warning, affects thousands.

### 9. Stacked qualifiers
**Watch for:** to be fair; it's also possible; could potentially; might arguably; in some cases it may.
**Problem:** Repeated editing piles qualifiers until every claim sounds unsure, usually to soften an earlier overstatement. Keep one only when the source supports it and the meaning needs it. Keep scope statements, legal and safety notices, and real corrections. *Weak alone.*
**Before:** It could potentially be argued that the policy might have some effect.
**After:** The policy may affect outcomes.

### 10. Passive voice, missing subjects, false agency
**Watch for:** "was created", "it is believed", "mistakes were made"; things doing what only people do: the complaint becomes a fix, the decision emerges, the culture shifts, the data tells us, the market rewards, the conversation moves.
**Problem:** The text hides who acts. Name the actor and put them first. If no one fits, use "you" or "we". *Weak alone*, except for things with human verbs.
**Before:** No config needed. The complaint becomes a fix.
**After:** You don't need a config file. The team fixed the complaint that week.

### 11. Narrator from a distance
**Watch for:** "This happens because..."; "This is why..."; "People tend to..."; "Nobody designed this."
**Problem:** The text floats above the scene instead of putting the reader in it. "You don't sit down one day and decide to..." beats "Nobody designed this."

### 12. Lazy extremes, filler adverbs, hedges
**Watch for:** every, always, never, everyone, nobody (false authority); really, just, literally, genuinely, honestly, simply, actually, deeply, truly, fundamentally, inherently, inevitably, interestingly, importantly, crucially; "it's worth noting", "at the end of the day", "when it comes to", "in today's [X]", "the reality is".
**Problem:** Intensifiers and softeners with no content. Cut them or name the specific thing. Not every adverb is a tell: *not*, *also*, *still*, and adverbs of time or place carry meaning.
**Before:** This is really an incredibly important point that everyone should always keep in mind.
**After:** Check this before every release, because a mistake here hits all customers.

### 13. Sentence starters
**Watch for:** sentences opening with What, When, Where, Which, Who, Why, How as a crutch ("What makes this hard is..."); paragraphs starting with "So"; sentences starting with "Look,"; questions answered immediately.
**Problem:** The Wh- opener postpones the subject. "What makes this hard is the constraint" becomes "The constraint is X". Name the thing.

## C. Inflation and borrowed authority

### 14. AI vocabulary
**Watch for:** additionally; align with; bolstered; crucial; delve; deep dive; enduring; enhance; foster; garner; highlight (verb); interplay; intricate; key (adjective); landscape (abstract); leverage; meticulous; navigate (challenges); pivotal; robust (figurative); seamless; showcase; tapestry; testament; underscore; unlock; vibrant; unpack; lean into; game-changer; double down; moving forward; circle back; on the same page.
**Problem:** Models use these far more than people do, especially in clusters. They are tells wherever they appear. Replace with the concrete word: navigate → handle, unpack → explain, lean into → accept, landscape → situation, game-changer → important, moving forward → next.

### 15. Inflated significance
**Watch for:** stands as a testament; a pivotal moment; plays a key role; marks a turning point; underscores its importance; enduring legacy; sets the stage for; evolving landscape; "Despite these challenges... continues to thrive"; "Challenges and Outlook"; "the future looks bright"; "exciting times ahead".
**Problem:** An ordinary detail is said to mark change or prove a legacy. Keep the fact, drop the significance, and end on the last concrete fact.
**Before:** The institute was founded in 1989, marking a pivotal moment for regional statistics.
**After:** The institute was founded in 1989.

### 16. Vague connection
**Watch for:** associated with; in connection with; linked to; tied to.
**Problem:** The text says two things relate without saying how. Name the relationship (founded, leads, funds). If you don't know it, keep the vague wording.

### 17. Shallow -ing phrases
**Watch for:** highlighting, underscoring, emphasizing, ensuring, reflecting, symbolizing, contributing to, fostering, showcasing, encompassing.
**Problem:** An -ing phrase is bolted onto a plain fact to make it sound deeper. Keep the fact. Keep the phrase only if the source supports what it claims.
**Before:** The temple is painted blue, green, and gold, reflecting the community's deep connection to the land.
**After:** The temple is painted blue, green, and gold, after the bluebonnets and the Gulf.

### 18. Sales language
**Watch for:** nestled; in the heart of; breathtaking; stunning; renowned; rich (figurative); diverse array; must-visit; groundbreaking; commitment to.
**Problem:** The text reads like an ad. Say what the thing is.

### 19. Borrowed authority
**Watch for:** experts argue; observers have noted; industry reports; several publications; "featured in" plus a list of outlets; "active social media presence with N followers".
**Problem:** A name or unnamed authority stands in for what was said. Name the real source and what it said, or cut the claim. A missing citation alone is not a tell.

### 20. Avoiding is, are, has
**Watch for:** serves as; stands as; functions as; represents; boasts; features; offers; maintains.
**Problem:** Plain verbs replaced by longer phrases. Use *is*, *are*, *has*.
**Before:** The gallery serves as an exhibition space and boasts four separate rooms.
**After:** The gallery is an exhibition space with four rooms.

## D. Formatting by rule

### 21. Bold as decoration
**Problem:** Words bolded for no reason, and lists where every item has a bold label and a colon. Remove the bold. Turn a labeled list into prose when the labels carry no information.

### 22. Decorative headings
**Problem:** Title Case on every heading, emojis or arrows as decoration, a rule between every section, a top heading that repeats the title, a heading written for effect. Use sentence case and name what the section holds.

## E. Leftovers from chat and draft

### 23. Chatbot residue
**Watch for:** Great question!; Certainly!; Of course!; I hope this helps; Let me know if...; Would you like me to...?; Here is a...; You're absolutely right.
**Problem:** A chatbot's greeting, praise, offer, or sign-off is left in text that should stand alone. Remove the wrapper, keep the content. With Sven, ask a closing question only when a real decision hangs on it.

### 24. Knowledge-limit disclaimers and guesses
**Watch for:** as of [date]; up to my last training update; details are limited; based on available information; "she likely grew up..."; it is believed that.
**Problem:** The text mentions the edge of its knowledge, or admits it found nothing and fills the gap with a plausible guess. Say what the source doesn't show, or cut.

### 25. Heading repeated in the first sentence
**Problem:** A heading is followed by a one-line paragraph that restates it. Remove the sentence.

### 26. Writing about the document
**Watch for:** what the text replaced ("was added to replace"); how it was assembled ("compiled from"); "anything unconfirmed is flagged"; a legend the reader can see ("the table below compares").
**Problem:** The text describes itself instead of its subject. Mention earlier versions only in changelogs and migration guides. Keep source credits the reader can follow and caveats that change what the reader should do.

### 27. Re-explaining what the reader knows
**Problem:** In a reply the reader has the context. Rebuilding it buries the point. Lead with the decision and keep only the reason that would change whether the reader agrees. Put diagnosis and proof in the ticket or doc. Use only when the surrounding conversation is visible.
**Before:** You're right, this is a workaround. The real fix is in `MergeService`, where `pipeline_id` needs updating with `parent_id`. I checked QA: 123 merges, 6 rows wrong. Since `MergeService` is shared, I'd rather open a separate ticket.
**After:** Agreed, it's a workaround. I'll open a separate ticket for the `MergeService` fix and the backfill and keep this PR on the one account.

## F. Sven writing English

Sven writes German. When he needs English (code comments, commit messages, docs, PR titles), the English must read as native, not translated.

- Same voice as in German: result first, short, imperative for commits ("Fix scanner truncating article numbers"), no filler.
- Commit and PR titles: present tense imperative, no period, under about 70 characters.
- Docs and specs: plain, complete sentences, neutral tone. No contractions in formal docs, contractions are fine in chat.
- Technical terms stay as they are. Don't translate Branch, Skill, Review into German inside English text.

**Germanisms to avoid:**

| German-shaped | Native |
|---|---|
| actual (for "aktuell") | current |
| eventually (for "eventuell") | possibly, maybe |
| become (for "bekommen") | get |
| sensible (for "sensibel") | sensitive |
| since (for "seit" with present tense) | for / has been |
| "make a PR open" | open a PR |
| "it gives..." (for "es gibt") | there is / there are |
| "I would like to..." (for every request) | "Please..." or the plain imperative |
| "In my opinion" at every claim | state the claim |
| verb at the end of a subordinate clause carried into English | normal English word order |

## When not to act

Patterns are defaults a person can choose on purpose. Leave a phrase alone inside a quotation, title, proper name, or a passage discussing the phrase. Greetings, sign-offs, and a plain "let me know" predate chatbots. Keep the writer's specific details, mixed feelings, dated references, and genuine asides. In casual chat, lowercase, fragments, and blunt stops are the register. One tell is not enough there, except chatbot residue.
