"""
Contractor–Agency–MP Relationship Graph Anomaly Detection.
Builds a networkx graph to detect over-concentration, bid rotation,
and tightly connected contractor/agency clusters.
"""
import logging
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

try:
    import networkx as nx
    from networkx.algorithms.community import greedy_modularity_communities
    NX_AVAILABLE = True
except ImportError:
    NX_AVAILABLE = False
    logger.warning("networkx not installed. Network analysis will be unavailable.")


def build_award_graph(df: pd.DataFrame) -> 'nx.Graph':
    """Build a graph from the works dataframe with contractor/agency/MP/district nodes."""
    if not NX_AVAILABLE:
        raise RuntimeError("networkx not available")
    
    G = nx.Graph()
    
    for _, row in df.iterrows():
        agency = str(row.get("implementing_agency", "")).strip()
        constituency = str(row.get("constituency", "")).strip()
        district = str(row.get("district", "")).strip()
        mp = str(row.get("mp_name", "")).strip()
        amount = float(row.get("sanctioned_amount", 0) or 0)
        
        if not agency or agency in ("Not Specified", "nan", "", "Awaiting Tender Allocation"):
            continue
        
        # Add nodes with types
        if agency and agency not in G:
            G.add_node(agency, type="contractor", total_value=0, work_count=0)
        if constituency and constituency not in G:
            G.add_node(constituency, type="constituency", total_value=0, work_count=0)
        if district and district not in G:
            G.add_node(district, type="district", total_value=0, work_count=0)
        
        # Update node stats
        if agency in G:
            G.nodes[agency]["total_value"] += amount
            G.nodes[agency]["work_count"] += 1
        if constituency in G:
            G.nodes[constituency]["total_value"] += amount
            G.nodes[constituency]["work_count"] += 1
        
        # Add edges: contractor <-> constituency, contractor <-> district
        if agency and constituency:
            if G.has_edge(agency, constituency):
                G[agency][constituency]["weight"] += 1
                G[agency][constituency]["total_value"] += amount
            else:
                G.add_edge(agency, constituency, weight=1, total_value=amount, relation="awarded_in")
        
        if agency and district:
            if G.has_edge(agency, district):
                G[agency][district]["weight"] += 1
                G[agency][district]["total_value"] += amount
            else:
                G.add_edge(agency, district, weight=1, total_value=amount, relation="operates_in")
    
    return G


def compute_network_risk_scores(G: 'nx.Graph') -> Dict[str, Dict[str, Any]]:
    """Compute network_risk_score (0-100) per contractor and per constituency."""
    if not NX_AVAILABLE or len(G) == 0:
        return {}
    
    scores = {}
    
    # Degree centrality
    centrality = nx.degree_centrality(G)
    
    # Community detection
    communities = []
    try:
        communities = list(greedy_modularity_communities(G))
    except Exception:
        pass
    
    # Build community map
    community_map = {}
    for i, comm in enumerate(communities):
        for node in comm:
            community_map[node] = i
    
    # Score contractors
    contractor_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "contractor"]
    
    if not contractor_nodes:
        return {}
    
    # Get max values for normalization
    max_work_count = max((G.nodes[n].get("work_count", 1) for n in contractor_nodes), default=1)
    max_centrality = max((centrality.get(n, 0) for n in contractor_nodes), default=0.001)
    
    for node in contractor_nodes:
        data = G.nodes[node]
        wc = data.get("work_count", 0)
        cent = centrality.get(node, 0)
        
        # Concentration: ratio of works in single constituency vs total
        neighbors = list(G.neighbors(node))
        constituency_neighbors = [n for n in neighbors if G.nodes.get(n, {}).get("type") == "constituency"]
        max_edge_weight = 0
        for cn in constituency_neighbors:
            ew = G[node][cn].get("weight", 0)
            max_edge_weight = max(max_edge_weight, ew)
        
        concentration_ratio = (max_edge_weight / max(wc, 1)) if wc > 0 else 0
        
        # Normalize components
        volume_score = min(100, (wc / max(max_work_count, 1)) * 100)
        centrality_score = min(100, (cent / max(max_centrality, 0.001)) * 100)
        concentration_score = concentration_ratio * 100
        
        # Weighted risk score
        risk = round(
            0.35 * concentration_score +
            0.30 * volume_score +
            0.20 * centrality_score +
            0.15 * (len(constituency_neighbors) < 2) * 80,  # Penalty for operating in only 1 area
            2
        )
        risk = min(100.0, max(0.0, risk))
        
        scores[node] = {
            "node": node,
            "type": "contractor",
            "network_risk_score": risk,
            "work_count": wc,
            "centrality": round(cent, 4),
            "concentration_ratio": round(concentration_ratio, 3),
            "community_id": community_map.get(node),
            "connected_constituencies": len(constituency_neighbors)
        }
    
    # Score constituencies
    const_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "constituency"]
    for node in const_nodes:
        data = G.nodes[node]
        neighbors = list(G.neighbors(node))
        contractor_neighbors = [n for n in neighbors if G.nodes.get(n, {}).get("type") == "contractor"]
        
        # Low diversity = risk (few contractors monopolizing)
        diversity_score = min(100, max(0, 100 - len(contractor_neighbors) * 10))
        
        scores[node] = {
            "node": node,
            "type": "constituency",
            "network_risk_score": round(diversity_score, 2),
            "work_count": data.get("work_count", 0),
            "contractor_count": len(contractor_neighbors),
            "community_id": community_map.get(node)
        }
    
    return scores


_cached_network_data: Optional[Dict[str, Any]] = None


def get_network_graph_data(df: pd.DataFrame) -> Dict[str, Any]:
    """Returns graph nodes and edges in a format renderable by the frontend."""
    global _cached_network_data
    if _cached_network_data is not None:
        return _cached_network_data

    if not NX_AVAILABLE:
        return {"available": False, "error": "networkx not installed", "nodes": [], "edges": [], "scores": {}}
    
    try:
        G = build_award_graph(df)
        scores = compute_network_risk_scores(G)
        
        nodes = []
        for n, data in G.nodes(data=True):
            node_info = {
                "id": n,
                "label": n,
                "type": data.get("type", "unknown"),
                "work_count": data.get("work_count", 0),
                "total_value": data.get("total_value", 0),
                "network_risk_score": scores.get(n, {}).get("network_risk_score", 0)
            }
            nodes.append(node_info)
        
        edges = []
        for u, v, data in G.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "weight": data.get("weight", 1),
                "total_value": data.get("total_value", 0),
                "relation": data.get("relation", "")
            })
        
        # Sort nodes by risk
        nodes.sort(key=lambda x: x["network_risk_score"], reverse=True)
        
        result = {
            "available": True,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "nodes": nodes[:100],  # Limit to top 100 for frontend perf
            "edges": edges[:200],
            "scores": {k: v for k, v in list(scores.items())[:50]}
        }
        _cached_network_data = result
        return result
    except Exception as e:
        logger.error(f"Network analysis failed: {e}")
        return {"available": False, "error": str(e), "nodes": [], "edges": [], "scores": {}}
