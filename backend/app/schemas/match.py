from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MatchStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    IN_PLAY = "in_play"
    PAUSED = "paused"
    FINISHED = "finished"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class LeagueBase(BaseModel):
    external_id: int
    name: str
    country: str
    logo: Optional[str] = None
    flag: Optional[str] = None
    season: int


class LeagueCreate(LeagueBase):
    pass


class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    logo: Optional[str] = None
    flag: Optional[str] = None
    season: Optional[int] = None


class League(LeagueBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamBase(BaseModel):
    external_id: int
    name: str
    short_name: Optional[str] = None
    logo: Optional[str] = None
    country: Optional[str] = None
    founded: Optional[int] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[int] = None
    league_id: int


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    logo: Optional[str] = None
    country: Optional[str] = None
    founded: Optional[int] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[int] = None


class Team(TeamBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TeamWithStats(BaseModel):
    id: int
    external_id: int
    name: str
    short_name: Optional[str] = None
    logo: Optional[str] = None
    country: Optional[str] = None
    founded: Optional[int] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[int] = None
    league_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    stats: Optional["TeamStats"] = None

    class Config:
        from_attributes = True


class TeamStatsBase(BaseModel):
    team_id: int
    season: int
    league_id: int
    played: int = 0
    won: int = 0
    draw: int = 0
    lost: int = 0
    goals_for: int = 0
    goals_against: int = 0
    points: int = 0
    home_played: int = 0
    home_won: int = 0
    home_draw: int = 0
    home_lost: int = 0
    home_goals_for: int = 0
    home_goals_against: int = 0
    away_played: int = 0
    away_won: int = 0
    away_draw: int = 0
    away_lost: int = 0
    away_goals_for: int = 0
    away_goals_against: int = 0
    form: Optional[str] = None


class TeamStatsCreate(TeamStatsBase):
    pass


class TeamStatsUpdate(BaseModel):
    played: Optional[int] = None
    won: Optional[int] = None
    draw: Optional[int] = None
    lost: Optional[int] = None
    goals_for: Optional[int] = None
    goals_against: Optional[int] = None
    points: Optional[int] = None
    home_played: Optional[int] = None
    home_won: Optional[int] = None
    home_draw: Optional[int] = None
    home_lost: Optional[int] = None
    home_goals_for: Optional[int] = None
    home_goals_against: Optional[int] = None
    away_played: Optional[int] = None
    away_won: Optional[int] = None
    away_draw: Optional[int] = None
    away_lost: Optional[int] = None
    away_goals_for: Optional[int] = None
    away_goals_against: Optional[int] = None
    form: Optional[str] = None


class TeamStats(TeamStatsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MatchBase(BaseModel):
    external_id: int
    league_id: int
    home_team_id: int
    away_team_id: int
    match_date: datetime
    round: Optional[str] = None
    venue: Optional[str] = None
    referee: Optional[str] = None
    odd_home: Optional[float] = None
    odd_draw: Optional[float] = None
    odd_away: Optional[float] = None


class MatchCreate(MatchBase):
    pass


class MatchUpdate(BaseModel):
    status: Optional[MatchStatus] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    home_score_ht: Optional[int] = None
    away_score_ht: Optional[int] = None
    odd_home: Optional[float] = None
    odd_draw: Optional[float] = None
    odd_away: Optional[float] = None


class Match(MatchBase):
    id: int
    status: MatchStatus
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    home_score_ht: Optional[int] = None
    away_score_ht: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MatchWithDetails(Match):
    league: Optional[League] = None
    home_team: Optional[Team] = None
    away_team: Optional[Team] = None
    prediction: Optional["MatchPrediction"] = None

    class Config:
        from_attributes = True


class MatchPredictionBase(BaseModel):
    match_id: int
    model_version: str
    prob_home_win: float = Field(..., ge=0, le=1)
    prob_draw: float = Field(..., ge=0, le=1)
    prob_away_win: float = Field(..., ge=0, le=1)
    predicted_score_1: Optional[str] = None
    prob_score_1: Optional[float] = None
    predicted_score_2: Optional[str] = None
    prob_score_2: Optional[float] = None
    predicted_score_3: Optional[str] = None
    prob_score_3: Optional[float] = None
    prob_over_25: float = Field(..., ge=0, le=1)
    prob_under_25: float = Field(..., ge=0, le=1)
    prob_btts_yes: float = Field(..., ge=0, le=1)
    prob_btts_no: float = Field(..., ge=0, le=1)
    confidence_score: float = Field(..., ge=0, le=100)
    feature_importance: Optional[str] = None


class MatchPredictionCreate(MatchPredictionBase):
    pass


class MatchPrediction(MatchPredictionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MatchPredictionWithDetails(MatchPrediction):
    match: Optional[Match] = None

    class Config:
        from_attributes = True


class UpcomingMatchResponse(BaseModel):
    match: MatchWithDetails
    prediction: Optional[MatchPrediction] = None
    days_until_match: int


class ModelPerformance(BaseModel):
    accuracy: float
    log_loss: float
    confusion_matrix: List[List[int]]
    class_precision: List[float]
    class_recall: List[float]
    class_f1: List[float]
    roi_flat_stake: float
    total_predictions: int
    correct_predictions: int
    last_updated: datetime


class PredictionRequest(BaseModel):
    home_team_id: int
    away_team_id: int
    match_date: Optional[datetime] = None
    home_team_form: Optional[str] = None
    away_team_form: Optional[str] = None


TeamWithStats.model_rebuild()
MatchWithDetails.model_rebuild()
MatchPredictionWithDetails.model_rebuild()