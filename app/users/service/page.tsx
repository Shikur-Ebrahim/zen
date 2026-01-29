"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft, MessageCircle, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";

export default function ServicePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [links, setLinks] = useState({
        channelLink: "",
        teamLink: ""
    });

    useEffect(() => {
        setMounted(true);
        const fetchLinks = async () => {
            try {
                const docRef = doc(db, "telegram_links", "active");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setLinks({
                        channelLink: docSnap.data().channelLink || "",
                        teamLink: docSnap.data().teamLink || ""
                    });
                }
            } catch (error) {
                console.error("Error fetching telegram links:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLinks();
    }, []);

    // Helper to format telegram link (handles @username or full link)
    const formatTG = (input: string) => {
        if (!input) return "#";
        if (input.startsWith("http")) return input;
        if (input.startsWith("@")) return `https://t.me/${input.substring(1)}`;
        return `https://t.me/${input}`;
    };

    const contactOptions = [
        {
            title: "Team Support",
            description: "Contact our dedicated team for assistance",
            image: "/telegram.jpg",
            colorClass: "from-indigo-600",
            shadowClass: "shadow-indigo-500/30",
            textClass: "text-indigo-400",
            glowClass: "bg-indigo-500/5",
            hoverGlowClass: "group-hover:bg-indigo-500/10",
            link: formatTG(links.teamLink),
            label: "Contact Team"
        },
        {
            title: "Official Channel",
            description: "Stay updated with latest news and announcements",
            image: "/telegram.jpg",
            colorClass: "from-violet-600",
            shadowClass: "shadow-violet-500/30",
            textClass: "text-violet-400",
            glowClass: "bg-violet-500/5",
            hoverGlowClass: "group-hover:bg-violet-500/10",
            link: formatTG(links.channelLink),
            label: "Join Channel"
        }
    ];

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050510]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] relative overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-transparent to-[#050510] opacity-80"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-[#050510]/80 backdrop-blur-2xl z-50 px-6 py-5 flex items-center gap-4 border-b border-white/5 shadow-2xl">
                <button
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 active:scale-90 group"
                >
                    <ChevronLeft size={22} className="text-white group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <h1 className="text-lg font-bold text-white tracking-tight">Customer Service</h1>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto space-y-10 pb-32 relative z-10">
                {/* Intro Section */}
                <div className="text-center space-y-6 px-2 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="relative w-24 h-24 mx-auto mb-8 group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10 transform rotate-6 group-hover:rotate-0 transition-all duration-500">
                            <MessageCircle size={36} className="text-white drop-shadow-2xl" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">How can we help?</h2>
                        <p className="text-base font-medium text-gray-400 leading-relaxed max-w-xs mx-auto">
                            Connect with our verified channels for 24/7 priority assistance.
                        </p>
                    </div>
                </div>

                {/* Contact Options Grid */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    {contactOptions.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                try {
                                    if (option.link) {
                                        window.open(option.link, "_blank", "noopener,noreferrer");
                                    }
                                } catch (e) {
                                    console.error("Navigation error:", e);
                                }
                            }}
                            className="group relative block w-full bg-white/[0.03] hover:bg-white/[0.08] rounded-[2.5rem] p-6 border border-white/5 transition-all duration-500 active:scale-[0.98] overflow-hidden backdrop-blur-3xl shadow-2xl"
                        >
                            {/* Hover Gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${option.colorClass} to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-700`}></div>

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 relative overflow-hidden backdrop-blur-xl">
                                    <img
                                        src={encodeURI(option.image)}
                                        alt={option.title}
                                        className="w-10 h-10 object-contain drop-shadow-2xl brightness-110"
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="text-xl font-bold text-white mb-1 tracking-tight truncate">{option.title}</h3>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed truncate opacity-70">
                                        {option.description}
                                    </p>
                                </div>
                                <div className={`w-11 h-11 rounded-full bg-white/5 border border-white/10 text-white/40 group-hover:text-white flex items-center justify-center group-hover:translate-x-1 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/40 transition-all duration-500`}>
                                    <ExternalLink size={20} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Trust Badge */}
                <div className="pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                    <div className="bg-emerald-500/[0.03] rounded-[2rem] p-6 border border-emerald-500/10 flex items-center gap-5 backdrop-blur-3xl">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-emerald-400 mb-0.5">Verified Support</h4>
                            <p className="text-[11px] text-emerald-500/60 font-medium tracking-wide">
                                End-to-end encrypted connection with verified agents.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Footer */}
                <p className="text-center text-[10px] text-gray-600 font-bold tracking-[0.2em] px-8 leading-relaxed opacity-40 uppercase">
                    Secure Channel • Protocol Active
                </p>
            </main>
        </div>
    );
}
