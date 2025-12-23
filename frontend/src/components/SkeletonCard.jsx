const SkeletonCard = () => {
    return (
        <div className="glass-panel p-5 rounded-xl animate-pulse h-[180px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="h-5 w-16 bg-white/10 rounded"></div>
                    <div className="h-3 w-32 bg-white/10 rounded"></div>
                </div>
                <div className="h-6 w-20 bg-white/10 rounded-full"></div>
            </div>

            <div className="space-y-2">
                <div className="h-8 w-24 bg-white/10 rounded"></div>
                <div className="h-10 w-full bg-white/5 rounded-lg mt-2"></div>
            </div>
        </div>
    );
};

export default SkeletonCard;
