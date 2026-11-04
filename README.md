# exam · A+ edition

A private, self-hosted A+ study companion with the **exam** identity. Two independent cores, objective notes, verified public lesson links, original retrieval checks, review reminders and safe scenario worksheets. Vanilla ES modules, Node 22, no runtime npm dependencies.

**Content pack:** CompTIA A+ V15, **220-1201 / 220-1202**. Both numbered objective outlines are represented (27 Core 1 and36 Core 2 objectives), using short original paraphrases linked to the official PDFs. This is an outline and study companion, not a substitute for all blueprint bullets or a full course. Verified 2026-11-04 against official objective PDFs revision 4.0 and current provider indexes; exact retirement date remains unverified. Recheck CompTIA before booking; use both exams from the same series.

## Quick start — Docker Compose

After the owner publishes the reviewed repository, clone its approved URL. Until then, extract the review archive into a new directory; do not point this edition at an existing exam/CCNA volume.

```sh
# Replace the placeholder with the repository URL approved for publication.
git clone <approved-repository-url> exam-aplus
cd exam-aplus
cp .env.example .env
docker compose up --build -d
docker compose ps
docker compose exec app node tools/setup-link.mjs
```

Open **http://localhost:3000** on the Docker host. The last command displays a **private, one-time setup URL** to the owner. Open that URL, set a password of 12–256 characters, and store it in your password manager. Do not paste the URL into tickets, logs, Git or chat. It expires after 30 minutes; rerun the command to renew it before enrollment. It refuses once an account exists. Tokens are generated securely; no default password exists.

One personal account per deployment. The displayed account name `study` is a password-manager label, not a configurable username. API authentication uses the password. There is no public registration. Login sessions are memory-only and require signing in again after restart; password and progress persist in the volume.

If you change the port, update **both** `EXAM_PORT` and `ORIGIN` in `.env`; for example port 3010 requires `ORIGIN=http://localhost:3010`. Use that exact hostname when opening the app. `localhost` and `127.0.0.1` are different origins. No trailing slash.

## Equivalent Docker run (no Compose required)

```sh
docker build -t exam-aplus:local .
docker volume create exam-aplus-data
docker run -d --name exam-aplus \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --mount type=volume,src=exam-aplus-data,dst=/data \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  --pids-limit 64 --memory 256m --cpus 1 \
  --log-opt max-size=10m --log-opt max-file=3 \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  -e ORIGIN=http://localhost:3000 exam-aplus:local
docker exec exam-aplus node tools/setup-link.mjs
```

The image runs as the `node` user (UID 1000). A fresh named volume inherits writable `/data` ownership; no host UID editing is needed for normal startup. Use a **named volume**, not an arbitrary empty root-owned bind directory. Only `/data` is writable; healthcheck `GET /healthz` contains no notes or credentials. Logs contain startup/request failure types, not passwords or progress bodies. Configure Docker log rotation for a long-running host.

## HTTPS / reverse proxy

Set `ORIGIN=https://your-exam-host.example` and keep the application port on loopback or a private Docker network behind your TLS proxy. Preserve the Host and Origin headers; proxy to container port 3000. HTTP is allowed only for loopback origins. HTTPS mode uses Secure, HttpOnly, SameSite=Strict cookies; POSTs require the exact configured Origin. No hardcoded host, Unraid network or external authentication service is required.

All login attempts are rate-limited by the direct connecting address, ignoring untrusted `X-Forwarded-For`. Behind a proxy this intentionally creates a shared ten-attempt/15-minute bucket. Keep the private single-user deployment small; do not expose a shared multi-user service. TLS/proxy configuration belongs to the operator. Never expose the Docker socket to the app.

## How to study

- **Today:** independent core context, last-opened context preserved per core, next unreviewed brief or open sample-check review. No completion ceremony or timer required.
- **Objectives:** complete numbered outline by domain with official exam weights, search/filter and visible practice gaps. Titles are original short paraphrases, not the full official wording.
- **Study:** original brief and recall prompt, per-objective notes, stable per-resource notes, public source links, optional material-coverage marks, optional authored checks, and guided scenario evidence.
- **Coverage** means you worked through a particular brief/material. It does not mean the objective is mastered. Material marks, sample results and self-reported practice are independent.
- **Retrieval:** choose before seeing the explanation. Each new visit starts unanswered. Only the latest submitted result per sample question is saved, with its content version; changing a checked answer removes stale feedback until checked again. Wrong or unsure results enter a deduplicated review list for 9am on the next local calendar day. A correct retry does not silently resolve an existing open reminder. Resolve/Reopen/Tomorrow are explicit controls, not adaptive pass predictions.
- **Scenario practice:** nine domain worksheets reused across relevant objectives, with prerequisites, safe steps and self-check rubrics. Practice can be tabletop; OS/hardware changes require permission and a disposable lab. Evidence/help level is self-reported, never automatically verified or an official PBQ replica.
- **Save/recovery:** notes save as typed. Retry handles transient errors. Revision conflicts block stale writes and offer the local draft download. Keep the tab open until saved or export the draft. Sign-out is blocked while unsaved changes remain.

Progress JSON and Markdown notes export are inside Study → General notes & export/import. JSON includes both cores and any current local edits; an unsaved draft is not proof the server stored it. Import validates the edition/schema, asks before replacing progress, and uses the current revision. Foreign CCNA or other-version files are rejected. Whole-volume backups are required for account recovery.

## Resources and private materials

