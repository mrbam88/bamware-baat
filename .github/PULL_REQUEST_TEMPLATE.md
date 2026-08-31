## Story

<!-- Link the spec issue: Closes #NN. One line on what this delivers. -->

## Scope

<!-- What changed and why — files/areas, not a commit list. -->

## Out of scope

<!-- What you deliberately did not touch. -->

## Evidence

<!-- Quote the proof: test output, `tsc --noEmit`, screenshots, Maestro run.
     Claims without quoted evidence don't merge. -->

```
$ yarn test
```

## Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `yarn test` passes
- [ ] Styling uses theme tokens from `src/theme` (no inline hex/magic numbers)
- [ ] No secrets, credentials, or `.env` values in the diff
- [ ] No files outside the issue's scope
