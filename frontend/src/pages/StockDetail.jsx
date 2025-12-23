import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, TrendingUp, AlertTriangle, ShieldCheck, Newspaper, Activity } from 'lucide-react';
import StockChart from '../components/StockChart';
import HealthBadge from '../components/HealthBadge';
import NewsList from '../components/NewsList';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const StockDetail = () => {
    const { ticker } = useParams();
    const [stock, setStock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStockData = async (isInitial = true) => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/stocks/${ticker}/`);
                setStock(response.data);
                if (isInitial) setLoading(false);
            } catch (error) {
                console.error('Error fetching stock details:', error);
                if (isInitial) setLoading(false);
            }
        };

        fetchStockData(true);
        const interval = setInterval(() => fetchStockData(false), 5000);

        return () => clearInterval(interval);
    }, [ticker]);

    if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
    if (!stock) return <div className="text-center py-12">Stock not found</div>;

    // Determine colors based on Health Score
    let themeColor = "#4ade80"; // neon-green
    let borderColor = "border-neon-green";
    let textColor = "text-neon-green";
    let shadowColor = "rgba(74, 222, 128, 0.4)";

    if (stock.health_score < 50) {
        themeColor = "#f87171"; // coral-red
        borderColor = "border-coral-red";
        textColor = "text-coral-red";
        shadowColor = "rgba(248, 113, 113, 0.4)";
    } else if (stock.health_score < 70) {
        themeColor = "#eab308"; // yellow-500
        borderColor = "border-yellow-500";
        textColor = "text-yellow-500";
        shadowColor = "rgba(234, 179, 8, 0.4)";
    }

    return (
        <div>
            <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 group">
                <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel p-6 rounded-xl flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight font-mono">{stock.company_name}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-white/10 text-gray-300 px-2 py-1 rounded text-sm font-medium border border-white/10 font-mono">{stock.ticker}</span>
                                <span className="text-gray-400">{stock.sector}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-4xl font-bold font-mono ${textColor} text-shadow-neon`}>₹{stock.current_price}</div>
                            <div className="text-sm text-gray-500 uppercase font-mono tracking-wider mt-1">Current Price</div>
                        </div>
                    </div>

                    <StockChart data={stock.prices} color={themeColor} />

                    <div className="glass-panel p-6 rounded-xl mt-6">
                        <NewsList news={stock.news} />
                    </div>
                </div>

                {/* Sidebar (Right 1 col) - Health Analysis */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ShieldCheck className={textColor} />
                            Health Analysis
                        </h3>

                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-[10px] border-white/5 mb-6">
                                <span className="text-4xl font-bold font-mono text-white">{stock.health_score}</span>
                                <div
                                    className={`absolute inset-0 rounded-full border-[10px] ${borderColor}`}
                                    style={{
                                        clipPath: `inset(${100 - stock.health_score}% 0 0 0)`,
                                        boxShadow: `0 0 20px ${shadowColor}`
                                    }}
                                />
                            </div>
                            <HealthBadge score={stock.health_score} badge={stock.health_badge} size="lg" />
                        </div>

                        <div className="space-y-3 mt-6">
                            <div className="p-4 bg-white/5 rounded-lg text-sm border border-white/5">
                                <div className="font-medium text-gray-300 mb-2 uppercase tracking-wide text-xs">Analysis Breakdown</div>
                                <ul className="space-y-3 text-gray-400">
                                    <li className="flex items-start gap-3">
                                        <TrendingUp size={16} className="text-neon-green mt-0.5" />
                                        <span>Strong Price Momentum (SMA 50 &gt; 200)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <Activity size={16} className="text-neon-green mt-0.5" />
                                        <span>Positive Volume Trend</span>
                                    </li>
                                    <li className="flex items-start gap-3 opacity-50">
                                        <AlertTriangle size={16} className="text-coral-red mt-0.5" />
                                        <span>Fundamentals Data Missing (Beta)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDetail;
