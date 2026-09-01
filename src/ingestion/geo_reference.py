"""
Geographic Reference Data for Indian States, Union Territories, and Major Districts.
Used for GIS mapping, regional clustering, and centroid lookups when precise GPS coordinates
are not present in raw work records.
"""

from typing import Dict, Any, Optional, Tuple

# Comprehensive State & UT Centroids (Latitude, Longitude)
STATE_COORDINATES: Dict[str, Tuple[float, float]] = {
    "Andhra Pradesh": (15.9129, 79.7400),
    "Arunachal Pradesh": (28.2180, 94.7278),
    "Assam": (26.2006, 92.9376),
    "Bihar": (25.0961, 85.3131),
    "Chhattisgarh": (21.2787, 81.8661),
    "Goa": (15.2993, 74.1240),
    "Gujarat": (22.2587, 71.1924),
    "Haryana": (29.0588, 76.0856),
    "Himachal Pradesh": (31.1048, 77.1734),
    "Jharkhand": (23.6102, 85.2799),
    "Karnataka": (15.3173, 75.7139),
    "Kerala": (10.8505, 76.2711),
    "Madhya Pradesh": (22.9734, 78.6569),
    "Maharashtra": (19.7515, 75.7139),
    "Manipur": (24.6637, 93.9063),
    "Meghalaya": (25.4670, 91.3662),
    "Mizoram": (23.1645, 92.9376),
    "Nagaland": (26.1584, 94.5624),
    "Odisha": (20.9517, 85.0985),
    "Punjab": (31.1471, 75.3412),
    "Rajasthan": (27.0238, 74.2179),
    "Sikkim": (27.5330, 88.5122),
    "Tamil Nadu": (11.1271, 78.6569),
    "Telangana": (18.1124, 79.0193),
    "Tripura": (23.9408, 91.9882),
    "Uttar Pradesh": (26.8467, 80.9462),
    "Uttarakhand": (30.0668, 79.0193),
    "West Bengal": (22.9868, 87.8550),
    "Andaman And Nicobar Islands": (11.7401, 92.6586),
    "Chandigarh": (30.7333, 76.7794),
    "Dadra And Nagar Haveli And Daman And Diu": (20.4283, 72.8397),
    "Delhi": (28.7041, 77.1025),
    "Jammu And Kashmir": (33.7782, 76.5762),
    "Ladakh": (34.1526, 77.5771),
    "Lakshadweep": (10.5667, 72.6417),
    "Puducherry": (11.9416, 79.8083)
}

