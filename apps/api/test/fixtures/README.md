# Fixtures

Drop real property photos here while iterating on the staging + enhancement
pipelines. The orchestrator can be pointed at any public URL, so for end-to-
end testing you can:

1. Upload a fixture to your local R2 bucket under `fixtures/<name>.jpg`.
2. Insert a fake `property_photos` row pointing at the public URL.
3. Trigger staging via the UI or:

```bash
curl -X POST \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{"style":"modern","variations":3}' \
  http://localhost:3001/v1/photos/<photo-id>/stage
```

The orchestrator pulls the image, renders three PIL variations, uploads them,
and POSTs back. Replace `_render_variation` in
`services/ai-orchestrator/app/services/staging.py` with the real Replicate
inpainting call when ready.

**Don't commit large binary fixtures to git** — keep them local or in a
private bucket. This directory is intentionally empty.
