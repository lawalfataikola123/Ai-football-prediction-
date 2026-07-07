#!/usr/bin/env python3
"""Seed script to populate database with demo data for 5 top European leagues."""

import asyncio
import random
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.database import async_session_maker, init_db
from app.core.security import get_password_hash
from app.models import (
    User, League, Team, TeamStats, Match, MatchPrediction,
    MatchStatus, MatchStats
)
from sqlalchemy import select


LEAGUES = [
    {"name": "Premier League", "country": "England", "season": 2024},
    {"name": "La Liga", "country": "Spain", "season": 2024},
    {"name": "Serie A", "country": "Italy", "season": 2024},
    {"name": "Bundesliga", "country": "Germany", "season": 2024},
    {"name": "Ligue 1", "country": "France", "season": 2024},
]

TEAMS = {
    "Premier League": [
        {"name": "Manchester City", "short_name": "MCI", "country": "England",
         "venue_name": "Etihad Stadium", "logo": "https://example.com/logos/man-city.png"},
        {"name": "Arsenal", "short_name": "ARS", "country": "England",
         "venue_name": "Emirates Stadium", "logo": "https://example.com/logos/arsenal.png"},
        {"name": "Liverpool", "short_name": "LIV", "country": "England",
         "venue_name": "Anfield", "logo": "https://example.com/logos/liverpool.png"},
        {"name": "Chelsea", "short_name": "CHE", "country": "England",
         "venue_name": "Stamford Bridge", "logo": "https://example.com/logos/chelsea.png"},
    ],
    "La Liga": [
        {"name": "Real Madrid", "short_name": "RMA", "country": "Spain",
         "venue_name": "Santiago Bernabéu", "logo": "https://example.com/logos/real-madrid.png"},
        {"name": "FC Barcelona", "short_name": "BAR", "country": "Spain",
         "venue_name": "Camp Nou", "logo": "https://example.com/logos/barcelona.png"},
        {"name": "Atletico Madrid", "short_name": "ATM", "country": "Spain",
         "venue_name": "Metropolitano", "logo": "https://example.com/logos/atleti.png"},
        {"name": "Sevilla", "short_name": "SEV", "country": "Spain",
         "venue_name": "Ramón Sánchez Pizjuán", "logo": "https://example.com/logos/sevilla.png"},
    ],
    "Serie A": [
        {"name": "Inter Milan", "short_name": "INT", "country": "Italy",
         "venue_name": "San Siro", "logo": "https://example.com/logos/inter.png"},
        {"name": "AC Milan", "short_name": "MIL", "country": "Italy",
         "venue_name": "San Siro", "logo": "https://example.com/logos/milan.png"},
        {"name": "Juventus", "short_name": "JUV", "country": "Italy",
         "venue_name": "Allianz Stadium", "logo": "https://example.com/logos/juventus.png"},
        {"name": "Napoli", "short_name": "NAP", "country": "Italy",
         "venue_name": "Diego Armando Maradona", "logo": "https://example.com/logos/napoli.png"},
    ],
    "Bundesliga": [
        {"name": "Bayern Munich", "short_name": "BAY", "country": "Germany",
         "venue_name": "Allianz Arena", "logo": "https://example.com/logos/bayern.png"},
        {"name": "Borussia Dortmund", "short_name": "BVB", "country": "Germany",
         "venue_name": "Signal Iduna Park", "logo": "https://example.com/logos/dortmund.png"},
        {"name": "RB Leipzig", "short_name": "RBL", "country": "Germany",
         "venue_name": "Red Bull Arena", "logo": "https://example.com/logos/leipzig.png"},
        {"name": "Bayer Leverkusen", "short_name": "LEV", "country": "Germany",
         "venue_name": "BayArena", "logo": "https://example.com/logos/leverkusen.png"},
    ],
    "Ligue 1": [
        {"name": "Paris Saint-Germain", "short_name": "PSG", "country": "France",
         "venue_name": "Parc des Princes", "logo": "https://example.com/logos/psg.png"},
        {"name": "Olympique Marseille", "short_name": "MAR", "country": "France",
         "venue_name": "Stade Vélodrome", "logo": "https://example.com/logos/marseille.png"},
        {"name": "AS Monaco", "short_name": "MON", "country": "France",
         "venue_name": "Stade Louis II", "logo": "https://example.com/logos/monaco.png"},
        {"name": "Olympique Lyon", "short_name": "LYO", "country": "France",
         "venue_name": "Groupama Stadium", "logo": "https://example.com/logos/lyon.png"},
    ],
}

