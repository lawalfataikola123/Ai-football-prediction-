import numpy as np
import pandas as pd
from typing import List, Tuple, Dict
from datetime import datetime, timedelta
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, log_loss, confusion_matrix, precision_recall_fscore_support
import joblib
import os

from app.models.match import Match, Team, TeamStats, MatchStats
from app.ml.features import feature_engineer


class ModelTrainer:
    def __init__(self):
        self.model_1x2 = None
        self.model_score = None
        self.model_over_under = None
        self.model_btts = None
        self.model_version = "1.0.0"
        self.model_path = os.getenv("MODEL_PATH", "/app/models")

    async def prepare_training_data(self, db: AsyncSession, seasons: List[int], limit: int = 5000) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data from historical matches."""
        # Get finished matches with scores
        query = select(Match).where(
            and_(
                Match.status == "finished",
                Match.home_score.is_not(None),
                Match.away_score.is_not(None),
            )
        ).order_by(Match.match_date.desc()).limit(limit)

        result = await db.execute(query)
        matches = result.scalars().all()

        X_list = []
        y_1x2 = []
        y_score = []
        y_over_under = []
        y_btts = []

        for match in matches:
            # Get teams
            home_team_query = select(Team).where(Team.id == match.home_team_id)
            away_team_query = select(Team).where(Team.id == match.away_team_id)

            home_team_result = await db.execute(home_team_query)
            away_team_result = await db.execute(away_team_query)

            home_team = home_team_result.scalar_one_or_none()
            away_team = away_team_result.scalar_one_or_none()

            if not home_team or not away_team:
                continue

            # Build features
            try:
                features = await feature_engineer.build_features(home_team, away_team, db, match.match_date)
                X_list.append([features[name] for name in feature_engineer.feature_names])

                # 1X2 target
                if match.home_score > match.away_score:
                    y_1x2.append(0)  # Home win
                elif match.home_score == match.away_score:
                    y_1x2.append(1)  # Draw
                else:
                    y_1x2.append(2)  # Away win

                # Score target
                y_score.append(f"{match.home_score}-{match.away_score}")

                # Over/Under 2.5
                total_goals = match.home_score + match.away_score
                y_over_under.append(1 if total_goals > 2.5 else 0)

                # BTTS
                y_btts.append(1 if match.home_score > 0 and match.away_score > 0 else 0)

            except Exception as e:
                print(f"Error processing match {match.id}: {e}")
                continue

        if len(X_list) < 100:
            print("Insufficient training data, generating synthetic data")
            return self.generate_synthetic_data(1000)

        X = np.array(X_list)
        y_1x2 = np.array(y_1x2)
        y_score = np.array(y_score)
        y_over_under = np.array(y_over_under)
        y_btts = np.array(y_btts)

        return X, y_1x2, y_score, y_over_under, y_btts

    def generate_synthetic_data(self, n_samples: int = 1000) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Generate synthetic training data for development."""
        np.random.seed(42)
        n_features = len(feature_engineer.feature_names)

        X = np.random.randn(n_samples, n_features)
        X = np.abs(X) * 10  # Make positive

        # Create realistic patterns
        X[:, 2] = X[:, 0] - X[:, 1]  # elo_diff
        X[:, 5] = X[:, 3] - X[:, 4]  # form_diff

        # Targets
        y_1x2 = np.random.choice([0, 1, 2], n_samples, p=[0.45, 0.25, 0.30])

        # Score targets (simplified)
        scores = ["0-0", "1-0", "0-1", "1-1", "2-0", "0-2", "2-1", "1-2", "2-2", "3-0", "0-3", "3-1", "1-3"]
        y_score = np.random.choice(scores, n_samples)

        # Over/Under
        y_over_under = np.random.choice([0, 1], n_samples, p=[0.55, 0.45])

        # BTTS
        y_btts = np.random.choice([0, 1], n_samples, p=[0.48, 0.52])

        return X, y_1x2, y_score, y_over_under, y_btts

    def train_models(
        self,
        X: np.ndarray,
        y_1x2: np.ndarray,
        y_score: np.ndarray,
        y_over_under: np.ndarray,
        y_btts: np.ndarray
    ):
        """Train all models."""
        print("Training 1X2 model...")
        self.model_1x2 = GradientBoostingClassifier(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        self.model_1x2.fit(X, y_1x2)

        print("Training Score model...")
        self.model_score = RandomForestClassifier(
            n_estimators=300,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.model_score.fit(X, y_score)

        print("Training Over/Under model...")
        self.model_over_under = GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.model_over_under.fit(X, y_over_under)

        print("Training BTTS model...")
        self.model_btts = GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.model_btts.fit(X, y_btts)

    def evaluate_models(
        self,
        X_test: np.ndarray,
        y_1x2_test: np.ndarray,
        y_score_test: np.ndarray,
        y_over_under_test: np.ndarray,
        y_btts_test: np.ndarray
    ) -> Dict:
        """Evaluate all models."""
        results = {}

        # 1X2
        y_1x2_pred = self.model_1x2.predict(X_test)
        y_1x2_proba = self.model_1x2.predict_proba(X_test)
        results["1x2_accuracy"] = accuracy_score(y_1x2_test, y_1x2_pred)
        results["1x2_log_loss"] = log_loss(y_1x2_test, y_1x2_proba)
        results["1x2_confusion_matrix"] = confusion_matrix(y_1x2_test, y_1x2_pred).tolist()
        prec, rec, f1, _ = precision_recall_fscore_support(y_1x2_test, y_1x2_pred, average=None)
        results["1x2_precision"] = prec.tolist()
        results["1x2_recall"] = rec.tolist()
        results["1x2_f1"] = f1.tolist()

        # Score
        y_score_pred = self.model_score.predict(X_test)
        y_score_proba = self.model_score.predict_proba(X_test)
        results["score_accuracy"] = accuracy_score(y_score_test, y_score_pred)
        results["score_log_loss"] = log_loss(y_score_test, y_score_proba)

        # Over/Under
        y_ou_pred = self.model_over_under.predict(X_test)
        y_ou_proba = self.model_over_under.predict_proba(X_test)
        results["over_under_accuracy"] = accuracy_score(y_over_under_test, y_ou_pred)
        results["over_under_log_loss"] = log_loss(y_over_under_test, y_ou_proba)

        # BTTS
        y_btts_pred = self.model_btts.predict(X_test)
        y_btts_proba = self.model_btts.predict_proba(X_test)
        results["btts_accuracy"] = accuracy_score(y_btts_test, y_btts_pred)
        results["btts_log_loss"] = log_loss(y_btts_test, y_btts_proba)

        # Feature importance
        if hasattr(self.model_1x2, 'feature_importances_'):
            results["feature_importance"] = dict(zip(
                feature_engineer.feature_names,
                self.model_1x2.feature_importances_.tolist()
            ))

        return results

    def save_models(self):
        """Save trained models."""
        os.makedirs(self.model_path, exist_ok=True)
        joblib.dump(self.model_1x2, os.path.join(self.model_path, "model_1x2.joblib"))
        joblib.dump(self.model_score, os.path.join(self.model_path, "model_score.joblib"))
        joblib.dump(self.model_over_under, os.path.join(self.model_path, "model_over_under.joblib"))
        joblib.dump(self.model_btts, os.path.join(self.model_path, "model_btts.joblib"))

        # Save metadata
        metadata = {
            "version": self.model_version,
            "features": feature_engineer.feature_names,
            "trained_at": datetime.utcnow().isoformat(),
        }
        with open(os.path.join(self.model_path, "metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"Models saved to {self.model_path}")


async def train_model(db: AsyncSession):
    """Main training function."""
    trainer = ModelTrainer()

    # Prepare data
    seasons = [2020, 2021, 2022, 2023, 2024]
    X, y_1x2, y_score, y_over_under, y_btts = await trainer.prepare_training_data(db, seasons)

    print(f"Training data shape: {X.shape}")

    # Split
    X_train, X_test, y_1x2_train, y_1x2_test = train_test_split(X, y_1x2, test_size=0.2, random_state=42)
    _, _, y_score_train, y_score_test = train_test_split(X, y_score, test_size=0.2, random_state=42)
    _, _, y_ou_train, y_ou_test = train_test_split(X, y_over_under, test_size=0.2, random_state=42)
    _, _, y_btts_train, y_btts_test = train_test_split(X, y_btts, test_size=0.2, random_state=42)

    # Train
    trainer.train_models(X_train, y_1x2_train, y_score_train, y_ou_train, y_btts_train)

    # Evaluate
    results = trainer.evaluate_models(X_test, y_1x2_test, y_score_test, y_ou_test, y_btts_test)

    print("Evaluation Results:")
    for key, value in results.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
        elif isinstance(value, list):
            print(f"  {key}: {value}")

    # Save
    trainer.save_models()

    return results


if __name__ == "__main__":
    import asyncio
    from app.core.database import init_db, async_session_maker

    async def main():
        await init_db()
        async with async_session_maker() as db:
            await train_model(db)

    asyncio.run(main())