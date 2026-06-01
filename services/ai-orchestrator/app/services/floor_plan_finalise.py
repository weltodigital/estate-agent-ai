"""Floor-plan finalisation: branded SVG + PNG + PDF.

Takes a parsed/edited plan and the agency's branding, renders a single
branded SVG, then converts that SVG to PNG and PDF via svglib + reportlab.
Uploads all three to R2 and returns the URLs.

Synchronous (the API caller waits) — output is short enough.
"""

from __future__ import annotations

import base64
import io
import uuid
from typing import Any, Literal, cast

import httpx
from pydantic import BaseModel, Field
from reportlab.graphics import renderPDF, renderPM
from svglib.svglib import svg2rlg

from app.integrations.r2 import put_object


class Branding(BaseModel):
    agency_name: str
    logo_url: str | None = None
    brand_colour_primary: str | None = None
    brand_colour_secondary: str | None = None
    template: Literal["minimal", "classic", "bold"] = "minimal"


class ParsedRoom(BaseModel):
    id: str
    label: str
    type: str
    polygon: list[tuple[float, float]] = Field(min_length=3)
    area_sqm: float | None = None


class ParsedOpening(BaseModel):
    id: str
    kind: Literal["door", "window"]
    segment: tuple[tuple[float, float], tuple[float, float]]


class FinalisePlan(BaseModel):
    units: Literal["metres", "feet"]
    scale_metres_per_unit: float = Field(gt=0)
    rooms: list[ParsedRoom]
    openings: list[ParsedOpening]


class FinaliseRequest(BaseModel):
    floor_plan_id: str
    floor_label: str
    plan: FinalisePlan
    branding: Branding


class FinaliseResponse(BaseModel):
    output_svg_url: str
    output_png_url: str | None
    output_pdf_url: str | None
    total_area_sqm: float


def _centroid(polygon: list[tuple[float, float]]) -> tuple[float, float]:
    n = len(polygon)
    return (sum(p[0] for p in polygon) / n, sum(p[1] for p in polygon) / n)


def _shoelace_area(
    polygon: list[tuple[float, float]],
    scale: float,
) -> float:
    n = len(polygon)
    s = 0.0
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) * 0.5 * (scale * scale)


