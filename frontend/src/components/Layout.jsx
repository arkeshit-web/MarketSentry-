import { Outlet, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Layout = () => {
    return (
        <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-neon-green/30">
            {/* Sticky Glass Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-40 bg-dark-bg/80 backdrop-blur-md border-b border-white/5 h-16">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="bg-gradient-to-tr from-neon-green to-blue-500 p-1.5 rounded-lg shadow-[0_0_15px_rgba(74,222,128,0.3)] group-hover:shadow-[0_0_25px_rgba(74,222,128,0.5)] transition-all">
                            <Activity className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            Market<span className="text-neon-green">Sentry</span>
                        </span>
                    </Link>

                    {/* Placeholder for user profile or extra nav items */}
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-glass-white border border-white/10"></div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
