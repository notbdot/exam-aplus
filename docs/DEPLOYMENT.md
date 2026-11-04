# Deployment and data care

[Back to the project](../README.md) · [Content and rights](CONTENT.md)

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

Set `ORIGIN=https://your-exam-host.example` and keep the application port on loopback or a private Docker network behind your TLS proxy. Preserve the Host and Origin headers; proxy to container port 3000. HTTP is allowed only for loopback origins. HTTPS mode uses Secure, HttpOnly, SameSite=Strict cookies; POSTs require the exact configured Origin. No particular hostname, container network or external authentication service is required.

All login attempts are rate-limited by the direct connecting address, ignoring untrusted `X-Forwarded-For`. Behind a proxy this intentionally creates a shared ten-attempt/15-minute bucket. Keep the private single-user deployment small; do not expose a shared multi-user service. TLS/proxy configuration belongs to the operator. Never expose the Docker socket to the app.

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

