"""Floor-plan parsing pipeline.

Sketch → Claude Vision (strict JSON) → Pydantic validation → SVG render →
R2 upload → HMAC callback.

Per CLAUDE.md:
  - All Claude calls go through app.llm.claude.
  - Model string from env (CLAUDE_VISION_MODEL).
  - Validate the response with Pydantic. On validation failure, retry once
    with a corrective system message; on second failure, callback failed.
"""

from __future__ import annotations

import json
import uuid
from typing import Any, cast

import httpx
from pydantic import ValidationError

from app.config import get_settings
from app.integrations.hmac_sign import sign
from app.integrations.r2 import put_object
from app.llm.claude import get_client
from app.llm.schemas import ParsedFloorPlan, ParsedOpening, ParsedRoom

SYSTEM_PROMPT_BASE = (
    "You convert hand-drawn floor-plan sketches into structured JSON.\n\n"
    "Output strict JSON only. No prose, no markdown, no code fences.\n\n"
    "Schema:\n"
    "{\n"
    '  "units": "metres" | "feet",\n'
    '  "scale_metres_per_unit": number > 0,\n'
    '  "rooms": [\n'
    "    {\n"
    '      "id": "string (unique within plan)",\n'
    '      "label": "string (room name as drawn)",\n'
    '      "type": "string (e.g. kitchen, bedroom, bathroom, hall, reception)",\n'
    '      "polygon": [[x, y], [x, y], ...],\n'
    '      "area_sqm": number (optional)\n'
    "    }\n"
    "  ],\n"
    '  "openings": [\n'
    "    {\n"
    '      "id": "string (unique)",\n'
    '      "kind": "door" | "window",\n'
    '      "segment": [[x1, y1], [x2, y2]]\n'
    "    }\n"
    "  ]\n"
    "}\n\n"
    "Rules:\n"
    "- Use a single coordinate system. Image origin top-left; x grows right, y grows down.\n"
    "- Units may be pixels. Set scale_metres_per_unit to the real-world metres per unit\n"
    "  (e.g. 0.05 if 1 unit = 5cm).\n"
    "- Polygons need at least 3 vertices, in clockwise or anticlockwise order. Do not\n"
    "  repeat the first vertex at the end — the shape is implicitly closed.\n"
    "- Openings must lie ON a room edge. A door is encoded once, on the room you exit\n"
    "  from.\n"
    "- If the sketch shows a dimension (e.g. '4.2m') use it to calibrate. Otherwise\n"
    "  estimate from typical UK room proportions and pick a single sensible scale.\n"
    "- Do NOT invent rooms or dimensions that are not on the page.\n"
    "- If unsure whether something is a door or a window, prefer door."
)

CORRECTIVE_PREAMBLE = (
    "Your previous response did not match the required JSON schema.\n"
    "Read the schema and the previous response, then produce a corrected response\n"
    "that validates.\n\n"
    "Validation errors:\n"
    "{errors}\n\n"
    "Output strict JSON only.\n\n"
)


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


def _polygon_centroid(polygon: list[tuple[float, float]]) -> tuple[float, float]:
    n = len(polygon)
    cx = sum(p[0] for p in polygon) / n
    cy = sum(p[1] for p in polygon) / n
    return cx, cy


def _polygon_area_sqm(polygon: list[tuple[float, float]], scale: float) -> float:
    # Shoelace formula in image units, then scaled.
    n = len(polygon)
    s = 0.0
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) * 0.5 * (scale * scale)


def _render_svg(plan: ParsedFloorPlan) -> tuple[str, float]:
    """Renders the parsed plan into a self-contained SVG string and returns
    the SVG + total area (m²)."""
    if not plan.rooms:
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>', 0.0)

    xs = [p[0] for r in plan.rooms for p in r.polygon] + [
        c for o in plan.openings for c in (o.segment[0][0], o.segment[1][0])
    ]
    ys = [p[1] for r in plan.rooms for p in r.polygon] + [
        c for o in plan.openings for c in (o.segment[0][1], o.segment[1][1])
    ]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad = max((max_x - min_x), (max_y - min_y)) * 0.05 or 1
    vb = (
        min_x - pad,
        min_y - pad,
        (max_x - min_x) + 2 * pad,
        (max_y - min_y) + 2 * pad,
    )

    total_area = 0.0
    view_box = f"{vb[0]:.2f} {vb[1]:.2f} {vb[2]:.2f} {vb[3]:.2f}"
    style = (
        "<style>"
        ".room { fill: #f8fafc; stroke: #0f172a; stroke-width: 0.5; }"
        ".label { fill: #0f172a; font-size: 3.5px; text-anchor: middle; }"
        ".area { fill: #475569; font-size: 2.5px; text-anchor: middle; }"
        ".door { stroke: #2563eb; stroke-width: 0.8; fill: none; }"
        ".window { stroke: #16a34a; stroke-width: 0.8; stroke-dasharray: 1.5 1; fill: none; }"
        "</style>"
    )
    parts: list[str] = [
        (
            '<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{view_box}" font-family="sans-serif">'
        ),
        style,
    ]

    for room in plan.rooms:
        polygon = [tuple(p) for p in room.polygon]
        polygon_typed = cast(list[tuple[float, float]], polygon)
        points = " ".join(f"{x:.2f},{y:.2f}" for x, y in polygon)
        area = (
            float(room.area_sqm)
            if room.area_sqm is not None
            else _polygon_area_sqm(polygon_typed, plan.scale_metres_per_unit)
        )
        total_area += area
        cx, cy = _polygon_centroid(polygon_typed)
        parts.append(f'<polygon class="room" points="{points}"/>')
        parts.append(f'<text class="label" x="{cx:.2f}" y="{cy:.2f}">{room.label}</text>')
        parts.append(
            f'<text class="area" x="{cx:.2f}" y="{cy + 3.5:.2f}">{area:.1f} m²</text>'
        )

    for opening in plan.openings:
        (x1, y1), (x2, y2) = opening.segment
        cls = "door" if opening.kind == "door" else "window"
        parts.append(
            f'<line class="{cls}" x1="{x1:.2f}" y1="{y1:.2f}" '
            f'x2="{x2:.2f}" y2="{y2:.2f}"/>'
        )

    parts.append("</svg>")
    return "\n".join(parts), total_area


