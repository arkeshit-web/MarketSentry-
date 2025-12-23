import { useEffect, useState } from 'react';
import axios from 'axios';
import StockCard from '../components/StockCard';
import SkeletonCard from '../components/SkeletonCard';
import SmartSearch from '../components/SmartSearch';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Dashboard = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [topBuys, setTopBuys] = useState([]);
    const [topSells, setTopSells] = useState([]);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [count, setCount] = useState(0);
    const [nextPage, setNextPage] = useState(null);
    const [prevPage, setPrevPage] = useState(null);



    useEffect(() => {
        // Initial load
        fetchStocks(true);
        fetchTopMovers();

        // Polling every 5 seconds
        const interval = setInterval(() => {
            fetchStocks(false);
            fetchTopMovers();
        }, 5000);

        return () => clearInterval(interval);
    }, [page, searchTerm]);

    const fetchTopMovers = () => {
        // Top 4 Buys (highest health_score)
        axios.get('http://127.0.0.1:8000/api/stocks/?ordering=-health_score&page_size=4')
            .then(res => setTopBuys(res.data.results || []))
            .catch(err => console.error("Failed to fetch top buys:", err));

        // Top 4 Sells (lowest health_score)
        axios.get('http://127.0.0.1:8000/api/stocks/?ordering=health_score&page_size=4')
            .then(res => setTopSells(res.data.results || []))
            .catch(err => console.error("Failed to fetch top sells:", err));
    };

    const fetchStocks = (isInitial) => {
        if (isInitial) setLoading(true);
        const API_URL = `http://127.0.0.1:8000/api/stocks/?page=${page}&search=${searchTerm}`;

        axios.get(API_URL)
            .then(response => {
                // DRF Pagination returns { count, next, previous, results }
                if (response.data.results) {
                    setStocks(response.data.results);
                    setCount(response.data.count);
                    setNextPage(response.data.next);
                    setPrevPage(response.data.previous);
                } else {
                    // Fallback if pagination disabled (legacy safety)
                    setStocks(response.data);
                    setCount(response.data.length);
                }
                if (isInitial) setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch stocks:", err);
                // Only show error on full failure, maybe toast on poll fail?
                if (isInitial) {
                    setError("Failed to load market data. Ensure backend is running.");
                    setLoading(false);
                }
            });
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to page 1 on search
    };

    return (
        <div>
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Market Overview</h1>
                    <p className="text-gray-500 mt-2">Real-time health analysis of major stocks.</p>
                </div>

                {/* Smart Search */}
                <SmartSearch />
            </div>

            {/* Market Highlights */}
            {!loading && !error && !searchTerm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="glass-panel p-5 rounded-xl border-l-4 border-neon-green/50">
                        <h2 className="text-xl font-bold text-neon-green mb-4 flex items-center gap-2 font-mono">
                            Top Buyers
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {topBuys.map(stock => (
                                <StockCard key={`buy-${stock.ticker}`} stock={stock} />
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel p-5 rounded-xl border-l-4 border-coral-red/50">
                        <h2 className="text-xl font-bold text-coral-red mb-4 flex items-center gap-2 font-mono">
                            Top Sellers
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {topSells.map(stock => (
                                <StockCard key={`sell-${stock.ticker}`} stock={stock} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">System Offline</h2>
                    <p className="text-red-500">{error}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {stocks.map(stock => (
                            <StockCard key={stock.ticker} stock={stock} />
                        ))}
                    </div>

                    {stocks.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No stocks found matching "{searchTerm}"
                        </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="mt-8 flex justify-center items-center gap-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={!prevPage}
                            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {page} of {Math.ceil(count / 20) || 1}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={!nextPage}
                            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
