import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import { MapPin, ShieldAlert, Layers, Filter, Camera } from 'lucide-react';
import { CitizenEvidenceModal } from './CitizenEvidenceModal';
import { useTheme } from './ThemeProvider';

interface MarkerData {
  work_id: string;
  description: string;
  state: string;
  district: string;
  sector: string;
  latitude: number;
  longitude: number;
  composite_risk_score: number;
  risk_level: string;
  sanctioned_amount: number;
  total_expenditure: number;
  status: string;
}

// Controller component to smoothly pan/zoom to selected state
const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

export const GisMap: React.FC = () => {
  const { theme } = useTheme();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [center, setCenter] = useState<[number, number]>([22.5, 79.5]);
  const [zoom, setZoom] = useState<number>(5);
  const [evidenceWorkModal, setEvidenceWorkModal] = useState<any | null>(null);

  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const res = await axios.get('/api/map/markers');
        setMarkers(res.data);
      } catch (e) {
        console.error('Failed to load GIS markers:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMarkers();
  }, []);

  const filteredMarkers = markers.filter((m) => {
    if (filterRisk === 'HIGH') return m.risk_level === 'HIGH';
    if (filterRisk === 'MEDIUM') return m.risk_level === 'MEDIUM';
    if (filterRisk === 'LOW') return m.risk_level === 'LOW';
    return true;
  });

  const getMarkerColor = (level: string) => {
    if (level === 'HIGH') return '#ef4444'; // Red
    if (level === 'MEDIUM') return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  const handleStateJump = (stateName: string) => {
    const stateCoords: Record<string, [number, number]> = {
      'Uttar Pradesh': [26.8467, 80.9462],
      'Maharashtra': [19.7515, 75.7139],
      'Karnataka': [15.3173, 75.7139],
      'Tamil Nadu': [11.1271, 78.6569],
      'Bihar': [25.0961, 85.3131],
      'Andhra Pradesh': [15.9129, 79.7400],
      'Delhi': [28.7041, 77.1025],
      'National Overview': [22.5, 79.5]
    };
    if (stateCoords[stateName]) {
      setCenter(stateCoords[stateName]);
      setZoom(stateName === 'National Overview' ? 5 : 7);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
      
      {/* Top Header & Map Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center">
            <MapPin className="w-5 h-5 text-emerald-600 mr-2" />
            National Geospatial Risk Intelligence Map
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Plotting {filteredMarkers.length} geocoded infrastructure works with color-coded risk markers
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <select
            onChange={(e) => handleStateJump(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="National Overview">🇮🇳 All India (National)</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Bihar">Bihar</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Delhi">Delhi NCT</option>
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilterRisk('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filterRisk === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterRisk('HIGH')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1 ${
                filterRisk === 'HIGH' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>High Risk</span>
            </button>
            <button
              onClick={() => setFilterRisk('MEDIUM')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center space-x-1 ${
                filterRisk === 'MEDIUM' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-200"></span>
              <span>Medium</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mr-2"></div>
            Loading GIS coordinates & spatial centroids...
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <ChangeMapView center={center} zoom={zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url={
                theme === 'dark'
                  ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
            />

            {filteredMarkers.map((m, idx) => (
              <CircleMarker
                key={idx}
                center={[m.latitude, m.longitude]}
                radius={m.risk_level === 'HIGH' ? 8 : m.risk_level === 'MEDIUM' ? 6 : 4}
                pathOptions={{
                  color: getMarkerColor(m.risk_level),
                  fillColor: getMarkerColor(m.risk_level),
                  fillOpacity: 0.8,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs max-w-xs font-sans text-slate-800">
                    <div className="font-bold font-mono">{m.work_id}</div>
                    <div className="text-slate-600 leading-snug">{m.description}</div>
                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">{m.district}, {m.state}</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        m.risk_level === 'HIGH' ? 'bg-red-100 text-red-800' :
                        m.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {m.risk_level} ({m.composite_risk_score})
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Budget: ₹{(m.sanctioned_amount / 1e5).toFixed(1)}L</span>
                      <span>Spent: ₹{(m.total_expenditure / 1e5).toFixed(1)}L</span>
                    </div>

                    <button
                      onClick={() => setEvidenceWorkModal(m)}
                      className="w-full mt-2 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold border border-indigo-200 flex items-center justify-center space-x-1 transition"
                    >
                      <Camera className="w-3 h-3 text-indigo-600" />
                      <span>Submit Ground Evidence</span>
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">Risk Legend</span>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">High Risk (Score ≥ 70)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">Medium Risk (Score 40 - 69)</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">Low Risk / Compliant</span>
          </div>
        </div>

      </div>

      {/* Citizen Evidence Modal */}
      {evidenceWorkModal && (
        <CitizenEvidenceModal
          isOpen={Boolean(evidenceWorkModal)}
          onClose={() => setEvidenceWorkModal(null)}
          prefilledWork={{
            work_id: evidenceWorkModal.work_id,
            work_description: evidenceWorkModal.description,
            latitude: evidenceWorkModal.latitude,
            longitude: evidenceWorkModal.longitude
          }}
        />
      )}

    </div>
  );
};
