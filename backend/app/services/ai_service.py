"""AI-powered natural language match analysis service."""

import logging
from typing import Optional
from datetime import datetime

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()


async def generate_match_analysis(
    home_team: str,
    away_team: str,
    competition: str,
    match_date: str,
    home_form: str,
    away_form: str,
    home_position: Optional[int],
    away_position: Optional[int],
    home_goals_scored: int,
    home_goals_conceded: int,
    away_goals_scored: int,
    away_goals_conceded: int,
    h2h_home_wins: int,
    h2h_draws: int,
    h2h_away_wins: int,
    prob_home_win: float,
    prob_draw: float,
    prob_away_win: float,
    confidence: int,
    predicted_home_score: int,
    predicted_away_score: int,
    prob_btss_yes: float,
    prob_over_25: float,
) -> dict:
    """Generate natural language analysis for a match using the configured AI provider.

    Falls back to a template-based analysis if no API key is configured or the call fails.
    """
    if not settings.AI_API_KEY:
        return _fallback_analysis(
            home_team, away_team, confidence,
            prob_home_win, prob_draw, prob_away_win,
            predicted_home_score, predicted_away_score,
        )

    prompt = _build_prompt(
        home_team, away_team, competition, match_date,
        home_form, away_form,
        home_position, away_position,
        home_goals_scored, home_goals_conceded,
        away_goals_scored, away_goals_conceded,
        h2h_home_wins, h2h_draws, h2h_away_wins,
        prob_home_win, prob_draw, prob_away_win,
        confidence, predicted_home_score, predicted_away_score,
        prob_btss_yes, prob_over_25,
    )

    try:
        result = await _call_ai_provider(prompt)
        if result:
            return result
    except Exception as e:
        logger.warning(f"AI analysis failed: {e}, using fallback")

    return _fallback_analysis(
        home_team, away_team, confidence,
        prob_home_win, prob_draw, prob_away_win,
        predicted_home_score, predicted_away_score,
    )


def _build_prompt(
    home_team: str, away_team: str, competition: str, match_date: str,
    home_form: str, away_form: str,
    home_position: Optional[int], away_position: Optional[int],
    home_goals_scored: int, home_goals_conceded: int,
    away_goals_scored: int, away_goals_conceded: int,
    h2h_home_wins: int, h2h_draws: int, h2h_away_wins: int,
    prob_home_win: float, prob_draw: float, prob_away_win: float,
    confidence: int, predicted_home_score: int, predicted_away_score: int,
    prob_btts_yes: float, prob_over_25: float,
) -> str:
    return f"""You are a football (soccer) analyst. Analyze this match and return insights in JSON format.

Match: {home_team} vs {away_team}
Competition: {competition}
Date: {match_date}

TEAM FORM & STATS
{home_team}: Last 10 form ({home_form}), Position: {home_position or 'N/A'}, Goals scored: {home_goals_scored}, Goals conceded: {home_goals_conceded}
{away_team}: Last 10 form ({away_form}), Position: {away_position or 'N/A'}, Goals scored: {away_goals_scored}, Goals conceded: {away_goals_conceded}

HEAD TO HEAD
Home wins: {h2h_home_wins}, Draws: {h2h_draws}, Away wins: {h2h_away_wins}

ML PREDICTION
Result probabilities: {home_team} {prob_home_win:.0%} | Draw {prob_draw:.0%} | {away_team} {prob_away_win:.0%}
Predicted score: {predicted_home_score}-{predicted_away_score}
Confidence: {confidence}%
BTTS Yes: {prob_btts_yes:.0%}
Over 2.5: {prob_over_25:.0%}

Return ONLY valid JSON without markdown formatting:
{{
  "key_factors": ["factor 1", "factor 2", "factor 3"],
  "match_insight": "2-3 sentence analysis explaining the predicted outcome, key tactical matchups, and what to watch for.",
  "prediction_summary": "One sentence summary of the prediction.",
  "betting_tip": "Optional brief betting insight (if applicable)"
}}"""


