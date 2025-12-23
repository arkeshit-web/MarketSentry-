import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import clsx from 'clsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const SmartSearch = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const wrapperRef = useRef(null);

    useEffect(() => {
        // Close dropdown when clicking outside
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                // Using existing search API
                const res = await axios.get(`${API_BASE_URL}/api/stocks/?search=${query}`);
                // API paginates, so results are in res.data.results
                setResults(res.data.results || []);
                setIsOpen(true);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelect = (ticker) => {
        navigate(`/stock/${ticker}`);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div ref={wrapperRef} className="relative w-full md:w-96 z-50">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? <Loader2 size={18} className="text-neon-green animate-spin" /> : <Search size={18} className="text-gray-400" />}
                </div>
                <input
                    type="text"
                    className="w-full bg-dark-bg/50 border border-white/10 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-green/50 focus:border-neon-green/50 placeholder-gray-500 backdrop-blur-sm"
                    placeholder="Search stocks (e.g. RELIANCE)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    {results.map((stock) => (
                        <div
                            key={stock.ticker}
                            onClick={() => handleSelect(stock.ticker)}
                            className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center transition-colors"
                        >
                            <div>
                                <div className="font-bold text-white font-mono">{stock.ticker}</div>
                                <div className="text-gray-400 text-xs truncate max-w-[150px]">{stock.company_name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-neon-green font-bold">₹{stock.current_price}</div>
                                {stock.health_badge === "Strong Buy" && (
                                    <div className="text-[10px] text-neon-green bg-neon-green/10 px-1 rounded inline-block">BUY</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && query.length >= 2 && results.length === 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl p-4 text-center text-gray-500 text-sm">
                    No results found.
                </div>
            )}
        </div>
    );
};

export default SmartSearch;
