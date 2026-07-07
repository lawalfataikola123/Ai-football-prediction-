from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime

from app.core.database import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    favorite_teams = relationship("UserFavoriteTeam", back_populates="user", cascade="all, delete-orphan")
    prediction_history = relationship("PredictionHistory", back_populates="user", cascade="all, delete-orphan")


class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    logo = Column(String(500), nullable=True)
    flag = Column(String(500), nullable=True)
    season = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    teams = relationship("Team", back_populates="league")
    matches = relationship("Match", back_populates="league")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    short_name = Column(String(50), nullable=True)
    logo = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    founded = Column(Integer, nullable=True)
    venue_name = Column(String(255), nullable=True)
    venue_city = Column(String(100), nullable=True)
    venue_capacity = Column(Integer, nullable=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    league = relationship("League", back_populates="teams")
    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")
    stats = relationship("TeamStats", back_populates="team", cascade="all, delete-orphan")


class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    IN_PLAY = "in_play"
    PAUSED = "paused"
    FINISHED = "finished"
    POSTPONED = "postponed"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True, nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.SCHEDULED, nullable=False)
    match_date = Column(DateTime(timezone=True), nullable=False)
    round = Column(String(50), nullable=True)
    venue = Column(String(255), nullable=True)
    referee = Column(String(100), nullable=True)

    # Scores
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    home_score_ht = Column(Integer, nullable=True)
    away_score_ht = Column(Integer, nullable=True)

    # Odds
    odd_home = Column(Float, nullable=True)
    odd_draw = Column(Float, nullable=True)
    odd_away = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    league = relationship("League", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    predictions = relationship("MatchPrediction", back_populates="match", cascade="all, delete-orphan")
    stats = relationship("MatchStats", back_populates="match", cascade="all, delete-orphan")


class TeamStats(Base):
    __tablename__ = "team_stats"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    season = Column(Integer, nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)

    # Overall
    played = Column(Integer, default=0)
    won = Column(Integer, default=0)
    draw = Column(Integer, default=0)
    lost = Column(Integer, default=0)
    goals_for = Column(Integer, default=0)
    goals_against = Column(Integer, default=0)
    points = Column(Integer, default=0)

    # Home
    home_played = Column(Integer, default=0)
    home_won = Column(Integer, default=0)
    home_draw = Column(Integer, default=0)
    home_lost = Column(Integer, default=0)
    home_goals_for = Column(Integer, default=0)
    home_goals_against = Column(Integer, default=0)

    # Away
    away_played = Column(Integer, default=0)
    away_won = Column(Integer, default=0)
    away_draw = Column(Integer, default=0)
    away_lost = Column(Integer, default=0)
    away_goals_for = Column(Integer, default=0)
    away_goals_against = Column(Integer, default=0)

    # Form (last 10)
    form = Column(String(20), nullable=True)  # e.g., "WDLWWLDDWL"

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    team = relationship("Team", back_populates="stats")


class MatchStats(Base):
    __tablename__ = "match_stats"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, unique=True)

    # Shots
    home_shots = Column(Integer, nullable=True)
    away_shots = Column(Integer, nullable=True)
    home_shots_on_target = Column(Integer, nullable=True)
    away_shots_on_target = Column(Integer, nullable=True)

    # Possession
    home_possession = Column(Integer, nullable=True)
    away_possession = Column(Integer, nullable=True)

    # Passes
    home_passes = Column(Integer, nullable=True)
    away_passes = Column(Integer, nullable=True)
    home_passes_accurate = Column(Integer, nullable=True)
    away_passes_accurate = Column(Integer, nullable=True)

    # Fouls
    home_fouls = Column(Integer, nullable=True)
    away_fouls = Column(Integer, nullable=True)

    # Corners
    home_corners = Column(Integer, nullable=True)
    away_corners = Column(Integer, nullable=True)

    # Offsides
    home_offsides = Column(Integer, nullable=True)
    away_offsides = Column(Integer, nullable=True)

    # Yellow/Red cards
    home_yellow_cards = Column(Integer, nullable=True)
    away_yellow_cards = Column(Integer, nullable=True)
    home_red_cards = Column(Integer, nullable=True)
    away_red_cards = Column(Integer, nullable=True)

    # xG
    home_xg = Column(Float, nullable=True)
    away_xg = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    match = relationship("Match", back_populates="stats")


class MatchPrediction(Base):
    __tablename__ = "match_predictions"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, unique=True)
    model_version = Column(String(50), nullable=False)

    # 1X2 Probabilities
    prob_home_win = Column(Float, nullable=False)
    prob_draw = Column(Float, nullable=False)
    prob_away_win = Column(Float, nullable=False)

    # Score predictions (top 3)
    predicted_score_1 = Column(String(10), nullable=True)  # "2-1"
    prob_score_1 = Column(Float, nullable=True)
    predicted_score_2 = Column(String(10), nullable=True)
    prob_score_2 = Column(Float, nullable=True)
    predicted_score_3 = Column(String(10), nullable=True)
    prob_score_3 = Column(Float, nullable=True)

    # Over/Under 2.5
    prob_over_25 = Column(Float, nullable=False)
    prob_under_25 = Column(Float, nullable=False)

    # BTTS
    prob_btts_yes = Column(Float, nullable=False)
    prob_btts_no = Column(Float, nullable=False)

    # Confidence
    confidence_score = Column(Float, nullable=False)  # 0-100

    # Feature importance (JSON stored as text)
    feature_importance = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="predictions")


class UserFavoriteTeam(Base):
    __tablename__ = "user_favorite_teams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorite_teams")
    team = relationship("Team")


class PredictionHistory(Base):
    __tablename__ = "prediction_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("match_predictions.id"), nullable=True)

    # User's prediction
    predicted_result = Column(String(10), nullable=False)  # "home", "draw", "away"
    predicted_score = Column(String(10), nullable=True)
    confidence = Column(Float, nullable=True)

    # Actual result
    actual_result = Column(String(10), nullable=True)
    actual_score = Column(String(10), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="prediction_history")


def __import_models__():
    """Import all models to register them with SQLAlchemy metadata."""
    pass