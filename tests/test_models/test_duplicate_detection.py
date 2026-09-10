"""
Regression test for sentence-embedding enhanced duplicate detection.
Verifies that semantically similar but differently-worded descriptions
now score above the duplicate threshold.
"""
import pytest
import numpy as np

def test_semantic_duplicate_detection():
    """Two differently-worded but semantically identical work descriptions
    should score above the duplicate threshold with embeddings."""
    try:
        from src.utils.embeddings import embed_texts
    except ImportError:
        pytest.skip("sentence-transformers not installed")
    
    desc_a = "Construction of community hall for public gatherings"
    desc_b = "Building of village meeting center for community events"
    
    embeddings = embed_texts([desc_a, desc_b])
    if embeddings is None:
        pytest.skip("Embedding model not available")
    
    # Cosine similarity (embeddings are normalized)
    similarity = float(np.dot(embeddings[0], embeddings[1]))
    
    # These are semantically similar - embedding cosine should be > 0.5
    assert similarity > 0.5, f"Expected semantic similarity > 0.5, got {similarity:.4f}"
    
    # With TF-IDF alone, these would have very low similarity due to different words
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    vectorizer = TfidfVectorizer(ngram_range=(1, 3), stop_words="english")
    tfidf = vectorizer.fit_transform([desc_a, desc_b])
    tfidf_sim = float(cosine_similarity(tfidf[0:1], tfidf[1:2])[0, 0])
    
    # TF-IDF should be significantly lower than embedding similarity
    assert similarity > tfidf_sim, (
        f"Embedding similarity ({similarity:.4f}) should exceed TF-IDF similarity ({tfidf_sim:.4f}) "
        f"for semantically similar but lexically different descriptions"
    )
