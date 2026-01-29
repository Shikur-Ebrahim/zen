"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, X, Trophy, Crown, Sparkles, Star, Gem, Medal } from "lucide-react";

interface VipCelebrationCardProps {
    vipLevel: number;
    text: string;
    imageUrl: string;
    onClose: () => void;
}

const THEMES: Record<number, {
    primary: string;
    secondary: string;
    accent: string;
    icon: any;
    label: string;
    glow: string;
    shadow: string;
}> = {
    1: {
        primary: "from-orange-400 to-orange-700",
        secondary: "bg-orange-600",
        accent: "text-orange-200",
        icon: Medal,
        label: "Bronze Achievement",
        glow: "rgba(249, 115, 22, 0.4)",
        shadow: "shadow-orange-600/30"
    },
    2: {
        primary: "from-slate-300 to-slate-500",
        secondary: "bg-slate-400",
        accent: "text-slate-100",
        icon: Star,
        label: "Silver Excellence",
        glow: "rgba(148, 163, 184, 0.4)",
        shadow: "shadow-slate-400/30"
    },
    3: {
        primary: "from-amber-300 via-amber-500 to-amber-700",
        secondary: "bg-amber-500",
        accent: "text-amber-100",
        icon: Trophy,
        label: "Gold Master",
        glow: "rgba(245, 158, 11, 0.4)",
        shadow: "shadow-amber-500/30"
    },
    4: {
        primary: "from-blue-400 via-indigo-500 to-purple-600",
        secondary: "bg-indigo-600",
        accent: "text-indigo-100",
        icon: Gem,
        label: "Platinum Elite",
        glow: "rgba(79, 70, 229, 0.4)",
        shadow: "shadow-indigo-600/30"
    },
    5: {
        primary: "from-emerald-400 via-teal-500 to-cyan-600",
        secondary: "bg-emerald-600",
        accent: "text-emerald-100",
        icon: Crown,
        label: "Emerald Legend",
        glow: "rgba(16, 185, 129, 0.4)",
        shadow: "shadow-emerald-600/30"
    }
};

const DEFAULT_THEME = {
    primary: "from-slate-800 via-indigo-950 to-black",
    secondary: "bg-indigo-900",
    accent: "text-indigo-200",
    icon: Crown,
    label: "Diamond Elite Sovereign",
    glow: "rgba(79, 70, 229, 0.5)",
    shadow: "shadow-indigo-900/40"
};

export default function VipCelebrationCard({ vipLevel, text, imageUrl, onClose }: VipCelebrationCardProps) {
    const [isVisible, setIsVisible] = useState(false);
    const theme = THEMES[vipLevel] || DEFAULT_THEME;
    const Icon = theme.icon;

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 overflow-hidden"
                >
                    {/* Immersive Backdrop with Dynamic Glow */}
                    <div
                        className="absolute inset-0 bg-[#EADBC8]/90 backdrop-blur-3xl"
                        onClick={onClose}
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.1, 0.2, 0.1],
                            }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div className="w-[80vw] h-[80vw] rounded-full" style={{ background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)` }} />
                        </motion.div>
                    </div>

                    {/* Celebration Content */}
                    <motion.div
                        initial={{ scale: 0.8, y: 100, rotateX: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                        className={`relative w-full max-w-xl bg-white rounded-[3.5rem] overflow-hidden shadow-2xl ${theme.shadow} border-4 border-white/10`}
                    >
                        {/* High-End Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-8 right-8 z-30 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/20 active:scale-90 shadow-xl"
                        >
                            <X size={24} strokeWidth={3} />
                        </button>

                        {/* Visual Experience Header */}
                        <div className="relative aspect-[16/11] overflow-hidden">
                            <motion.img
                                initial={{ scale: 1.2 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 1.5 }}
                                src={imageUrl}
                                alt="Celebration"
                                className="w-full h-full object-cover"
                            />

                            {/* Layered Overlays for Depth */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-[#EADBC8] via-transparent to-black/20`} />
                            <div className={`absolute inset-0 bg-gradient-to-br ${theme.primary} mix-blend-overlay opacity-40`} />

                            {/* Animated Level Badge */}
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4, type: "spring" }}
                                className="absolute top-0 left-0 right-0 pt-16 flex flex-col items-center"
                            >
                                <div className={`relative ${theme.secondary} px-10 py-3 rounded-full shadow-2xl border-2 border-white/30 flex items-center gap-4 overflow-hidden group`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <Icon className="text-white" size={22} fill="currentColor" />
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1">VIP Ranking</span>
                                        <span className="text-sm font-black text-white uppercase tracking-[0.1em]">LEVEL {vipLevel} SUPREMACY</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating Sparkles & Particles */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        y: [-20, 20, -20],
                                        x: [-10, 10, -10],
                                        opacity: [0.2, 0.6, 0.2],
                                        scale: [0.8, 1.2, 0.8],
                                    }}
                                    transition={{
                                        duration: 3 + i,
                                        repeat: Infinity,
                                        delay: i * 0.5,
                                    }}
                                    className="absolute text-white pointer-events-none"
                                    style={{
                                        top: `${20 + (i * 12)}%`,
                                        left: `${15 + (i * 15)}%`,
                                    }}
                                >
                                    <Sparkles size={16 + (i * 2)} fill="currentColor" />
                                </motion.div>
                            ))}
                        </div>

                        {/* Messaging and Action */}
                        <div className="px-12 pt-14 pb-14 text-center space-y-10 relative">
                            {/* Theme-Specific Label */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="inline-flex items-center gap-3 px-6 py-2 rounded-xl bg-[#F5E6D3] border border-[#7B3F00]/20 shadow-sm"
                            >
                                <PartyPopper className={theme.accent.split(' ')[0].replace('text-', 'text-')} size={16} />
                                <span className="text-[10px] font-black text-[#7B3F00] uppercase tracking-[0.4em]">{theme.label}</span>
                            </motion.div>

                            <div className="space-y-4">
                                <h1 className="text-4xl font-black text-[#3E2723] tracking-tight flex flex-col leading-none">
                                    <span className="text-sm font-black text-[#7B3F00] uppercase tracking-[0.5em] mb-3">Distinction Achieved</span>
                                    YOU ARE UNSTOPPABLE!
                                </h1>
                                <p className="text-[#3E2723]/70 font-bold leading-relaxed text-base px-4">
                                    {text}
                                </p>
                            </div>

                            {/* Mega Interactive Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onClose}
                                className={`w-full bg-gradient-to-r ${theme.primary} text-white py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl relative overflow-hidden group`}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    <Trophy size={20} className="group-hover:rotate-12 transition-transform" />
                                    ACKNOWLEDGE STATUS
                                    <Crown size={20} className="group-hover:-rotate-12 transition-transform" />
                                </span>
                            </motion.button>
                        </div>

                        {/* Luxury Accents */}
                        <div className={`absolute -bottom-20 -right-20 w-80 h-80 ${theme.secondary} rounded-full blur-[100px] opacity-10`} />
                        <div className={`absolute -top-20 -left-20 w-80 h-80 ${theme.secondary} rounded-full blur-[100px] opacity-10`} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
