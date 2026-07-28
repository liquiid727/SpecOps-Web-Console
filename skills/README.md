# Skills

Repository-local reusable agent skills and capability notes belong here.

## Developer Skills

`developer/` contains the shared, developer-oriented skills copied from the
user-level `~/.codex/skills/` collection. Keep each skill self-contained under
`developer/<skill-name>/` with its own `SKILL.md` and bundled resources.

- These are project assets and may be reviewed, versioned, and adapted with the repository.
- Codex system skills from `~/.codex/skills/.system/` are intentionally excluded.
- Imported skills use Codex-compatible frontmatter; runtime-specific metadata is removed from the project copy.
- See [`developer/README.md`](developer/README.md) for the current catalog.
- A role must explicitly reference `skills/developer/<skill-name>/SKILL.md` in
  `.agents/manifest.yaml` before the project router loads that skill.

## Content Creator Skills

`content-creator/` contains reusable skills for self-media creators and other
content-production roles. These skills are kept separate from developer skills
because their primary workflows produce articles, audio, video, presentations,
or publishing assets rather than software delivery artifacts.

- See [`content-creator/README.md`](content-creator/README.md) for the current catalog.
- Reference a skill as `skills/content-creator/<skill-name>/SKILL.md` when assigning it to a role.

## Codex Customization Skills

`codex-customization/` contains skills whose primary output customizes Codex
itself, including visual identities, pets, and runtime experience assets.

- See [`codex-customization/README.md`](codex-customization/README.md) for the current catalog.
- Reference a skill as `skills/codex-customization/<skill-name>/SKILL.md` when assigning it to a role.

## Education Skills

`education/` contains reusable teaching, learning, and knowledge-training
skills whose primary output is a learning process or educational material.

- See [`education/README.md`](education/README.md) for the current catalog.
- Reference a skill as `skills/education/<skill-name>/SKILL.md` when assigning it to a role.

## External Skill References

These are bookmarked external skills. Keep them here for discovery and later review; install into `~/.codex/skills/` only when they need to be available to Codex as active skills.

### PPT / Presentation

- [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)
  - Use: HTML PPT and magazine-style presentation generation.
  - Status: bookmarked, not installed.

### IP / Patent

- [patent-disclosure-skill](https://github.com/handsomestWei/patent-disclosure-skill)
  - Use: Chinese patent technical disclosure drafts, patent-point mining, CNIPA novelty search, desensitized writing, and self-check workflow.
  - Status: bookmarked, not installed.

### IP / Software Copyright

- [SoftwareCopyright-Skill](https://github.com/Fokkyp/SoftwareCopyright-Skill)
  - Use: Chinese software copyright application material generation from a local project.
  - Status: bookmarked, not installed.

## Notes

- Keep external candidates in this README when the goal is collection and later lookup.
- Move adapted, repository-specific skills into `skills/developer/`.
- Install frequently used user-level skills into `~/.codex/skills/` and restart Codex to load them.
- Related note: [External Skill Bookmarks](/Users/liquiid/code/specos-ai/draft/blog/2026-05-12-external-skill-bookmarks.md).
