"""
Shared Embedding Utility for MPLADS AI Platform.
Provides sentence embeddings using all-MiniLM-L6-v2 (CPU-friendly, no GPU required)
for both duplicate work detection and RAG policy retrieval.
"""
import logging
import numpy as np
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

_embedding_model = None
_model_available = None

def _load_model():
    global _embedding_model, _model_available
    if _model_available is not None:
        return _model_available
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        _model_available = True
        logger.info("Sentence-transformers model (all-MiniLM-L6-v2) loaded successfully.")
    except Exception as e:
        logger.warning(f"sentence-transformers not available: {e}. Embedding features disabled.")
        _model_available = False
    return _model_available

def embed_texts(texts: List[str], cache_path: Optional[Path] = None) -> Optional[np.ndarray]:
    """Embed a list of texts. Optionally cache to disk."""
    if cache_path and cache_path.exists():
        try:
            cached = np.load(str(cache_path))
            if cached.shape[0] == len(texts):
                logger.info(f"Loaded cached embeddings from {cache_path} ({cached.shape})")
                return cached
        except Exception:
            pass
    
    if not _load_model():
        return None
    
    embeddings = _embedding_model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    embeddings = np.array(embeddings, dtype=np.float32)
    
    if cache_path:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(str(cache_path), embeddings)
        logger.info(f"Cached {len(texts)} embeddings to {cache_path}")
    
    return embeddings

def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between two embedding matrices."""
    # Assume normalized (from sentence-transformers with normalize_embeddings=True)
    return a @ b.T

def cosine_similarity_query(query_embedding: np.ndarray, corpus_embeddings: np.ndarray) -> np.ndarray:
    """Compute cosine similarity between a single query and a corpus."""
    return corpus_embeddings @ query_embedding.T

def embed_single(text: str) -> Optional[np.ndarray]:
    """Embed a single text string."""
    if not _load_model():
        return None
    return _embedding_model.encode([text], normalize_embeddings=True)[0]

# --- RAG Policy Retrieval ---

_policy_chunks: Optional[List[str]] = None
_policy_embeddings: Optional[np.ndarray] = None
_policy_sources: Optional[List[str]] = None

def _load_policy_chunks() -> tuple:
    """Load and chunk the policy reference document."""
    global _policy_chunks, _policy_embeddings, _policy_sources
    if _policy_chunks is not None:
        return _policy_chunks, _policy_embeddings, _policy_sources
    
    policy_path = PROJECT_ROOT / "docs" / "POLICY_REFERENCE.md"
    if not policy_path.exists():
        logger.warning(f"Policy reference not found at {policy_path}")
        _policy_chunks = []
        _policy_sources = []
        return _policy_chunks, None, _policy_sources
    
    text = policy_path.read_text(encoding="utf-8")
    
    # Split by section headers (## or ###)
    import re
    sections = re.split(r'\n(?=#{2,3} )', text)
    
    chunks = []
    sources = []
    for section in sections:
        section = section.strip()
        if len(section) < 50:  # Skip too-short sections
            continue
        # Extract the header as source reference
        lines = section.split('\n')
        header = lines[0].lstrip('#').strip() if lines else "MPLADS Policy"
        body = '\n'.join(lines[1:]).strip()
        if body:
            chunks.append(f"{header}: {body}")
            sources.append(header)
    
    _policy_chunks = chunks
    _policy_sources = sources
    
    # Embed chunks
    cache_path = MODELS_DIR / "policy_embeddings.npy"
    _policy_embeddings = embed_texts(chunks, cache_path=cache_path)
    
    logger.info(f"Loaded {len(chunks)} policy chunks for RAG retrieval.")
    return _policy_chunks, _policy_embeddings, _policy_sources

def retrieve_policy_chunks(query: str, top_k: int = 3, threshold: float = 0.3) -> List[dict]:
    """Retrieve the most relevant policy chunks for a given query."""
    chunks, embeddings, sources = _load_policy_chunks()
    
    if not chunks or embeddings is None:
        return []
    
    query_emb = embed_single(query)
    if query_emb is None:
        return []
    
    # Cosine similarity
    scores = cosine_similarity_query(query_emb, embeddings).flatten()
    
    # Get top-k above threshold
    top_indices = np.argsort(scores)[::-1][:top_k]
    results = []
    for idx in top_indices:
        score = float(scores[idx])
        if score >= threshold:
            results.append({
                "document": "MPLADS Guidelines 2016 / GFR 2017",
                "section": sources[idx],
                "content": chunks[idx],
                "relevance_score": round(score, 4)
            })
    
    return results
