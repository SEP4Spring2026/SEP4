from typing import List, Tuple, Any

def evaluate_and_sort_models(
    models: List[Any],
    X_test: Any,
    y_test: Any,
) -> List[Tuple[Any, float]]:
    """
    Evaluate models with .score() and return them sorted by accuracy (high to low).

    Args:
        models: A list of trained ML models (must have a .score() method).
        X_test: The test data features.
        y_test: The true labels for the test data.

    Returns:
        A list of tuples (model, accuracy_score) sorted from highest to lowest accuracy.
    """
    evaluated_models = [(model, model.score(X_test, y_test)) for model in models]
    return sorted(evaluated_models, key=lambda x: x[1], reverse=True)
