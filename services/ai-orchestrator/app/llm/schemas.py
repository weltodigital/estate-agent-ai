"""Pydantic schemas for strict-JSON Claude outputs.

Floor plan parsing returns a `ParsedFloorPlan`. When the model's response fails
validation, retry once with a corrective system message; on second failure,
mark the job failed with the validation error string.
"""

from typing import Literal

from pydantic import BaseModel, Field


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


class ParsedFloorPlan(BaseModel):
    units: Literal["metres", "feet"]
    scale_metres_per_unit: float = Field(gt=0)
    rooms: list[ParsedRoom]
    openings: list[ParsedOpening]