# Major District & IDA Centroid Coordinates
DISTRICT_COORDINATES: Dict[str, Tuple[float, float]] = {
    # Uttar Pradesh
    "Varanasi": (25.3176, 82.9739),
    "Lucknow": (26.8467, 80.9462),
    "Kanpur Nagar": (26.4499, 80.3319),
    "Gorakhpur": (26.7606, 83.3732),
    "Prayagraj": (25.4358, 81.8463),
    "Agra": (27.1767, 78.0081),
    "Meerut": (28.9845, 77.7064),
    "Ghaziabad": (28.6692, 77.4538),
    "Gautam Buddha Nagar": (28.5355, 77.3910),
    "Ayodhya": (26.7922, 82.1998),
    
    # Maharashtra
    "Mumbai": (19.0760, 72.8777),
    "Mumbai Suburban": (19.1136, 72.8697),
    "Pune": (18.5204, 73.8567),
    "Nagpur": (21.1458, 79.0882),
    "Thane": (19.2183, 72.9781),
    "Nashik": (19.9975, 73.7898),
    "Aurangabad": (19.8762, 75.3433),
    "Solapur": (17.6599, 75.9064),
    
    # Karnataka
    "Bengaluru Urban": (12.9716, 77.5946),
    "Bengaluru Rural": (13.2247, 77.5619),
    "Mysuru": (12.2958, 76.6394),
    "Dharwad": (15.4589, 75.0078),
    "Belagavi": (15.8497, 74.4977),
    "Dakshina Kannada": (12.8700, 74.8800),
    
    # Tamil Nadu
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Salem": (11.6643, 78.1460),
    
    # Andhra Pradesh
    "Visakhapatnam": (17.6868, 83.2185),
    "Vijayawada": (16.5062, 80.6480),
    "Guntur": (16.3067, 80.4365),
    "Tirupati": (13.6288, 79.4192),
    "Anantapur": (14.6819, 77.6006),
    
    # Telangana
    "Hyderabad": (17.3850, 78.4867),
    "Ranga Reddy": (17.3000, 78.5000),
    "Warangal": (17.9689, 79.5941),
    "Medak": (18.0478, 78.2618),
    
    # West Bengal
    "Kolkata": (22.5726, 88.3639),
    "North 24 Parganas": (22.7167, 88.5167),
    "South 24 Parganas": (22.1667, 88.4333),
    "Howrah": (22.5958, 88.2636),
    "Darjeeling": (27.0410, 88.2663),
    
    # Bihar
    "Patna": (25.5941, 85.1376),
    "Gaya": (24.7914, 85.0002),
    "Muzaffarpur": (26.1209, 85.3647),
    "Bhagalpur": (25.2425, 86.9842),
    
    # Rajasthan
    "Jaipur": (26.9124, 75.7873),
    "Jodhpur": (26.2389, 73.0243),
    "Udaipur": (24.5854, 73.7125),
    "Kota": (25.2138, 75.8648),
    
    # Madhya Pradesh
    "Bhopal": (23.2599, 77.4126),
    "Indore": (22.7196, 75.8577),
    "Gwalior": (26.2183, 78.1828),
    "Jabalpur": (23.1815, 79.9864),
    
    # Gujarat
    "Ahmedabad": (23.0225, 72.5714),
    "Surat": (21.1702, 72.8311),
    "Vadodara": (22.3072, 73.1812),
    "Rajkot": (22.3039, 70.8022),
    
    # Kerala
    "Thiruvananthapuram": (8.5241, 76.9366),
    "Ernakulam": (9.9816, 76.2999),
    "Kozhikode": (11.2588, 75.7804),
    
    # Punjab & Haryana
    "Amritsar": (31.6340, 74.8723),
    "Ludhiana": (30.9010, 75.8573),
    "Gurugram": (28.4595, 77.0266),
    "Faridabad": (28.4089, 77.3178),
    
    # Odisha
    "Khordha": (20.1746, 85.6186),
    "Bhubaneswar": (20.2961, 85.8245),
    "Cuttack": (20.4625, 85.8828),
    
    # Assam
    "Kamrup Metropolitan": (26.1445, 91.7362),
    "Guwahati": (26.1445, 91.7362),
    "Dibrugarh": (27.4728, 94.9120),
    
    # Delhi NCT
    "New Delhi": (28.6139, 77.2090),
    "South Delhi": (28.5244, 77.2066),
    "East Delhi": (28.6279, 77.2784),
    "North Delhi": (28.7041, 77.1025)
}


def get_coordinates(state: Optional[str], district: Optional[str] = None) -> Tuple[float, float]:
    """
    Returns (latitude, longitude) coordinates for a given state and district.
    Falls back from District -> State -> India Centroid (20.5937, 78.9629).
    """
    if district and district in DISTRICT_COORDINATES:
        return DISTRICT_COORDINATES[district]
    
    # Fuzzy district match
    if district:
        for d_name, coords in DISTRICT_COORDINATES.items():
            if d_name.lower() in district.lower() or district.lower() in d_name.lower():
                return coords
                
    if state and state in STATE_COORDINATES:
        return STATE_COORDINATES[state]
        
    # Fuzzy state match
    if state:
        for s_name, coords in STATE_COORDINATES.items():
            if s_name.lower() in state.lower() or state.lower() in s_name.lower():
                return coords
                
    # Default India geographic center
    return (20.5937, 78.9629)