FORM_STRINGS = ["WWWDL", "WDWDL", "LWWDL", "WDLDW", "LLWWD", "DWWLD", "WWDWL", "LDLWW"]


def random_form():
    return random.choice(FORM_STRINGS)


def random_score():
    return random.randint(0, 4), random.randint(0, 4)


def random_odds():
    h = round(random.uniform(1.5, 6.0), 2)
    d = round(random.uniform(2.0, 4.5), 2)
    a = round(random.uniform(1.5, 6.0), 2)
    return h, d, a


async def seed_database():
    print("Initializing database...")
    await init_db()

    async with async_session_maker() as session:
        # Check if data already exists
        result = await session.execute(select(User).limit(1))
        if result.scalar():
            print("Database already seeded, skipping.")
            return

        print("Creating demo user...")
        demo_user = User(
            username="demo",
            email="demo@example.com",
            full_name="Demo User",
            hashed_password=get_password_hash("demo1234"),
            is_active=True,
            role="user",
        )
        session.add(demo_user)

        league_objects = {}
        team_objects = {}

        print("Creating leagues and teams...")
        for idx, league_data in enumerate(LEAGUES, start=1):
            league = League(
                external_id=idx,
                name=league_data["name"],
                country=league_data["country"],
                season=league_data["season"],
                logo=f"https://example.com/logos/{league_data['name'].lower().replace(' ', '-')}.png",
                flag=f"https://example.com/flags/{league_data['country'].lower()}.png",
            )
            session.add(league)
            await session.flush()
            league_objects[league.name] = league

            for team_idx, team_data in enumerate(TEAMS[league_data["name"]], start=1):
                team = Team(
                    external_id=idx * 100 + team_idx,
                    name=team_data["name"],
                    short_name=team_data["short_name"],
                    country=team_data["country"],
                    venue_name=team_data["venue_name"],
                    logo=team_data["logo"],
                    league_id=league.id,
                )
                session.add(team)
                await session.flush()
                team_objects[team.name] = team

        print("Creating team stats...")
        for league_name, teams_list in TEAMS.items():
            for team_data in teams_list:
                team = team_objects[team_data["name"]]
                hw = random.randint(5, 12)
                hd = random.randint(2, 5)
                hl = random.randint(1, 6)
                aw = random.randint(3, 10)
                ad = random.randint(2, 6)
                al = random.randint(2, 8)
                hg = random.randint(15, 35)
                hga = random.randint(8, 25)
                ag = random.randint(10, 25)
                aga = random.randint(10, 20)
                stats = TeamStats(
                    team_id=team.id,
                    league_id=league_objects[league_name].id,
                    season=2024,
                    form=random_form(),
                    played=hw + hd + hl + aw + ad + al,
                    won=hw + aw,
                    draw=hd + ad,
                    lost=hl + al,
                    goals_for=hg + ag,
                    goals_against=hga + aga,
                    points=(hw + aw) * 3 + (hd + ad),
                    home_played=hw + hd + hl,
                    home_won=hw,
                    home_draw=hd,
                    home_lost=hl,
                    home_goals_for=hg,
                    home_goals_against=hga,
                    away_played=aw + ad + al,
                    away_won=aw,
                    away_draw=ad,
                    away_lost=al,
                    away_goals_for=ag,
                    away_goals_against=aga,
                )
                session.add(stats)

        print("Creating historical matches...")
        match_count = 0
        for league_name in TEAMS:
            lteams = list(TEAMS[league_name])
            for i in range(10):
                random.shuffle(lteams)
                home = lteams[0]
                away = lteams[1]
                if home == away:
                    continue

                match_date = datetime(2024, 8, 15) + timedelta(days=random.randint(1, 200))
                h_score, a_score = random_score()
                home_odds, draw_odds, away_odds = random_odds()

                match = Match(
                    external_id=match_count + 1000,
                    league_id=league_objects[league_name].id,
                    home_team_id=team_objects[home["name"]].id,
                    away_team_id=team_objects[away["name"]].id,
                    match_date=match_date,
                    status="finished",
                    home_score=h_score,
                    away_score=a_score,
                    odd_home=home_odds,
                    odd_draw=draw_odds,
                    odd_away=away_odds,
                )
                session.add(match)
                await session.flush()

                # Match stats
                ms = MatchStats(
                    match_id=match.id,
                    home_possession=random.randint(35, 65),
                    away_possession=random.randint(35, 65),
                    home_shots=random.randint(5, 20),
                    away_shots=random.randint(5, 20),
                    home_shots_on_target=random.randint(2, 10),
                    away_shots_on_target=random.randint(2, 10),
                    home_corners=random.randint(2, 12),
                    away_corners=random.randint(2, 12),
                    home_fouls=random.randint(5, 15),
                    away_fouls=random.randint(5, 15),
                    home_yellow_cards=random.randint(0, 4),
                    away_yellow_cards=random.randint(0, 4),
                    home_red_cards=random.randint(0, 1),
                    away_red_cards=random.randint(0, 1),
                )
                session.add(ms)

                # Prediction (retrospective)
                pred = MatchPrediction(
                    match_id=match.id,
                    prob_home_win=round(random.uniform(0.2, 0.7), 4),
                    prob_draw=round(random.uniform(0.1, 0.35), 4),
                    prob_away_win=round(random.uniform(0.15, 0.5), 4),
                    predicted_score_1=f"{h_score + random.choice([-1, 0, 1])}-{a_score + random.choice([-1, 0, 1])}",
                    predicted_score_2=f"{h_score + random.choice([-2, -1, 0, 1])}-{a_score + random.choice([0, 1, 2])}",
                    predicted_score_3=f"{h_score + random.choice([-1, 0, 1, 2])}-{a_score + random.choice([-2, -1, 0, 1])}",
                    prob_over_25=round(random.uniform(0.3, 0.7), 4),
                    prob_under_25=round(random.uniform(0.3, 0.7), 4),
                    prob_btts_yes=round(random.uniform(0.3, 0.65), 4),
                    prob_btts_no=round(random.uniform(0.35, 0.7), 4),
                    confidence_score=random.randint(45, 95),
                    model_version="1.0.0",
                )
                session.add(pred)
                match_count += 1

        print(f"Created {match_count} historical matches with predictions.")

        print("Creating upcoming matches...")
        upcoming_count = 0
        for league_name in TEAMS:
            lteams = list(TEAMS[league_name])
            for i in range(3):
                random.shuffle(lteams)
                home = lteams[0]
                away = lteams[1]
                if home == away:
                    continue

                days_ahead = random.randint(1, 7)
                match_date = datetime.now() + timedelta(days=days_ahead, hours=random.randint(10, 22))
                home_odds, draw_odds, away_odds = random_odds()

                match = Match(
                    external_id=upcoming_count + 2000,
                    league_id=league_objects[league_name].id,
                    home_team_id=team_objects[home["name"]].id,
                    away_team_id=team_objects[away["name"]].id,
                    match_date=match_date,
                    status="scheduled",
                    odd_home=home_odds,
                    odd_draw=draw_odds,
                    odd_away=away_odds,
                )
                session.add(match)
                await session.flush()

                pred = MatchPrediction(
                    match_id=match.id,
                    prob_home_win=round(random.uniform(0.25, 0.65), 4),
                    prob_draw=round(random.uniform(0.15, 0.35), 4),
                    prob_away_win=round(random.uniform(0.15, 0.55), 4),
                    predicted_score_1=f"{random.randint(1, 3)}-{random.randint(0, 2)}",
                    predicted_score_2=f"{random.randint(0, 2)}-{random.randint(0, 2)}",
                    predicted_score_3=f"{random.randint(1, 2)}-{random.randint(1, 2)}",
                    prob_over_25=round(random.uniform(0.35, 0.75), 4),
                    prob_under_25=round(random.uniform(0.25, 0.65), 4),
                    prob_btts_yes=round(random.uniform(0.35, 0.7), 4),
                    prob_btts_no=round(random.uniform(0.3, 0.65), 4),
                    confidence_score=random.randint(40, 92),
                    model_version="1.0.0",
                )
                session.add(pred)
                upcoming_count += 1

        print(f"Created {upcoming_count} upcoming matches with predictions.")
        await session.commit()

    print("Database seeded successfully!")
    print("Demo credentials: username='demo', password='demo1234'")


if __name__ == "__main__":
    asyncio.run(seed_database())