async def _call_ai_provider(prompt: str) -> Optional[dict]:
    """Call the configured AI provider's chat completion API."""
    import httpx
    import json

    base_url = settings.AI_BASE_URL
    if not base_url:
        if settings.AI_PROVIDER == "openai":
            base_url = "https://api.openai.com/v1"
        elif settings.AI_PROVIDER == "openrouter":
            base_url = "https://openrouter.ai/api/v1"
        elif settings.AI_PROVIDER == "gemini":
            base_url = "https://generativelanguage.googleapis.com/v1beta"
        elif settings.AI_PROVIDER == "ollama":
            base_url = "http://localhost:11434"
        else:
            base_url = "https://api.openai.com/v1"

    headers = {
        "Content-Type": "application/json",
    }

    if settings.AI_PROVIDER == "gemini":
        # Gemini uses a different API format
        url = f"{base_url}/models/{settings.AI_MODEL}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": settings.AI_TEMPERATURE,
                "maxOutputTokens": settings.AI_MAX_TOKENS,
            },
        }
        if settings.AI_API_KEY:
            url = f"{url}?key={settings.AI_API_KEY}"
    elif settings.AI_PROVIDER == "ollama":
        url = f"{base_url}/api/chat"
        payload = {
            "model": settings.AI_MODEL or "llama3.2",
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }
    else:
        # OpenAI-compatible (OpenAI, OpenRouter, etc.)
        url = f"{base_url}/chat/completions"
        headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"
        payload = {
            "model": settings.AI_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": settings.AI_MAX_TOKENS,
            "temperature": settings.AI_TEMPERATURE,
        }
        if settings.AI_PROVIDER == "openrouter":
            headers["HTTP-Referer"] = "https://github.com/football-predictions"
            headers["X-Title"] = "Football Predictions AI"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    # Parse response based on provider
    if settings.AI_PROVIDER == "gemini":
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    elif settings.AI_PROVIDER == "ollama":
        text = data.get("message", {}).get("content", "")
    else:
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Extract JSON from response
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    return json.loads(text)


def _fallback_analysis(
    home_team: str, away_team: str, confidence: int,
    prob_home: float, prob_draw: float, prob_away: float,
    pred_home: int, pred_away: int,
) -> dict:
    """Generate a template-based analysis when no AI provider is configured."""
    if prob_home > prob_draw and prob_home > prob_away:
        verdict = f"{home_team} win"
        favored = home_team
    elif prob_away > prob_home and prob_away > prob_draw:
        verdict = f"{away_team} win"
        favored = away_team
    else:
        verdict = "Draw"

    factors = [
        f"{favored if prob_home > prob_away else away_team if prob_away > prob_home else 'Neither'} have shown better recent form",
        f"Historical data favors {'home' if prob_home > prob_away else 'away'} side",
        f"Goal-scoring trends suggest {'over' if prob_home + prob_away > 0.6 else 'under'} 2.5 goals",
    ]

    return {
        "key_factors": factors,
        "match_insight": (
            f"Our model predicts a {verdict} with {confidence}% confidence. "
            f"The expected scoreline is {pred_home}-{pred_away}. "
            f"{home_team} have a {prob_home:.0%} chance of winning, "
            f"with the draw at {prob_draw:.0%} and {away_team} at {prob_away:.0%}. "
            f"This prediction is based on recent form, head-to-head records, "
            f"and statistical analysis of goal-scoring patterns."
        ),
        "prediction_summary": f"{home_team} {pred_home}-{pred_away} {away_team} — {verdict} most likely outcome ({confidence}% confidence)",
        "betting_tip": (
            f"Best value: {home_team if prob_home > 0.4 else 'Under 2.5 goals' if prob_draw > 0.3 else away_team}"
        ),
    }
