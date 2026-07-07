import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.models import Team, Match, TeamStats, MatchStats, MatchStatus


class FeatureEngineer:
    def __init__(self):
        self.feature_names = [
            "home_elo", "away_elo", "elo_diff",
            "home_form_points", "away_form_points", "form_diff",
            "home_goals_avg", "away_goals_avg", "home_conceded_avg", "away_conceded_avg",
            "home_goals_diff", "away_goals_diff",
            "home_home_win_rate", "home_home_draw_rate", "home_home_loss_rate",
            "away_away_win_rate", "away_away_draw_rate", "away_away_loss_rate",
            "h2h_home_wins", "h2h_draws", "h2h_away_wins", "h2h_total",
            "home_last5_points", "away_last5_points",
            "home_league_position", "away_league_position", "position_diff",
            "home_xg_avg", "away_xg_avg", "home_xg_conceded_avg", "away_xg_conceded_avg",
        ]

    async def calculate_elo(self, team: Team, db: AsyncSession, season: int) -> float:
        base_elo = 1500

        stats_query = select(TeamStats).where(
            and_(TeamStats.team_id == team.id, TeamStats.season == season)
        )
        result = await db.execute(stats_query)
        stats = result.scalar_one_or_none()

        if not stats or stats.played == 0:
            return base_elo

        win_rate = stats.won / stats.played if stats.played > 0 else 0.5
        goal_diff = (stats.goals_for - stats.goals_against) / stats.played if stats.played > 0 else 0

        elo = base_elo + (win_rate - 0.5) * 400 + goal_diff * 50
        return max(1000, min(2000, elo))

    async def get_team_form(self, team: Team, db: AsyncSession, matches_count: int = 10) -> Dict:
        query = select(Match).where(
            or_(
                Match.home_team_id == team.id,
                Match.away_team_id == team.id
            )
        ).where(Match.status == MatchStatus.FINISHED).order_by(Match.match_date.desc()).limit(matches_count)

        result = await db.execute(query)
        matches = result.scalars().all()

        if not matches:
            return {
                "points": 0, "wins": 0, "draws": 0, "losses": 0,
                "goals_for": 0, "goals_against": 0, "form_string": ""
            }

        points = 0
        wins = 0
        draws = 0
        losses = 0
        goals_for = 0
        goals_against = 0
        form_string = ""

        for match in matches:
            is_home = match.home_team_id == team.id
            team_score = match.home_score if is_home else match.away_score
            opp_score = match.away_score if is_home else match.home_score

            if team_score is None or opp_score is None:
                continue

            goals_for += team_score
            goals_against += opp_score

            if team_score > opp_score:
                points += 3
                wins += 1
                form_string += "W"
            elif team_score == opp_score:
                points += 1
                draws += 1
                form_string += "D"
            else:
                losses += 1
                form_string += "L"

        return {
            "points": points,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "goals_for": goals_for,
            "goals_against": goals_against,
            "form_string": form_string
        }

    async def get_h2h_stats(self, home_team: Team, away_team: Team, db: AsyncSession) -> Dict:
        query = select(Match).where(
            or_(
                and_(Match.home_team_id == home_team.id, Match.away_team_id == away_team.id),
                and_(Match.home_team_id == away_team.id, Match.away_team_id == home_team.id)
            )
        ).where(Match.status == MatchStatus.FINISHED).order_by(Match.match_date.desc()).limit(10)

        result = await db.execute(query)
        matches = result.scalars().all()

        home_wins = 0
        draws = 0
        away_wins = 0

        for match in matches:
            if match.home_score is None or match.away_score is None:
                continue
            if match.home_score > match.away_score:
                if match.home_team_id == home_team.id:
                    home_wins += 1
                else:
                    away_wins += 1
            elif match.home_score == match.away_score:
                draws += 1
            else:
                if match.home_team_id == home_team.id:
                    away_wins += 1
                else:
                    home_wins += 1

        return {
            "home_wins": home_wins,
            "draws": draws,
            "away_wins": away_wins,
            "total": len(matches)
        }

    async def get_team_stats_features(self, team: Team, db: AsyncSession, season: int, is_home: bool) -> Dict:
        query = select(TeamStats).where(
            and_(TeamStats.team_id == team.id, TeamStats.season == season)
        )
        result = await db.execute(query)
        stats = result.scalar_one_or_none()

        if not stats:
            return {
                "goals_avg": 1.0, "conceded_avg": 1.0, "goals_diff": 0.0,
                "home_win_rate": 0.33, "home_draw_rate": 0.33, "home_loss_rate": 0.33,
                "away_win_rate": 0.33, "away_draw_rate": 0.33, "away_loss_rate": 0.33,
                "xg_avg": 1.0, "xg_conceded_avg": 1.0,
            }

        played = max(stats.played, 1)
        if is_home:
            home_played = max(stats.home_played, 1)
            return {
                "goals_avg": stats.goals_for / played,
                "conceded_avg": stats.goals_against / played,
                "goals_diff": (stats.goals_for - stats.goals_against) / played,
                "home_win_rate": stats.home_won / home_played,
                "home_draw_rate": stats.home_draw / home_played,
                "home_loss_rate": stats.home_lost / home_played,
                "away_win_rate": stats.away_won / max(stats.away_played, 1),
                "away_draw_rate": stats.away_draw / max(stats.away_played, 1),
                "away_loss_rate": stats.away_lost / max(stats.away_played, 1),
                "xg_avg": 1.0,
                "xg_conceded_avg": 1.0,
            }
        else:
            away_played = max(stats.away_played, 1)
            return {
                "goals_avg": stats.goals_for / played,
                "conceded_avg": stats.goals_against / played,
                "goals_diff": (stats.goals_for - stats.goals_against) / played,
                "home_win_rate": stats.home_won / max(stats.home_played, 1),
                "home_draw_rate": stats.home_draw / max(stats.home_played, 1),
                "home_loss_rate": stats.home_lost / max(stats.home_played, 1),
                "away_win_rate": stats.away_won / away_played,
                "away_draw_rate": stats.away_draw / away_played,
                "away_loss_rate": stats.away_lost / away_played,
                "xg_avg": 1.0,
                "xg_conceded_avg": 1.0,
            }

    async def get_league_position(self, team: Team, db: AsyncSession, season: int) -> int:
        query = select(TeamStats).where(
            and_(TeamStats.league_id == team.league_id, TeamStats.season == season)
        ).order_by(TeamStats.points.desc(), (TeamStats.goals_for - TeamStats.goals_against).desc())

        result = await db.execute(query)
        all_stats = result.scalars().all()

        for i, stats in enumerate(all_stats):
            if stats.team_id == team.id:
                return i + 1
        return 20

    async def build_features(self, home_team: Team, away_team: Team, db: AsyncSession, match_date: datetime) -> Dict:
        season = match_date.year
        if match_date.month < 8:
            season -= 1

        home_elo = await self.calculate_elo(home_team, db, season)
        away_elo = await self.calculate_elo(away_team, db, season)

        home_form = await self.get_team_form(home_team, db, 10)
        away_form = await self.get_team_form(away_team, db, 10)

        h2h = await self.get_h2h_stats(home_team, away_team, db)

        home_stats = await self.get_team_stats_features(home_team, db, season, True)
        away_stats = await self.get_team_stats_features(away_team, db, season, False)

        home_pos = await self.get_league_position(home_team, db, season)
        away_pos = await self.get_league_position(away_team, db, season)

        features = {
            "home_elo": home_elo,
            "away_elo": away_elo,
            "elo_diff": home_elo - away_elo,
            "home_form_points": home_form["points"],
            "away_form_points": away_form["points"],
            "form_diff": home_form["points"] - away_form["points"],
            "home_goals_avg": home_stats["goals_avg"],
            "away_goals_avg": away_stats["goals_avg"],
            "home_conceded_avg": home_stats["conceded_avg"],
            "away_conceded_avg": away_stats["conceded_avg"],
            "home_goals_diff": home_stats["goals_diff"],
            "away_goals_diff": away_stats["goals_diff"],
            "home_home_win_rate": home_stats["home_win_rate"],
            "home_home_draw_rate": home_stats["home_draw_rate"],
            "home_home_loss_rate": home_stats["home_loss_rate"],
            "away_away_win_rate": away_stats["away_win_rate"],
            "away_away_draw_rate": away_stats["away_draw_rate"],
            "away_away_loss_rate": away_stats["away_loss_rate"],
            "h2h_home_wins": h2h["home_wins"],
            "h2h_draws": h2h["draws"],
            "h2h_away_wins": h2h["away_wins"],
            "h2h_total": h2h["total"],
            "home_last5_points": home_form["points"],  # Using 10-match form as proxy
            "away_last5_points": away_form["points"],
            "home_league_position": home_pos,
            "away_league_position": away_pos,
            "position_diff": home_pos - away_pos,
            "home_xg_avg": home_stats["xg_avg"],
            "away_xg_avg": away_stats["xg_avg"],
            "home_xg_conceded_avg": home_stats["xg_conceded_avg"],
            "away_xg_conceded_avg": away_stats["xg_conceded_avg"],
        }

        return features

    def features_to_array(self, features: Dict) -> np.ndarray:
        return np.array([features[name] for name in self.feature_names]).reshape(1, -1)

    def get_feature_vector(self, features: Dict) -> np.ndarray:
        """Alias for features_to_array for compatibility."""
        return self.features_to_array(features)


feature_engineer = FeatureEngineer()