"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, Copy, CheckCircle2, Share2, Sparkles, Gift, Users, Wallet, Coins } from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [referralLink, setReferralLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({ earned: 0, invited: 0 });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const baseUrl = window.location.origin;
                    setReferralLink(`${baseUrl}?ref=${user.uid}`);

                    // Mock stats for visual appeal if not present
                    setStats({
                        earned: data.teamIncome || 0,
                        invited: data.teamSize || 0
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success("Referral link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Zen & Earn!',
                    text: 'Join me on Zen and get verified rewards!',
                    url: referralLink,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            handleCopy();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Ambient Background Lighting */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-indigo-900/10 blur-[120px] pointer-events-none z-0"></div>
            <div className="fixed -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="fixed bottom-0 -left-20 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

            {/* Header */}
            <header className="w-full px-6 py-5 flex items-center justify-between relative z-20">
                <button
                    onClick={() => router.back()}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-xl active:scale-90 transition-all text-slate-300 hover:text-indigo-400"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full backdrop-blur-md">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Invite & Earn</span>
                </div>
                <div className="w-11"></div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-lg mx-auto px-6 flex flex-col items-center relative z-10 pt-2 pb-32">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-3 mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                        Grow Your Network<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">Grow Your Wealth</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 max-w-[280px] uppercase tracking-wider">
                        Real rewards for every active referral.
                    </p>
                </div>

                {/* Central 3D Illustration - Horizontal for the new banner */}
                <div className="relative w-full max-w-[400px] aspect-[16/10] flex items-center justify-center mb-8 group">
                    <div className="absolute inset-0 bg-indigo-600/10 rounded-[2.5rem] blur-[60px] group-hover:bg-indigo-600/20 transition-colors duration-1000"></div>

                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5">
                        <img
                            src="/invite_banner.png"
                            alt="Advanced Invitation"
                            className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
                        />

                        {/* Floating elements mock style */}
                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 flex items-center gap-2 shadow-2xl animate-bounce-slow">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-black text-white tracking-widest">+20% Bonus</span>
                        </div>
                    </div>
                </div>

                {/* Stats Section - Premium Glassmorphism */}
                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border border-white/10 flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-300">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
                            <Users size={22} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Invited</span>
                        <span className="text-2xl font-black text-white">{stats.invited}</span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 border border-white/10 flex flex-col items-center text-center group hover:bg-white/10 transition-all duration-300">
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
                            <Coins size={22} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Earned</span>
                        <span className="text-2xl font-black text-white">{stats.earned}</span>
                    </div>
                </div>

                {/* Invite Steps Guide */}
                <div className="w-full grid grid-cols-3 gap-2 mb-10 px-2 text-center">
                    <div className="space-y-2">
                        <div className="text-indigo-400 font-black text-sm italic">01</div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Share Link</p>
                    </div>
                    <div className="h-[1px] bg-white/10 my-auto"></div>
                    <div className="space-y-2">
                        <div className="text-indigo-400 font-black text-sm italic">02</div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Friends Join</p>
                    </div>
                    <div className="h-[1px] bg-white/10 my-auto"></div>
                    <div className="space-y-2">
                        <div className="text-indigo-400 font-black text-sm italic">03</div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Get Rewards</p>
                    </div>
                </div>

                {/* Link Sharing Card */}
                <div className="w-full bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/5 relative shadow-3xl">
                    <div className="flex flex-col space-y-4">
                        <div className="space-y-1.5 px-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Referral Link</label>
                            <div className="relative group/link" onClick={handleCopy}>
                                <div className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-slate-300 truncate focus:outline-none transition-all group-hover/link:border-indigo-500/30">
                                    {referralLink}
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover/link:text-indigo-400 transition-colors">
                                    <Copy size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCopy}
                                className={`flex-[2] h-14 rounded-2xl font-black text-xs tracking-[0.1em] transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${copied
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-xl shadow-indigo-700/20 hover:shadow-indigo-700/40"
                                    }`}
                            >
                                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                {copied ? "COPIED SUCCESS" : "COPY LINK"}
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 shadow-lg"
                            >
                                <Share2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}

// Add custom keyframes for float animation in index.css if not present, or assume standard bounce-slow works.
// For now, I'll rely on tailwind arbitrary values or the provided 'animate-[...]' syntax which works in recent tailwind with JIT.
