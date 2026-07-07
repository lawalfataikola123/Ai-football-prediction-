import numpy as np
import joblib
import os
from typing import Dict, Optional, Tuple
from datetime import datetime
import json

from app.ml.features import feature_engineer
from app.models import Team
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.match import MatchPrediction


class FootballPredictor:
    def __init__(self):
        self.model_1x2 = None
        self.model_score = None
        self.model_over_under = None
        self.model_btts = None
        self.model_version = "1.0.0"
        self.model_path = os.getenv("MODEL_PATH", "/app/models")
        self.is_trained = False

    def load_models(self):
        """Load trained models from disk."""
        try:
            self.model_1x2 = joblib.load(os.path.join(self.model_path, "model_1x2.joblib"))
            self.model_score = joblib.load(os.path.join(self.model_path, "model_score.joblib"))
            self.model_over_under = joblib.load(os.path.join(self.model_path, "model_over_under.joblib"))
            self.model_btts = joblib.load(os.path.join(self.model_path, "model_btts.joblib"))
            self.is_trained = True
            print("Models loaded successfully")
        except FileNotFoundError:
            print("Model files not found. Using mock predictions.")
            self.is_trained = False

    def save_models(self):
        """Save trained models to disk."""
        os.makedirs(self.model_path, exist_ok=True)
        joblib.dump(self.model_1x2, os.path.join(self.model_path, "model_1x2.joblib"))
        joblib.dump(self.model_score, os.path.join(self.model_path, "model_score.joblib"))
        joblib.dump(self.model_over_under, os.path.join(self.model_path, "model_over_under.joblib"))
        joblib.dump(self.model_btts, os.path.join(self.model_path, "model_btts.joblib"))

    def get_mock_prediction(self, features: Dict) -> Dict:
        """Generate mock prediction based on features when model is not trained."""
        # Simple heuristic based on Elo difference and form
        elo_diff = features.get("elo_diff", 0)
        form_diff = features.get("form_diff", 0)
        home_advantage = 0.15

        # Adjust for home advantage
        adjusted_diff = elo_diff / 400 + form_diff / 30 + home_advantage

        # Convert to probabilities using sigmoid-like function
        prob_home = 1 / (1 + np.exp(-adjusted_diff * 2))
        prob_away = 1 / (1 + np.exp(adjusted_diff * 2))
        prob_draw = 1 - prob_home - prob_away

        # Normalize
        total = prob_home + prob_draw + prob_away
        prob_home /= total
        prob_draw /= total
        prob_away /= total

        # Score prediction based on expected goals
        home_xg = features.get("home_xg_avg", 1.3)
        away_xg = features.get("away_xg_avg", 1.1)
        home_conceded = features.get("home_xg_conceded_avg", 1.2)
        away_conceded = features.get("away_xg_conceded_avg", 1.3)

        expected_home = (home_xg + away_conceded) / 2
        expected_away = (away_xg + home_conceded) / 2

        # Generate top 3 scores
        scores = []
        for h in range(4):
            for a in range(4):
                # Poisson probability
                p_h = np.exp(-expected_home) * (expected_home ** h) / np.math.factorial(h)
                p_a = np.exp(-expected_away) * (expected_away ** a) / np.math.factorial(a)
                scores.append((f"{h}-{a}", p_h * p_a))

        scores.sort(key=lambda x: x[1], reverse=True)
        top_scores = scores[:3]

        # Over/Under 2.5
        total_expected = expected_home + expected_away
        prob_over_25 = 1 / (1 + np.exp(-(total_expected - 2.5) * 2))
        prob_under_25 = 1 - prob_over_25

        # BTTS
        prob_both_score = (1 - np.exp(-expected_home)) * (1 - np.exp(-expected_away))
        prob_btts_yes = prob_both_score
        prob_btts_no = 1 - prob_btts_yes

        # Confidence based on feature quality
        confidence = min(85, max(50, 65 + abs(elo_diff) / 20 + abs(form_diff) * 2))

        return {
            "prob_home_win": prob_home,
            "prob_draw": prob_draw,
            "prob_away_win": prob_away,
            "predicted_score_1": top_scores[0][0] if top_scores else "1-1",
            "prob_score_1": top_scores[0][1] if top_scores else 0.1,
            "predicted_score_2": top_scores[1][0] if len(top_scores) > 1 else "1-0",
            "prob_score_2": top_scores[1][1] if len(top_scores) > 1 else 0.08,
            "predicted_score_3": top_scores[2][0] if len(top_scores) > 2 else "2-1",
            "prob_score_3": top_scores[2][1] if len(top_scores) > 2 else 0.07,
            "prob_over_25": prob_over_25,
            "prob_under_25": prob_under_25,
            "prob_btts_yes": prob_btts_yes,
            "prob_btts_no": prob_btts_no,
            "confidence_score": confidence,
            "feature_importance": json.dumps({
                "elo_diff": abs(elo_diff) / 100,
                "form_diff": abs(form_diff) / 10,
                "home_advantage": home_advantage,
                "expected_goals": total_expected
            })
        }

    async def predict(
        self,
        home_team: Team,
        away_team: Team,
        db: AsyncSession,
        match_date: datetime
    ) -> MatchPrediction:
        """Predict match outcome."""
        # Build features
        features = await feature_engineer.build_features(home_team, away_team, db, match_date)

        if self.is_trained and self.model_1x2 is not None:
            # Use trained models
            X = feature_engineer.get_feature_vector(features)

            # 1X2 prediction
            probs_1x2 = self.model_1x2.predict_proba(X)[0]
            prob_home, prob_draw, prob_away = probs_1x2[0], probs_1x2[1], probs_1x2[2]

            # Score prediction
            score_probs = self.model_score.predict_proba(X)[0]
            score_classes = self.model_score.classes_
            top_score_idx = np.argsort(score_probs)[-3:][::-1]
            pred_scores = [(score_classes[i], score_probs[i]) for i in top_score_idx]

            # Over/Under
            prob_over = self.model_over_under.predict_proba(X)[0][1]
            prob_under = 1 - prob_over

            # BTTS
            prob_btts = self.model_btts.predict_proba(X)[0][1]
            prob_no_btts = 1 - prob_btts

            # Feature importance (if available)
            if hasattr(self.model_1x2, 'feature_importances_'):
                importance = dict(zip(feature_engineer.feature_names, self.model_1x2.feature_importances_))
            else:
                importance = {}

            confidence = max(prob_home, prob_draw, prob_away) * 100

            return MatchPrediction(
                match_id=0,  # Will be set by caller
                model_version=self.model_version,
                prob_home_win=prob_home,
                prob_draw=prob_draw,
                prob_away_win=prob_away,
                predicted_score_1=pred_scores[0][0] if pred_scores else "1-1",
                prob_score_1=pred_scores[0][1] if pred_scores else 0.1,
                predicted_score_2=pred_scores[1][0] if len(pred_scores) > 1 else "1-0",
                prob_score_2=pred_scores[1][1] if len(pred_scores) > 1 else 0.08,
                predicted_score_3=pred_scores[2][0] if len(pred_scores) > 2 else "2-1",
                prob_score_3=pred_scores[2][1] if len(pred_scores) > 2 else 0.07,
                prob_over_25=prob_over,
                prob_under_25=prob_under,
                prob_btts_yes=prob_btts,
                prob_btts_no=prob_no_btts,
                confidence_score=confidence,
                feature_importance=json.dumps(importance)
            )
        else:
            # Use mock prediction
            mock = self.get_mock_prediction(features)
            return MatchPrediction(
                match_id=0,
                model_version=self.model_version,
                **mock
            )


predictor = FootballPredictor()


async def predict_match(
    home_team: Team,
    away_team: Team,
    db: AsyncSession,
    match_date: datetime
) -> MatchPrediction:
    """Main prediction function."""
    return await predictor.predict(home_team, away_team, db, match_date)