**Included:** 136 objective-mapped public lesson links (62 non-introduction Core 1 lessons and74 Core 2 lessons), 63 original briefs, 18 original sample questions (two per each of nine domains; only selected objectives assessed) and nine domain-level scenario worksheets. Source metadata records mapping by provider course-index heading, not independent certification-completeness verification. No copied transcripts, paid notes, practice-exam PDFs, video files or exam dumps.

Professor Messer is the default instruction resource: [220-1201 course](https://www.professormesser.com/free-a-plus-training/220-1201/220-1201-video/220-1201-training-course/) and [220-1202 course](https://www.professormesser.com/free-a-plus-training/220-1202/220-1202-video/220-1202-training-course/). Videos open externally; embedding permission and offline video access are not promised. The supplied Core 1 playlist was verified by the Researcher as matching this series. Exact paid/private materials have not been provided, imported or licensed for redistribution.

`web/resources.json` is a replaceable JSON link pack. Every resource has stable `id`, `title`, `provider`, `url`, `core`, `objectives`, `access` (`free`, `paid / own license` or `private / own license`) and optional factual metadata. URLs must be HTTPS or the protected private-file route. Map only verified matching-version material. Preserve stable IDs when reordering. Additional links work without a state reset; trackable material IDs must also be declared on that objective in `catalog.json` so validation cannot silently accept foreign progress. New pack/schema versions need an explicit migration; never remap saved IDs to different topics.

To customize, make an untracked local copy of resources.json and mount it read-only at `/app/web/resources.json`. Do not include credential-bearing URL parameters. Paid purchase links do not grant access to their contents. If a user owns a lawful personal copy of a PDF/text/Markdown file, optionally mount their **private** directory read-only at `/materials`, set `MATERIALS_DIR=/materials`, and link `/private/owned-notes.pdf` in their private resource config. Filenames accept letters, digits, underscore and hyphen only. Download requires sign-in and is attachment-only. Symlinks escaping the mount are refused. Keep this directory and config out of Git/images; only the owner can establish their rights. No uploads or automatic material ingestion are implemented.

See [content and rights](docs/CONTENT.md) for provenance and remaining source limits.

## Backup, restore, update and rollback

Single process and **one writer per data volume**. JSON writes use an atomic rename; revision conflicts protect concurrent tabs. Do not run two app containers against one volume.

Consistent Compose backup, stored privately on the operator’s machine:

```sh
mkdir -p backups
chmod 700 backups
backup="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$backup"
chmod 700 "$backup"
docker compose stop app
docker cp "$(docker compose ps -aq app)":/data/. "$backup/"
docker compose start app
```

Back up the **entire** directory, including auth.json. It contains password hashes and private notes; encrypt storage and restrict permissions. A browser export is not a full account backup. Record image digest, schema/edition, progress revision and hashes privately alongside it. Do not print account contents.

Restore/rehearse into a **new** volume and separate loopback port, keeping the current deployment intact:

```sh
docker volume create exam-aplus-restore
docker create --name exam-aplus-restore \
  -p 127.0.0.1:3010:3000 \
  --mount type=volume,src=exam-aplus-restore,dst=/data \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  -e ORIGIN=http://localhost:3010 exam-aplus:local
docker cp "$backup/." exam-aplus-restore:/data
docker run --rm --network none --user 0 \
  --mount type=volume,src=exam-aplus-restore,dst=/data \
  exam-aplus:local chown -R node:node /data
docker start exam-aplus-restore
```

The short root maintenance container fixes restored-file ownership **only in the new volume**; normal app runtime stays non-root. Open localhost:3010, sign in with the backed-up password, compare notes/material marks/reviews, and verify health before any cutover. Do not overwrite the only current volume while testing a restore.

For updates, tag releases immutably, back up first, build and rehearse on the restored copy, and retain the previous image digest. Then replace the app container with the new image using the **existing current** volume and the same origin. Normal presentation rollback uses the previous compatible image with current progress; do not restore older progress over newer edits. An incompatible schema requires a separately reviewed migration/restore with an explicit data-loss decision. Never use `docker compose down -v` as an update step.

## Verify / develop

```sh
node --test tests/*.test.mjs
# Same command via npm, where npm is installed:
npm test
docker build -t exam-aplus:test .
node tools/docker-smoke.mjs exam-aplus:test
```

The Docker lifecycle test creates uniquely named **disposable** containers/volumes, enrolls a synthetic account without logging credentials, saves both cores and review data, restarts/relogs, backs up and restores into another volume, compares auth/progress bytes and cleans its own test resources. Never point it at a live volume. GitHub Actions runs Node tests, Compose configuration validation, Docker build and this smoke test on pushes/PRs. No registry publication is configured.

Tests use Node 22+. No npm package installation is required. `PORT=3000 DATA_DIR=./data ORIGIN=http://localhost:3000 node server.mjs` runs locally; retrieve/renew setup via `DATA_DIR=./data ORIGIN=http://localhost:3000 node tools/setup-link.mjs`.

## Limits / publication

One user, one instance; no account sync, password-reset email, proctoring, full mock exam or auto-grading of hands-on work. No official scaled-score conversion or pass probability. Most objectives have no authored MCQ; the gap is shown. Some scenario worksheets intentionally repeat at domain level. Browser validation uses Chromium emulation, not physical-device or screen-reader certification. Exact V15 retirement and newest objective revision need a fresh successful CompTIA check before booking.

This repository is prepared locally. A GitHub owner/name, visibility, licensing review and publication approval are still required before push; no hosted friend deployment has occurred. Brand/code/original content are MIT; fonts keep their included licenses. CompTIA/Professor Messer marks identify third-party resources and do not imply endorsement.
