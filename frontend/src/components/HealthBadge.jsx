import clsx from 'clsx';

const HealthBadge = ({ score, badge, size = 'md' }) => {
    const isGood = score >= 70;
    const isAvg = score >= 50 && score < 70;

    return (
        <div className={clsx(
            "flex items-center gap-2 px-3 py-1 rounded-full font-bold shadow-sm border font-mono tracking-wide",
            isGood ? "bg-neon-green/10 text-neon-green border-neon-green/20" :
                isAvg ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                    "bg-coral-red/10 text-coral-red border-coral-red/20",
            size === 'lg' ? "text-lg px-4 py-2" : "text-xs"
        )}>
            <span>{score}/100</span>
            <span>{badge}</span>
        </div>
    );
};

export default HealthBadge;
