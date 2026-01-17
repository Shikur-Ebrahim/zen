"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Download,
    ChevronLeft,
    Smartphone,
    ShieldCheck,
    Zap,
    Star,
    Info,
    CheckCircle2,
    Loader2,
    Shield,
    Users,
    FileText,
    Share2,
    MoreVertical,
    Calendar,
    ShieldAlert
} from "lucide-react";
import { useEffect } from "react";

export default function DownloadAppPage() {
    const router = useRouter();

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstruction, setShowInstruction] = useState(false);
    const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed'>('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleDownload = async () => {
        // Force simulation for demo
        setInstallStatus('installing');

        // Simulate download/install progress
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.floor(Math.random() * 5) + 2; // Random increment
            if (currentProgress > 100) {
                currentProgress = 100;
                clearInterval(interval);
                setTimeout(() => setInstallStatus('installed'), 500);
            }
            setProgress(currentProgress);
        }, 150); // Updates every 150ms
    };


    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
            {/* Minimal App Header */}
            <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-gray-100/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-all active:scale-95">
                        <ChevronLeft size={22} className="text-gray-900" />
                    </button>
                    <span className="text-sm font-black tracking-widest uppercase text-gray-900">App Store</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-24">
                {/* Hero App Branding Section */}
                <section className="px-6 py-8 flex gap-6">
                    <div className="w-24 h-24 shrink-0 rounded-[1.5rem] bg-white border border-gray-100 p-4 shadow-xl shadow-gray-200/50 overflow-hidden relative group">
                        <img src="/zen-3d-logo-v2.png" alt="Zen App" className="w-full h-full object-contain relative z-10" />
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="flex flex-col justify-end pb-1">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-none mb-1.5">Zen App</h1>
                        <p className="text-sm font-bold text-emerald-600 mb-2">Zen Official Digital</p>
                        <p className="text-[11px] font-medium text-gray-400 tracking-wide">Contains ads • In-app purchases</p>
                    </div>
                </section>

                {/* Play Store Statistical Metrics */}
                <section className="px-2">
                    <div className="flex items-center justify-around py-4 border-t border-b border-gray-50 bg-gray-50/30 rounded-3xl mx-4">
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <div className="flex items-center gap-0.5">
                                <span className="text-sm font-black">4.9</span>
                                <Star size={10} className="fill-gray-900 text-gray-900" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">12K reviews</span>
                        </div>
                        <div className="w-[1px] h-6 bg-gray-200"></div>
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <Download size={14} className="text-gray-900" />
                            <span className="text-sm font-black">32 MB</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Size</span>
                        </div>
                        <div className="w-[1px] h-6 bg-gray-200"></div>
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <div className="w-4 h-4 rounded-sm border-[1.5px] border-gray-900 flex items-center justify-center">
                                <span className="text-[8px] font-black">3+</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">PEGI 3</span>
                        </div>
                        <div className="w-[1px] h-6 bg-gray-200"></div>
                        <div className="flex flex-col items-center gap-1 min-w-[70px]">
                            <span className="text-sm font-black">500K+</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Downloads</span>
                        </div>
                    </div>
                </section>

                {/* Primary Action Section */}
                <section className="px-6 py-8">
                    {installStatus === 'idle' && (
                        <button
                            onClick={handleDownload}
                            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] transition-all rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-emerald-200/60"
                        >
                            <Download size={22} className="text-white" />
                            <span className="text-lg font-black text-white tracking-widest uppercase">Download App</span>
                        </button>
                    )}

                    {installStatus === 'installing' && (
                        <div className="w-full py-5 bg-gray-50 rounded-[1.5rem] border border-gray-200 relative overflow-hidden flex items-center justify-center shadow-inner">
                            <div
                                className="absolute inset-y-0 left-0 bg-emerald-100/50 transition-all duration-300 ease-linear"
                                style={{ width: `${progress}%` }}
                            ></div>
                            <div className="relative flex items-center gap-3 z-10">
                                <Loader2 size={22} className="text-emerald-600 animate-spin" />
                                <span className="text-lg font-black text-emerald-700 tracking-widest uppercase">
                                    {progress < 40 ? "Verifying..." : progress < 80 ? "Installing..." : "Finalizing..."}
                                </span>
                                <span className="text-sm font-bold text-emerald-600/80 w-10 text-right">{progress}%</span>
                            </div>
                        </div>
                    )}

                    {installStatus === 'installed' && (
                        <button
                            onClick={() => router.push('/users/welcome')}
                            className="w-full py-5 bg-white border-2 border-emerald-600 hover:bg-emerald-50 active:scale-[0.97] transition-all rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl shadow-emerald-100/50"
                        >
                            <span className="text-lg font-black text-emerald-700 tracking-widest uppercase">Open App</span>
                        </button>
                    )}

                </section>
            </main>

        </div>
    );
}