def _strip_to_json(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return text
    return text[start : end + 1]


async def _call_claude_vision(sketch_url: str, errors: str | None = None) -> str:
    settings = get_settings()
    client = get_client()
    system = SYSTEM_PROMPT_BASE
    if errors:
        system = CORRECTIVE_PREAMBLE.format(errors=errors) + SYSTEM_PROMPT_BASE

    message = await client.messages.create(
        model=settings.claude_vision_model,
        max_tokens=2048,
        system=system,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "url", "url": sketch_url}},
                    {"type": "text", "text": "Parse this floor plan into the required JSON."},
                ],
            }
        ],
    )
    text_parts = [
        b.text for b in message.content if getattr(b, "type", None) == "text"  # type: ignore[union-attr]
    ]
    return "\n".join(text_parts)


async def _parse_or_raise(sketch_url: str) -> ParsedFloorPlan:
    raw = await _call_claude_vision(sketch_url)
    try:
        data = json.loads(_strip_to_json(raw))
        return ParsedFloorPlan.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as first_err:
        # One corrective retry, as specified in services/ai-orchestrator/CLAUDE.md.
        retry = await _call_claude_vision(sketch_url, errors=str(first_err))
        try:
            data = json.loads(_strip_to_json(retry))
            return ParsedFloorPlan.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as second_err:
            raise ValueError(
                f"Vision response did not validate after retry: {second_err}"
            ) from second_err


def _key(floor_plan_id: str) -> str:
    return f"floor-plans/{floor_plan_id}/render-{uuid.uuid4().hex}.svg"


async def _post_callback(callback_url: str, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = {
        "content-type": "application/json",
        "x-orchestrator-signature": sign(body),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        await client.post(callback_url, content=body, headers=headers)


async def run_parse_job(
    *,
    floor_plan_id: str,
    agency_id: str,
    sketch_url: str,
    callback_url: str,
) -> None:
    """Background-task entry point. Parses the sketch via Claude Vision,
    validates with Pydantic (one corrective retry), renders an SVG, uploads
    it, and POSTs the callback."""
    try:
        plan = await _parse_or_raise(sketch_url)
        svg, total_area = _render_svg(plan)
        output_url = put_object(
            _key(floor_plan_id),
            svg.encode("utf-8"),
            content_type="image/svg+xml",
        )

        await _post_callback(
            callback_url,
            {
                "floor_plan_id": floor_plan_id,
                "agency_id": agency_id,
                "status": "parsed",
                "parsed_json": _plan_to_json(plan),
                "output_svg_url": output_url,
                "total_area_sqm": total_area,
            },
        )
    except Exception as exc:
        await _post_callback(
            callback_url,
            {
                "floor_plan_id": floor_plan_id,
                "agency_id": agency_id,
                "status": "failed",
                "parse_error": str(exc),
            },
        )


def _plan_to_json(plan: ParsedFloorPlan) -> dict[str, Any]:
    return {
        "units": plan.units,
        "scale_metres_per_unit": plan.scale_metres_per_unit,
        "rooms": [_room_to_json(r) for r in plan.rooms],
        "openings": [_opening_to_json(o) for o in plan.openings],
    }


def _room_to_json(room: ParsedRoom) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": room.id,
        "label": room.label,
        "type": room.type,
        "polygon": [[p[0], p[1]] for p in room.polygon],
    }
    if room.area_sqm is not None:
        out["area_sqm"] = room.area_sqm
    return out


def _opening_to_json(opening: ParsedOpening) -> dict[str, Any]:
    (x1, y1), (x2, y2) = opening.segment
    return {
        "id": opening.id,
        "kind": opening.kind,
        "segment": [[x1, y1], [x2, y2]],
    }
