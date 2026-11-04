# Resources and private materials

[Back to the project](../README.md)

**Included:** 136 objective-mapped public lesson links (62 non-introduction Core 1 lessons and 74 Core 2 lessons), 63 original briefs, 18 original sample questions (two per each of nine domains; only selected objectives assessed) and nine domain-level scenario worksheets. Source metadata records mapping by provider course-index heading, not independent certification-completeness verification. No copied transcripts, paid notes, practice-exam PDFs, video files or exam dumps.

Professor Messer is the default instruction resource: [220-1201 course](https://www.professormesser.com/free-a-plus-training/220-1201/220-1201-video/220-1201-training-course/) and [220-1202 course](https://www.professormesser.com/free-a-plus-training/220-1202/220-1202-video/220-1202-training-course/). Videos open externally; embedding permission and offline video access are not promised. The supplied Core 1 playlist was checked against the course index and matches this series. Exact paid/private materials have not been provided, imported or licensed for redistribution.

`web/resources.json` is a replaceable JSON link pack. Every resource has stable `id`, `title`, `provider`, `url`, `core`, `objectives`, `access` (`free`, `paid / own license` or `private / own license`) and optional factual metadata. URLs must be HTTPS or the protected private-file route. Map only verified matching-version material. Preserve stable IDs when reordering. Additional links work without a state reset; trackable material IDs must also be declared on that objective in `catalog.json` so validation cannot silently accept foreign progress. New pack/schema versions need an explicit migration; never remap saved IDs to different topics.

To customize, make an untracked local copy of resources.json and mount it read-only at `/app/web/resources.json`. Do not include credential-bearing URL parameters. Paid purchase links do not grant access to their contents. If a user owns a lawful personal copy of a PDF/text/Markdown file, optionally mount their **private** directory read-only at `/materials`, set `MATERIALS_DIR=/materials`, and link `/private/owned-notes.pdf` in their private resource config. Filenames accept letters, digits, underscore and hyphen only. Download requires sign-in and is attachment-only. Symlinks escaping the mount are refused. Keep this directory and config out of Git/images; only the owner can establish their rights. No uploads or automatic material ingestion are implemented.

See [content and rights](CONTENT.md) for provenance and remaining source limits.

