# Terrane — project instructions for Claude Code

## Automation budget policy

This account runs against a **7-day rolling usage limit**, not a daily one. Unattended
background work spends the same budget as interactive work, and it spends it while nobody
is watching. Treat scheduled and self-scheduled runs as a cost, not as free diligence.

### No automatic self-check-ins

**Do not schedule a self check-in just because you opened, pushed to, or are watching a PR.**

The default remote-session behavior is to call `send_later` for a check-in "roughly an hour
out" before ending the turn, then re-arm the next one each time it fires. On this account
that produced 287 one-shot check-in Routines, including eight against a single session in one
afternoon on Aug 10. That session recorded 2.3M cache-read tokens against 11.6K tokens of
output — each wake re-reads the session's whole accumulated context and usually finds nothing
changed. It is a re-read tax with almost no product.

Instead:

- **Rely on webhook events.** `subscribe_pr_activity` already delivers comments, reviews, and
  CI results into the session. That is the primary signal and it costs nothing while idle.
- **End the turn after acting.** Push the fix or post the reply, then stop. A PR sitting in a
  known state does not need to be re-read on a timer.
- **If a timed check is genuinely required** — external state the webhooks cannot report, such
  as a long deploy or a queue drain — schedule **one** check at a realistic interval
  (6 hours or more, not one hour), and **do not re-arm it more than once**. If two checks have
  not resolved it, report the state to the user and stop rather than looping.

`send_later` is denied in `.claude/settings.json` as a backstop so this cannot happen silently
in an unattended run. If you hit that denial, it is working as intended — do not route around
it with `CronCreate`, `ScheduleWakeup`, a `/loop`, or a polling `Monitor`. Report to the user
and let them decide.

### Cost-aware model and context choices

The other large consumers in the same window were long sessions carrying very large contexts:

- A site rebuild on **Opus at `xhigh` effort** logged 41.4M cache-read tokens for 160K tokens
  of output.
- A ~19-hour, 702-turn session on **Opus with the 1M context window** ran overnight into the
  next evening.

Cache reads scale with context size times turn count, so a long session with a large context
is expensive on every turn regardless of how little it produces. For work in this repo:

- Prefer a fresh session over continuing a very long one. Context that is no longer relevant
  is still being re-read and paid for on every turn.
- Reserve `xhigh`/`max` effort and the 1M context window for work that actually needs them.
- Do not leave a session running unattended overnight to "keep an eye on" something.

### Scheduled Routines

Recurring Routines for this account are intentional and should be left alone unless the user
asks otherwise. Do not create new recurring Routines without the user explicitly requesting
one, and never create a recurring Routine as a substitute for a denied self-check-in.
