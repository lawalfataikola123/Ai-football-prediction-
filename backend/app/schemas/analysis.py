"""Pydantic schemas for AI-generated match analysis."""

from pydantic import BaseModel
from typing import List, Optional


class MatchAnalysis(BaseModel):
    """AI-generated natural language analysis for a match."""

    key_factors: List[str] = []
    match_insight: str = ""
    prediction_summary: str = ""
    betting_tip: Optional[str] = None
    is_ai_generated: bool = False
