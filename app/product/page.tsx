"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    Zap,
    Clock,
    Award,
    ArrowRight,
    ShieldCheck,
    Star,
    TrendingUp
} from "lucide-react";

// Mock Product Database
const LUXURY_CATALOG = [
    {
        id: "dpm-01",
        name: "DPM ELITE ESSENCE",
        category: "LEVEL A",
        price: 15400,
        dailyIncome: 1250,
        contractPeriod: 90,
        imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=2070&auto=format&fit=crop",
    },
    {
        id: "dpm-02",
        name: "DPM SIGNATURE OUD",
        category: "LEVEL B",
        price: 28900,
        dailyIncome: 2400,
        contractPeriod: 120,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop",
    },
    {
        id: "dpm-03",
        name: "DPM INFINITY ROYAL",
        category: "LEVEL S+",
        price: 75000,
        dailyIncome: 6800,
        contractPeriod: 365,
        imageUrl: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=2070&auto=format&fit=crop",
    }
];

// Reusable Dynamic Content Component
function ProductDetails({ product, hasOrdered }: { product: typeof LUXURY_CATALOG[0], hasOrdered: boolean }) {
    return (
        <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
        >
            {/* Image Presentation */}
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#F5E6D3]/10 border border-[#F5E6D3]/30 mb-8 relative">
                <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Header Info */}
            <div className="flex justify-between items-center mb-10 px-2 border-b border-[#F5E6D3]/30 pb-6">
                <div className="space-y-1">
                    <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide block">Product Name</span>
                    <h2 className="text-2xl font-semibold text-[#1A1A1A] tracking-tight leading-tight truncate max-w-[200px]">
                        {product.name}
                    </h2>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide block mb-1">Price</span>
                    <p className="text-3xl font-bold text-[#8B5E3C] tracking-tight leading-none">
                        {product.price.toLocaleString()}
                        <span className="text-xs ml-1.5 font-medium text-[#1A1A1A]/40">ETB</span>
                    </p>
                </div>
            </div>

            {/* Information Section */}
            <AnimatePresence>
                {!hasOrdered && (
                    <motion.div
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="grid grid-cols-2 gap-4 px-2 overflow-hidden"
                    >
                        <div className="bg-[#F9F9F9] rounded-[2rem] p-7 border border-[#F5E6D3]/20 flex flex-col gap-2">
                            <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide">Daily Profit</span>
                            <p className="text-2xl font-bold text-[#8B5E3C] tracking-tight">
                                {product.dailyIncome.toLocaleString()}
                                <span className="text-[11px] ml-1.5 text-[#1A1A1A]/30 font-medium">ETB</span>
                            </p>
                        </div>
                        <div className="bg-[#F9F9F9] rounded-[2rem] p-7 border border-[#F5E6D3]/20 flex flex-col gap-2">
                            <span className="text-[10px] font-medium text-[#1A1A1A]/40 tracking-wide">Duration</span>
                            <p className="text-2xl font-bold text-[#8B5E3C] tracking-tight">
                                {product.contractPeriod}
                                <span className="text-[11px] ml-1.5 text-[#1A1A1A]/30 font-medium">Days</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Reusable Buy Button Component
function BuyButton({ onClick, disabled }: { onClick: () => void, disabled?: boolean }) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            disabled={disabled}
            className="w-full h-20 bg-[#C9A24D] text-white rounded-[2rem] font-black text-[13px] tracking-[0.3em] shadow-2xl shadow-[#C9A24D]/40 transition-all flex items-center justify-between px-10 group"
        >
            <span className="mx-auto text-center">Order Now</span>
        </motion.button>
    );
}

// Fixed-Layout Main Card Component
export default function ProductCardPage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [hasOrdered, setHasOrdered] = useState(false);

    const product = LUXURY_CATALOG[currentIndex];

    const cycleProduct = () => {
        setHasOrdered(true);
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % LUXURY_CATALOG.length);
            setIsTransitioning(false);
            setHasOrdered(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F5E6D3] blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#C9A24D]/10 blur-[150px] rounded-full"></div>
            </div>

            {/* FIXED LAYOUT CARD CONTAINER */}
            <div className="w-full max-w-[420px] relative z-10">
                <div className="bg-white rounded-[3.5rem] p-8 border border-[#F5E6D3] shadow-[0_40px_100px_-20px_rgba(201,162,77,0.15)] relative overflow-hidden h-[750px] flex flex-col">

                    {/* Fixed Card Header */}
                    <div className="flex items-center justify-between mb-10 px-2 shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#F9F9F9] border border-[#F5E6D3] flex items-center justify-center text-[#1A1A1A]">
                            <ChevronLeft size={24} />
                        </div>
                        <div className="text-center">
                            <span className="text-[9px] font-medium text-[#C9A24D] tracking-[0.2em] block">DPM Elite</span>
                            <span className="text-[14px] font-semibold text-[#1A1A1A]">Collection</span>
                        </div>
                        <div className="w-12 h-12" />
                    </div>

                    {/* DYNAMIC CONTENT AREA - HEIGHT IS FIXED */}
                    <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                            <ProductDetails product={product} hasOrdered={hasOrdered} />
                        </AnimatePresence>
                    </div>

                    {/* Fixed Footer with Button */}
                    <div className="pt-10 shrink-0">
                        <BuyButton onClick={cycleProduct} disabled={isTransitioning} />
                        <div className="mt-8 flex justify-center gap-1.5">
                            {LUXURY_CATALOG.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-500 ${currentIndex === i ? 'w-8 bg-[#C9A24D]' : 'w-1.5 bg-[#F5E6D3]'}`}
                                />
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
