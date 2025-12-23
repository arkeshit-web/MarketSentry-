import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const StockCard = ({ stock }) => {
    const { ticker, company_name, current_price, health_score, health_badge, sparkline } = stock;

    // Color logic
    const isHealthy = health_score >= 50;
    const scoreColor = isHealthy ? "text-neon-green" : "text-coral-red";
    const strokeColor = isHealthy ? "#4ade80" : "#f87171";

    return (
        <Link to={`/stock/${ticker}`} className="block transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
            <div className="glass-panel p-5 rounded-xl h-full flex flex-col justify-between group">

                {/* Header: Ticker & Name */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold font-mono text-white tracking-tight">{ticker}</h3>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider truncate max-w-[140px]">{company_name}</p>
                    </div>

                    {/* Health Badge Pill */}
                    <div className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 shadow-[0_0_10px_rgba(0,0,0,0.2)]",
                        isHealthy
                            ? "bg-green-900/30 border-green-500/50 text-green-400"
                            : "bg-red-900/30 border-red-500/50 text-red-400"
                    )}>
                        {isHealthy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {health_badge}
                    </div>
                </div>

                {/* Middle: Sparkline Chart */}
                <div className="h-16 -mx-2 mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    {sparkline && sparkline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparkline.map(d => ({ ...d, close_price: parseFloat(d.close_price) }))}>
                                <defs>
                                    <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <YAxis domain={['dataMin', 'dataMax']} hide />
                                <Area
                                    type="monotone"
                                    dataKey="close_price"
                                    stroke={strokeColor}
                                    strokeWidth={2}
                                    fill={`url(#grad-${ticker})`}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                            No spark data
                        </div>
                    )}
                </div>

                {/* Footer: Price & Score */}
                <div className="flex justify-between items-end mt-2 border-t border-white/5 pt-3">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] uppercase font-mono mb-0.5">Price</span>
                        <span className="text-xl font-bold font-mono text-white">
                            ₹{current_price}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-gray-500 text-[10px] uppercase font-mono mb-0.5">Health</span>
                        <div className="flex items-center gap-1">
                            <Activity size={14} className={scoreColor} />
                            <span className={clsx("text-lg font-bold font-mono", scoreColor)}>
                                {health_score}
                            </span>
                            <span className="text-gray-500 text-xs font-mono">/100</span>
                        </div>
                    </div>
                </div>

            </div>
        </Link>
    );
};

export default StockCard;
