from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import json
import logging

import redis.asyncio as redis

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models import User
from app.models import Match, League, Team, TeamStats, MatchPrediction, MatchStatus
from app.schemas.match import (
    League as LeagueSchema, LeagueCreate, LeagueUpdate,
    Team as TeamSchema, TeamCreate, TeamUpdate, TeamWithStats,
    Match as MatchSchema, MatchCreate, MatchUpdate, MatchWithDetails,
    TeamStats as TeamStatsSchema, TeamStatsCreate, TeamStatsUpdate,
    MatchPrediction as MatchPredictionSchema, MatchPredictionCreate, MatchPredictionWithDetails,
    UpcomingMatchResponse, ModelPerformance, PredictionRequest
)

logger = logging.getLogger(__name__)

async def get_redis():
    """Get Redis connection, returns None if unavailable."""
    try:
        from app.core.config import settings
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        return client
    except Exception:
        logger.warning("Redis unavailable, skipping cache")
        return None


def serialize_match_for_cache(match) -> dict:
    """Serialize a match ORM object to a dict for Redis caching."""
    return {
        "id": match.id,
        "league_id": match.league_id,
        "home_team_id": match.home_team_id,
        "away_team_id": match.away_team_id,
        "match_date": match.match_date.isoformat() if match.match_date else None,
        "status": match.status,
        "home_score": match.home_score,
        "away_score": match.away_score,
        "odd_home": match.odd_home,
        "odd_draw": match.odd_draw,
        "odd_away": match.odd_away,
        "league_name": match.league.name if match.league else None,
        "league_country": match.league.country if match.league else None,
        "home_team_name": match.home_team.name if match.home_team else None,
        "home_team_logo": match.home_team.logo if match.home_team else None,
        "away_team_name": match.away_team.name if match.away_team else None,
        "away_team_logo": match.away_team.logo if match.away_team else None,
    }

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/upcoming", response_model=List[UpcomingMatchResponse])
async def get_upcoming_matches(
    days: int = Query(7, ge=1, le=30),
    league_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    end_date = datetime.utcnow() + timedelta(days=days)
    cache_key = f"matches:upcoming:{days}:{league_id if league_id else 'all'}"
    cache_ttl = 300  # 5 minutes

    # Try cache first
    r = await get_redis()
    if r:
        try:
            cached = await r.get(cache_key)
            if cached:
                cached_data = json.loads(cached)
                return [UpcomingMatchResponse(**item) for item in cached_data]
        except Exception:
            pass

    query = select(Match).options(
        selectinload(Match.league),
        selectinload(Match.home_team),
        selectinload(Match.away_team),
        selectinload(Match.predictions)
    ).where(
        and_(
            Match.match_date >= datetime.utcnow(),
            Match.match_date <= end_date,
            Match.status == MatchStatus.SCHEDULED
        )
    ).order_by(Match.match_date)

    if league_id:
        query = query.where(Match.league_id == league_id)

    result = await db.execute(query)
    matches = result.scalars().all()

    response = []
    for match in matches:
        prediction = match.predictions[0] if match.predictions else None
        days_until = (match.match_date - datetime.utcnow()).days

        match_detail = MatchWithDetails(
            id=match.id,
            external_id=match.external_id,
            league_id=match.league_id,
            home_team_id=match.home_team_id,
            away_team_id=match.away_team_id,
            match_date=match.match_date,
            round=match.round,
            venue=match.venue,
            referee=match.referee,
            status=match.status,
            home_score=match.home_score,
            away_score=match.away_score,
            home_score_ht=match.home_score_ht,
            away_score_ht=match.away_score_ht,
            odd_home=match.odd_home,
            odd_draw=match.odd_draw,
            odd_away=match.odd_away,
            created_at=match.created_at,
            updated_at=match.updated_at,
            league=match.league,
            home_team=match.home_team,
            away_team=match.away_team,
            prediction=prediction
        )

        response.append(UpcomingMatchResponse(
            match=match_detail,
            prediction=prediction,
            days_until_match=days_until
        ))

    # Cache the response if Redis is available
    if r:
        try:
            cache_data = [item.model_dump(mode='json') for item in response]
            await r.setex(cache_key, cache_ttl, json.dumps(cache_data))
        except Exception:
            pass

    return response


@router.get("/leagues/", response_model=List[LeagueSchema])
async def get_leagues(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    query = select(League).order_by(League.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/teams/search", response_model=List[TeamSchema])
async def search_teams(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    query = select(Team).where(
        or_(
            Team.name.ilike(f"%{q}%"),
            Team.short_name.ilike(f"%{q}%")
        )
    ).limit(20)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{match_id}", response_model=MatchWithDetails)
async def get_match(
    match_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    query = select(Match).options(
        selectinload(Match.league),
        selectinload(Match.home_team),
        selectinload(Match.away_team),
        selectinload(Match.predictions),
        selectinload(Match.stats)
    ).where(Match.id == match_id)

    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    prediction = match.predictions[0] if match.predictions else None

    return MatchWithDetails(
        id=match.id,
        external_id=match.external_id,
        league_id=match.league_id,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        match_date=match.match_date,
        round=match.round,
        venue=match.venue,
        referee=match.referee,
        status=match.status,
        home_score=match.home_score,
        away_score=match.away_score,
        home_score_ht=match.home_score_ht,
        away_score_ht=match.away_score_ht,
        odd_home=match.odd_home,
        odd_draw=match.odd_draw,
        odd_away=match.odd_away,
        created_at=match.created_at,
        updated_at=match.updated_at,
        league=match.league,
        home_team=match.home_team,
        away_team=match.away_team,
        prediction=prediction
    )


@router.post("/predict/custom", response_model=MatchPredictionSchema)
async def predict_custom_match(
    prediction_request: PredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Import here to avoid circular imports
    from app.ml.prediction import predict_match

    # Get teams
    home_team_query = select(Team).where(Team.id == prediction_request.home_team_id)
    away_team_query = select(Team).where(Team.id == prediction_request.away_team_id)

    home_team_result = await db.execute(home_team_query)
    away_team_result = await db.execute(away_team_query)

    home_team = home_team_result.scalar_one_or_none()
    away_team = away_team_result.scalar_one_or_none()

    if not home_team or not away_team:
        raise HTTPException(status_code=404, detail="One or both teams not found")

    # Run prediction
    prediction_result = await predict_match(
        home_team=home_team,
        away_team=away_team,
        db=db,
        match_date=prediction_request.match_date or datetime.utcnow()
    )

    return prediction_result


@router.get("/model/performance", response_model=ModelPerformance)
async def get_model_performance(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    from app.ml.evaluation import evaluate_model
    return await evaluate_model(db)


@router.get("/teams/{team_id}/stats", response_model=TeamWithStats)
async def get_team_stats(
    team_id: int,
    season: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    query = select(Team).options(
        selectinload(Team.stats)
    ).where(Team.id == team_id)

    result = await db.execute(query)
    team = result.scalar_one_or_none()

    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    stats = None
    if team.stats:
        if season:
            stats = next((s for s in team.stats if s.season == season), None)
        else:
            stats = max(team.stats, key=lambda s: s.season) if team.stats else None

    return TeamWithStats(
        id=team.id,
        external_id=team.external_id,
        name=team.name,
        short_name=team.short_name,
        logo=team.logo,
        country=team.country,
        founded=team.founded,
        venue_name=team.venue_name,
        venue_city=team.venue_city,
        venue_capacity=team.venue_capacity,
        league_id=team.league_id,
        created_at=team.created_at,
        updated_at=team.updated_at,
        stats=stats
    )


@router.get("/{match_id}/analysis")
async def get_match_analysis(
    match_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get AI-generated natural language analysis for a match."""
    from app.core.config import get_settings
    from app.schemas.analysis import MatchAnalysis
    from app.services.ai_service import generate_match_analysis
    from app.ml.features import feature_engineer

    settings = get_settings()

    query = select(Match).options(
        selectinload(Match.league),
        selectinload(Match.home_team),
        selectinload(Match.away_team),
        selectinload(Match.predictions),
        selectinload(Match.stats),
    ).where(Match.id == match_id)

    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    prediction = match.predictions[0] if match.predictions else None

    # Get team stats for analysis
    home_stats_q = select(TeamStats).where(
        TeamStats.team_id == match.home_team_id
    ).order_by(TeamStats.season.desc()).limit(1)
    away_stats_q = select(TeamStats).where(
        TeamStats.team_id == match.away_team_id
    ).order_by(TeamStats.season.desc()).limit(1)

    home_stats = (await db.execute(home_stats_q)).scalar_one_or_none()
    away_stats = (await db.execute(away_stats_q)).scalar_one_or_none()

    # Head-to-head query
    h2h_query = select(Match).where(
        or_(
            and_(Match.home_team_id == match.home_team_id, Match.away_team_id == match.away_team_id),
            and_(Match.home_team_id == match.away_team_id, Match.away_team_id == match.home_team_id),
        ),
        Match.status == "finished",
        Match.home_score.is_not(None),
    ).order_by(Match.match_date.desc()).limit(10)

    h2h_matches = (await db.execute(h2h_query)).scalars().all()

    h2h_wins = {"home": 0, "away": 0, "draw": 0}
    for m in h2h_matches:
        if m.home_score == m.away_score:
            h2h_wins["draw"] += 1
        elif m.home_team_id == match.home_team_id and m.home_score > m.away_score:
            h2h_wins["home"] += 1
        elif m.away_team_id == match.home_team_id and m.away_score > m.home_score:
            h2h_wins["home"] += 1
        elif m.home_team_id == match.away_team_id and m.home_score > m.away_score:
            h2h_wins["away"] += 1
        elif m.away_team_id == match.away_team_id and m.away_score > m.home_score:
            h2h_wins["away"] += 1

    league_name = match.league.name if match.league else "Unknown"
    date_str = match.match_date.strftime("%Y-%m-%d") if match.match_date else "TBD"
    season = match.match_date.year if match.match_date else 2024
    if match.match_date and match.match_date.month < 8:
        season -= 1

    analysis = await generate_match_analysis(
        home_team=match.home_team.name if match.home_team else "Home",
        away_team=match.away_team.name if match.away_team else "Away",
        competition=league_name,
        match_date=date_str,
        home_form=home_stats.form if home_stats else "N/A",
        away_form=away_stats.form if away_stats else "N/A",
        home_position=await feature_engineer.get_league_position(match.home_team, db, season) if match.home_team else None,
        away_position=await feature_engineer.get_league_position(match.away_team, db, season) if match.away_team else None,
        home_goals_scored=home_stats.goals_for if home_stats else 0,
        home_goals_conceded=home_stats.goals_against if home_stats else 0,
        away_goals_scored=away_stats.goals_for if away_stats else 0,
        away_goals_conceded=away_stats.goals_against if away_stats else 0,
        h2h_home_wins=h2h_wins["home"],
        h2h_draws=h2h_wins["draw"],
        h2h_away_wins=h2h_wins["away"],
        prob_home_win=prediction.prob_home_win if prediction else 0.33,
        prob_draw=prediction.prob_draw if prediction else 0.34,
        prob_away_win=prediction.prob_away_win if prediction else 0.33,
        confidence=prediction.confidence_score if prediction else 50,
        predicted_home_score=prediction.predicted_score_home if prediction else 1,
        predicted_away_score=prediction.predicted_score_away if prediction else 1,
        prob_btss_yes=prediction.prob_btts_yes if prediction else 0.5,
        prob_over_25=prediction.prob_over_25 if prediction else 0.5,
    )

    return MatchAnalysis(
        key_factors=analysis.get("key_factors", []),
        match_insight=analysis.get("match_insight", ""),
        prediction_summary=analysis.get("prediction_summary", ""),
        betting_tip=analysis.get("betting_tip"),
        is_ai_generated=bool(settings.AI_API_KEY),
    )