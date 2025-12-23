import clsx from 'clsx';
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const NewsList = ({ news }) => {
    if (!news || news.length === 0) {
        return <div className="text-gray-500 text-sm italic">No recent news available.</div>;
    }

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Newspaper size={20} className="text-blue-600" />
                Recent News & Sentiment
            </h3>

            <div className="space-y-3">
                {news.map((item, index) => {
                    const isPos = item.sentiment_score > 0.2;
                    const isNeg = item.sentiment_score < -0.2;

                    return (
                        <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100 items-start hover:bg-white transition-colors">
                            <div className={clsx(
                                "mt-1 p-1.5 rounded-full shrink-0",
                                isPos ? "bg-green-100 text-green-600" :
                                    isNeg ? "bg-red-100 text-red-600" :
                                        "bg-gray-200 text-gray-500"
                            )}>
                                {isPos ? <TrendingUp size={16} /> : isNeg ? <TrendingDown size={16} /> : <Minus size={16} />}
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-800 text-sm leading-snug">{item.headline}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span>{new Date(item.published_at).toLocaleDateString()}</span>
                                    <span className={clsx(
                                        "font-semibold",
                                        isPos ? "text-green-600" : isNeg ? "text-red-600" : "text-gray-500"
                                    )}>
                                        AI Score: {item.sentiment_score.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NewsList;
