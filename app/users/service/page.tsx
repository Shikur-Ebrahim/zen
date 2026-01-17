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
            title: "Official Company",
            description: "Direct line to our main corporate account",
            image: "/zen-3d-logo.png",
            colorClass: "bg-emerald-600",
            shadowClass: "shadow-emerald-500/30",
            textClass: "text-emerald-600",
            glowClass: "bg-emerald-500/5",
            hoverGlowClass: "group-hover:bg-emerald-500/10",
            path: "/users/chat",
            label: "CHAT NOW"
        },
        {
            title: "Team Support",
            description: "Contact our dedicated team for assistance",
            image: "/telegram.jpg",
            colorClass: "bg-purple-600",
            shadowClass: "shadow-purple-500/30",
            textClass: "text-purple-600",
            glowClass: "bg-purple-500/5",
            hoverGlowClass: "group-hover:bg-purple-500/10",
            link: formatTG(links.teamLink),
            label: "CONTACT TEAM"
        },
        {
            title: "Official Channel",
            description: "Stay updated with latest news and announcements",
            image: "/telegram.jpg",
            colorClass: "bg-blue-600",
            shadowClass: "shadow-blue-500/30",
            textClass: "text-blue-600",
            glowClass: "bg-blue-500/5",
            hoverGlowClass: "group-hover:bg-blue-500/10",
            link: formatTG(links.channelLink),
            label: "JOIN CHANNEL"
        }
    ];

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 relative overflow-hidden font-sans selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] -mr-40 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] -ml-40 -mb-20 pointer-events-none"></div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-gray-950/80 backdrop-blur-xl z-50 px-6 py-5 flex items-center gap-4 border-b border-white/5">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 active:scale-95"
                >
                    <ChevronLeft size={20} className="text-white" />
                </button>
                <h1 className="text-lg font-black text-white uppercase tracking-widest text-shadow-sm">Customer Service</h1>
            </header>

            <main className="pt-28 px-6 max-w-lg mx-auto space-y-8 pb-32">
                {/* Intro Section */}
                <div className="text-center space-y-4 px-2">
                    <div className="relative w-20 h-20 mx-auto mb-6 group">
                        <div className="absolute inset-0 bg-blue-500 rounded-[2rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                        <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10 transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
                            <MessageCircle size={32} className="text-white drop-shadow-md" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">How can we help?</h2>
                    <p className="text-sm font-medium text-gray-400 leading-relaxed max-w-xs mx-auto">
                        Connect with our official support channels for 24/7 priority assistance and updates.
                    </p>
                </div>

                {/* Contact Options Grid */}
                <div className="space-y-4">
                    {contactOptions.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                try {
                                    if (option.path) {
                                        router.push(option.path);
                                    } else if (option.link) {
                                        window.open(option.link, "_blank", "noopener,noreferrer");
                                    }
                                } catch (e) {
                                    console.error("Navigation error:", e);
                                }
                            }}
                            className="group relative block w-full bg-white/5 hover:bg-white/10 rounded-[2rem] p-5 border border-white/5 transition-all duration-300 active:scale-[0.98] overflow-hidden"
                        >
                            {/* Hover Gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${option.colorClass.replace('bg-', 'from-')}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-16 h-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 relative overflow-hidden backdrop-blur-sm">
                                    <img
                                        src={encodeURI(option.image)}
                                        alt={option.title}
                                        className="w-10 h-10 object-contain drop-shadow-lg"
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="text-base font-black text-white mb-1 uppercase tracking-wide truncate">{option.title}</h3>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed truncate">
                                        {option.description}
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 group-hover:text-white flex items-center justify-center group-hover:translate-x-1 transition-all`}>
                                    <ExternalLink size={18} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Trust Badge */}
                <div className="pt-4">
                    <div className="bg-emerald-500/5 rounded-3xl p-6 border border-emerald-500/10 flex items-center gap-4 backdrop-blur-sm">
                        <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-1">Official Support</h4>
                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider leading-relaxed">
                                End-to-end encrypted • Verified Agents
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] px-8 leading-relaxed opacity-50">
                    Secure Channel • No Password Required
                </p>
            </main>
        </div>
    );
}