async def _fetch_logo_data_url(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/png").split(";", 1)[0]
            return f"data:{content_type};base64,{base64.b64encode(resp.content).decode()}"
    except Exception:
        return None


async def _build_branded_svg(
    plan: FinalisePlan,
    branding: Branding,
    floor_label: str,
) -> tuple[str, float]:
    if not plan.rooms:
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"/>', 0.0)

    primary = branding.brand_colour_primary or "#0f172a"
    secondary = branding.brand_colour_secondary or "#e2e8f0"

    xs = [p[0] for r in plan.rooms for p in r.polygon] + [
        c for o in plan.openings for c in (o.segment[0][0], o.segment[1][0])
    ]
    ys = [p[1] for r in plan.rooms for p in r.polygon] + [
        c for o in plan.openings for c in (o.segment[0][1], o.segment[1][1])
    ]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad = max((max_x - min_x), (max_y - min_y)) * 0.08 or 1
    plan_w = (max_x - min_x) + 2 * pad
    plan_h = (max_y - min_y) + 2 * pad
    header_h = plan_h * 0.10
    footer_h = plan_h * 0.06
    total_h = plan_h + header_h + footer_h
    view_box = f"{min_x - pad:.2f} {min_y - pad - header_h:.2f} {plan_w:.2f} {total_h:.2f}"

    style = (
        "<style>"
        f".header {{ fill: {primary}; }}"
        f".header-text {{ fill: white; font-size: {header_h * 0.35:.2f}px; }}"
        f".room {{ fill: {secondary}; stroke: {primary}; stroke-width: 0.5; }}"
        f".label {{ fill: {primary}; font-size: 3.5px; text-anchor: middle; }}"
        ".area { fill: #475569; font-size: 2.5px; text-anchor: middle; }"
        f".door {{ stroke: {primary}; stroke-width: 0.8; fill: none; }}"
        f".window {{ stroke: {primary}; stroke-width: 0.8; "
        'stroke-dasharray: 1.5 1; fill: none; }'
        f".footer-text {{ fill: {primary}; font-size: {footer_h * 0.5:.2f}px; }}"
        "</style>"
    )

    parts: list[str] = [
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{view_box}" font-family="sans-serif">',
        style,
    ]

    # Header band with agency name + (optional) logo.
    header_y = min_y - pad - header_h
    parts.append(
        f'<rect class="header" x="{min_x - pad:.2f}" y="{header_y:.2f}" '
        f'width="{plan_w:.2f}" height="{header_h:.2f}"/>'
    )
    logo_data_url = await _fetch_logo_data_url(branding.logo_url) if branding.logo_url else None
    logo_size = header_h * 0.7
    text_x = min_x - pad + (logo_size + 2 if logo_data_url else 2)
    if logo_data_url:
        parts.append(
            f'<image href="{logo_data_url}" x="{min_x - pad + 1:.2f}" '
            f'y="{header_y + (header_h - logo_size) / 2:.2f}" '
            f'width="{logo_size:.2f}" height="{logo_size:.2f}"/>'
        )
    parts.append(
        f'<text class="header-text" x="{text_x:.2f}" '
        f'y="{header_y + header_h * 0.65:.2f}">'
        f"{_xml_escape(branding.agency_name)} · {_xml_escape(floor_label)}"
        f"</text>"
    )

    # Rooms.
    total_area = 0.0
    for room in plan.rooms:
        polygon = cast(list[tuple[float, float]], [tuple(p) for p in room.polygon])
        points = " ".join(f"{x:.2f},{y:.2f}" for x, y in polygon)
        area = (
            float(room.area_sqm)
            if room.area_sqm is not None
            else _shoelace_area(polygon, plan.scale_metres_per_unit)
        )
        total_area += area
        cx, cy = _centroid(polygon)
        parts.append(f'<polygon class="room" points="{points}"/>')
        parts.append(
            f'<text class="label" x="{cx:.2f}" y="{cy:.2f}">'
            f"{_xml_escape(room.label)}</text>"
        )
        parts.append(
            f'<text class="area" x="{cx:.2f}" y="{cy + 3.5:.2f}">{area:.1f} m²</text>'
        )

    # Openings.
    for opening in plan.openings:
        (x1, y1), (x2, y2) = opening.segment
        cls = "door" if opening.kind == "door" else "window"
        parts.append(
            f'<line class="{cls}" x1="{x1:.2f}" y1="{y1:.2f}" '
            f'x2="{x2:.2f}" y2="{y2:.2f}"/>'
        )

    # Footer with total area.
    footer_y = max_y + pad
    parts.append(
        f'<text class="footer-text" x="{min_x - pad + 1:.2f}" '
        f'y="{footer_y + footer_h * 0.65:.2f}">'
        f"Total area {total_area:.1f} m²"
        f"</text>"
    )

    parts.append("</svg>")
    return "\n".join(parts), total_area


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _render_png_pdf(svg_text: str) -> tuple[bytes | None, bytes | None]:
    """Best-effort PNG + PDF render via svglib + reportlab. Returns (None,
    None) for either output that fails — finalise still succeeds with the
    branded SVG even if rasterisation breaks."""
    png: bytes | None = None
    pdf: bytes | None = None
    try:
        drawing = svg2rlg(io.StringIO(svg_text))
        if drawing is not None:
            try:
                png = renderPM.drawToString(drawing, fmt="PNG")
            except Exception:
                png = None
            try:
                pdf = renderPDF.drawToString(drawing)
            except Exception:
                pdf = None
    except Exception:
        return None, None
    return png, pdf


def _key(floor_plan_id: str, ext: str) -> str:
    return f"floor-plans/{floor_plan_id}/finalised-{uuid.uuid4().hex}.{ext}"


async def run_finalise(request: FinaliseRequest) -> FinaliseResponse:
    svg_text, total_area = await _build_branded_svg(
        request.plan,
        request.branding,
        request.floor_label,
    )
    svg_bytes = svg_text.encode("utf-8")
    svg_url = put_object(
        _key(request.floor_plan_id, "svg"),
        svg_bytes,
        content_type="image/svg+xml",
    )

    png_bytes, pdf_bytes = _render_png_pdf(svg_text)
    png_url = (
        put_object(_key(request.floor_plan_id, "png"), png_bytes, content_type="image/png")
        if png_bytes
        else None
    )
    pdf_url = (
        put_object(_key(request.floor_plan_id, "pdf"), pdf_bytes, content_type="application/pdf")
        if pdf_bytes
        else None
    )

    return FinaliseResponse(
        output_svg_url=svg_url,
        output_png_url=png_url,
        output_pdf_url=pdf_url,
        total_area_sqm=total_area,
    )


def to_jsonable(response: FinaliseResponse) -> dict[str, Any]:
    return {
        "output_svg_url": response.output_svg_url,
        "output_png_url": response.output_png_url,
        "output_pdf_url": response.output_pdf_url,
        "total_area_sqm": response.total_area_sqm,
    }
