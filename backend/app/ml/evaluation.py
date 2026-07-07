import numpy as np
from typing import Dict, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.models import Match, MatchPrediction, Team


async def evaluate_model(db: AsyncSession) -> Dict:
    """Evaluate model performance on recent matches."""
    # Get matches with predictions and actual results
    query = select(Match, MatchPrediction).join(
        MatchPrediction, Match.id == MatchPrediction.match_id
    ).where(
        and_(
            Match.status == "finished",
            Match.home_score.is_not(None),
            Match.away_score.is_not(None)
        )
    ).order_by(Match.match_date.desc()).limit(500)

    result = await db.execute(query)
    matches_with_predictions = result.all()

    if not matches_with_predictions:
        return {
            "accuracy": 0.0,
            "log_loss": 0.0,
            "confusion_matrix": [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            "class_precision": [0.0, 0.0, 0.0],
            "class_recall": [0.0, 0.0, 0.0],
            "class_f1": [0.0, 0.0, 0.0],
            "roi_flat_stake": 0.0,
            "total_predictions": 0,
            "correct_predictions": 0,
            "last_updated": datetime.utcnow()
        }

    correct = 0
    total = len(matches_with_predictions)
    y_true = []
    y_pred = []
    y_proba = []
    roi_total = 0.0

    for match, prediction in matches_with_predictions:
        # Actual result
        if match.home_score > match.away_score:
            actual = 0  # Home win
        elif match.home_score == match.away_score:
            actual = 1  # Draw
        else:
            actual = 2  # Away win

        # Predicted result
        probs = [prediction.prob_home_win, prediction.prob_draw, prediction.prob_away_win]
        predicted = np.argmax(probs)

        y_true.append(actual)
        y_pred.append(predicted)
        y_proba.append(probs)

        if actual == predicted:
            correct += 1

        # ROI calculation (flat stake of 1 unit)
        if actual == 0 and match.odd_home:
            roi_total += match.odd_home - 1
        elif actual == 1 and match.odd_draw:
            roi_total += match.odd_draw - 1
        elif actual == 2 and match.odd_away:
            roi_total += match.odd_away - 1
        else:
            roi_total -= 1  # Lost stake

    # Calculate metrics
    accuracy = correct / total if total > 0 else 0

    # Log loss
    y_proba = np.array(y_proba)
    y_true_np = np.array(y_true)
    log_loss_val = -np.mean(np.log(y_proba[np.arange(len(y_true)), y_true_np] + 1e-15))

    # Confusion matrix
    from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, labels=[0, 1, 2], average=None)

    roi = roi_total / total if total > 0 else 0

    return {
        "accuracy": accuracy,
        "log_loss": float(log_loss_val),
        "confusion_matrix": cm.tolist(),
        "class_precision": prec.tolist(),
        "class_recall": rec.tolist(),
        "class_f1": f1.tolist(),
        "roi_flat_stake": float(roi),
        "total_predictions": total,
        "correct_predictions": correct,
        "last_updated": datetime.utcnow()
    }