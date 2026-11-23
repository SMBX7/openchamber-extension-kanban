# Card attachments (photos and files) — branch feat/card-attachments

Delivery: ask-on-risk. Test runner: `node scripts/test-planka.mjs` (bundle per file) and `npm test` for the full suite.

## Specs

S1. A card read from Planka exposes its attachments: `attachments` (id, name, type, mime, size, isImage, url, thumbnailUrl, previewUrl, createdAt) and `coverAttachmentId` plus `cover` (the attachment object used as cover, or null).
S2. A file can be attached to a card from the panel: the file is uploaded to Planka as a `file` attachment (`POST /api/cards/:cardId/attachments`, multipart `type=file`, `name`, `file`). Photos are downscaled in the browser before upload; other files keep their bytes.
S3. An attachment can be deleted from the card and an image can be set or cleared as the card cover (`PATCH /api/cards/:id` with `coverAttachmentId`).
S4. The service proxies attachment bytes so the panel never talks to Planka directly: `GET /attachment?id=&size=360|720|full` returns `{ mime, data }` with the file in base64.
S5. The card editor shows an **Adjuntos** section: add button, thumbnails for images, file icon for other files, size, open/preview, delete, and set/clear cover. Uploads and deletes apply immediately, not with Confirmar.
S6. A board card shows its cover image as a thumbnail and, when it has more attachments, a paperclip with the count.
S7. The local board (no Planka) does not store attachments: the section explains it and hides the add button.
S8. Limits and messages: an upload over 12 MB fails with `El archivo supera los 12 MB.`; an empty file fails with `El archivo está vacío.`
S9. Docs: README explains attachments in the panel and the local-board limitation.

## Tasks

| ID | Specs | Route | Status |
| --- | --- | --- | --- |
| T1 | S1, S2, S3 | inline | done — scripts/test-planka.mjs |
| T2 | S4 | inline | done — scripts/test-planka.mjs + HTTP check |
| T3 | S5, S6, S8 | inline | done — panel build |
| T4 | S7, S9 | inline | done — READMEs |
| T5 | S1-S9 | inline | done — `npm test`, `npm run check` |

## Log

L1 (user): "poder añadir fotos y mas cosas a las tarjetas como planka"
L2 (decision): scope confirmed with the user — attachments only (photos and files), not comments or members. Local board keeps its JSON-only board and explains the limitation instead of storing binaries.
L3 (discovery): Planka's file routes (`/attachments/:id/download/...`) sit outside `/api` and ignore the Authorization header; they authenticate from the `accessToken` cookie. `readAttachmentFile` sends that cookie, which the end-to-end run against the real Planka confirmed.
L4 (evidence): E2E on the real Planka: create temp card, upload a PNG, read `thumbnailPath` (116 bytes), clear and set the cover, delete the attachment, delete the card. HTTP E2E on the built service: `POST /attachment` 200, `/snapshot` shows 1 attachment with cover, `GET /attachment?size=360` 200 image/png, clear cover, delete, empty upload 400 `El archivo está vacío.`. Temp cards removed; both boards end with 0 temporary cards and 0 attachments.
L5 (evidence): `npm test` → local 159, update safety 40, agent plugin 72, planka routes 24 assertions ok. `npm run check` → package ready.
L6 (limit): independent verifier unavailable in this runtime (`subagent` permission denied), so the review was done inline over the diff plus the two end-to-end runs above.
L7 (decision): local board keeps one JSON file; storing binaries there would break the export/recovery design, so the sheet explains the limitation and hides the upload button instead of accepting a file it cannot keep.
