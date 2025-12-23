import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel p-3 rounded-lg border border-neon-green/30">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-neon-green font-mono font-bold text-lg">
                    ₹{payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const StockChart = ({ data, color = "#4ade80" }) => { // Default to neon-green
    if (!data || data.length === 0) {
        return <div className="h-[400px] flex items-center justify-center text-gray-500">No Data</div>;
    }

    const chartData = data.map(point => ({
        date: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        price: parseFloat(point.close_price)
    })).reverse(); // Recharts needs chronological order

    return (
        <div className="h-[400px] w-full glass-panel p-4 rounded-xl">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '5 5' }} />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StockChart;
