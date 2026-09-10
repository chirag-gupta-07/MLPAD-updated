"""
Construction Stage Classifier for Citizen Evidence Photos.
Uses zero-shot CLIP classification as primary, Gemini Vision as optional high-accuracy,
and heuristic fallback for offline resilience.
"""
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)

CONSTRUCTION_STAGES = [
    "EMPTY_SITE",
    "FOUNDATION", 
    "STRUCTURE_IN_PROGRESS",
    "FINISHING",
    "COMPLETED_OPERATIONAL",
    "NOT_CONSTRUCTION"
]

CLIP_PROMPTS = {
    "EMPTY_SITE": ["an empty barren construction site with no building", "vacant land with weeds and bare soil", "undeveloped empty plot of land"],
    "FOUNDATION": ["a building foundation being constructed with concrete", "excavation and foundation work at construction site", "concrete foundation pillars and base structure"],
    "STRUCTURE_IN_PROGRESS": ["a building under construction with walls and columns", "construction in progress with scaffolding and workers", "partially built structure with exposed brickwork"],
    "FINISHING": ["a nearly complete building with finishing touches", "construction almost done with painting and fixtures", "building in final stage of completion with plastering"],
    "COMPLETED_OPERATIONAL": ["a completed and operational public building", "finished construction being used by people", "fully built infrastructure in active use"],
    "NOT_CONSTRUCTION": ["a random photo not related to construction", "nature scene or indoor photo", "document or text image"]
}

_clip_model = None
_clip_processor = None
_clip_available = None

def _load_clip():
    global _clip_model, _clip_processor, _clip_available
    if _clip_available is not None:
        return _clip_available
    try:
        from transformers import CLIPModel, CLIPProcessor
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_available = True
        logger.info("CLIP model loaded successfully for construction stage classification.")
    except Exception as e:
        logger.warning(f"CLIP model not available: {e}. Will use Gemini or fallback.")
        _clip_available = False
    return _clip_available

def classify_with_clip(image: Image.Image) -> Tuple[str, float, Dict[str, float]]:
    """Zero-shot CLIP classification into construction stages."""
    if not _load_clip():
        raise RuntimeError("CLIP not available")
    
    import torch
    
    # Build flat list of prompts and map back to stages
    all_prompts = []
    prompt_to_stage = []
    for stage, prompts in CLIP_PROMPTS.items():
        for p in prompts:
            all_prompts.append(p)
            prompt_to_stage.append(stage)
    
    inputs = _clip_processor(text=all_prompts, images=image, return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = _clip_model(**inputs)
        logits = outputs.logits_per_image[0]  # shape: [num_prompts]
        probs = logits.softmax(dim=0).cpu().numpy()
    
    # Aggregate probabilities per stage
    stage_scores = {}
    for i, prob in enumerate(probs):
        stage = prompt_to_stage[i]
        stage_scores[stage] = stage_scores.get(stage, 0.0) + float(prob)
    
    # Normalize
    total = sum(stage_scores.values())
    stage_scores = {k: round(v / total * 100, 1) for k, v in stage_scores.items()}
    
    best_stage = max(stage_scores, key=stage_scores.get)
    confidence = stage_scores[best_stage]
    
    return best_stage, confidence, stage_scores

def classify_with_gemini(image_path: str) -> Tuple[str, float, Dict[str, float]]:
    """Gemini Vision classification as optional higher-accuracy path."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    
    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)
        
        img = Image.open(image_path)
        prompt = (
            "Analyze this construction site photo. Classify it into exactly ONE of these stages:\n"
            "- EMPTY_SITE: No construction, bare ground/weeds\n"
            "- FOUNDATION: Foundation/excavation work visible\n"
            "- STRUCTURE_IN_PROGRESS: Walls/columns/scaffolding visible\n"
            "- FINISHING: Nearly complete, painting/fixtures\n"
            "- COMPLETED_OPERATIONAL: Fully built and in use\n"
            "- NOT_CONSTRUCTION: Not a construction photo\n\n"
            "Respond with ONLY the stage name, nothing else."
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, img]
        )
        stage = response.text.strip().upper().replace(" ", "_")
        if stage in CONSTRUCTION_STAGES:
            return stage, 85.0, {stage: 85.0}
        return "UNVERIFIED", 0.0, {}
    except Exception as e:
        logger.warning(f"Gemini vision classification failed: {e}")
        raise

def classify_construction_stage(image_path: str) -> Dict[str, Any]:
    """Main classification entry point with graceful fallback chain."""
    result = {
        "classified_stage": "UNVERIFIED",
        "confidence": 0.0,
        "stage_scores": {},
        "method": "none",
        "error": None
    }
    
    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        result["error"] = f"Could not open image: {e}"
        return result
    
    # Try CLIP first (primary - works offline)
    try:
        stage, confidence, scores = classify_with_clip(img)
        result.update({
            "classified_stage": stage,
            "confidence": confidence,
            "stage_scores": scores,
            "method": "clip_zero_shot"
        })
        return result
    except Exception as clip_err:
        logger.info(f"CLIP classification unavailable: {clip_err}")
    
    # Try Gemini (optional high-accuracy)
    try:
        stage, confidence, scores = classify_with_gemini(image_path)
        result.update({
            "classified_stage": stage,
            "confidence": confidence,
            "stage_scores": scores,
            "method": "gemini_vision"
        })
        return result
    except Exception as gemini_err:
        logger.info(f"Gemini classification unavailable: {gemini_err}")
    
    # Fallback - mark as unverified
    result["method"] = "fallback_unverified"
    result["error"] = "No CV backend available (CLIP not installed, Gemini API key not set)"
    return result
