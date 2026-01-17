"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, where, getDocs, limit, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
    Home,
    Wallet,
    Ship,
    Users,
    Bell,
    TrendingUp,
    Loader2,
    Shield,
    Package,
    CheckCircle2,
    Coins,
    Star,
    PartyPopper
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import VipCelebrationCard from "@/components/VipCelebrationCard";
import { motion, AnimatePresence } from "framer-motion";

import { Suspense } from "react";

function WelcomeContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("home");
    const [banners, setBanners] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [mounted, setMounted] = useState(false);


    // Notification State
    const [userNotifs, setUserNotifs] = useState<any[]>([]);
    const [latestRecharge, setLatestRecharge] = useState<any>(null);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    // VIP Celebration State
    const [showVipCeleb, setShowVipCeleb] = useState(false);
    const [vipCelebData, setVipCelebData] = useState<any>(null);

    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const tab = searchParams.get('tab');
        if (tab && ['home', 'product', 'team', 'wallet'].includes(tab)) {
            setActiveNav(tab);
        } else {
            setActiveNav('home');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!user) return;

        // 1. Listen for User's Latest Recharge
        const qRecharge = query(
            collection(db, "RechargeReview"),
            where("userId", "==", user.uid)
        );

        const unsubscribeRec = onSnapshot(qRecharge, (snapshot) => {
            if (!snapshot.empty) {
                const recharges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort to avoid index issues
                recharges.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.toMillis?.() || 0;
                    const timeB = b.timestamp?.toMillis?.() || 0;
                    return timeB - timeA;
                });

                const latest = recharges[0] as any;
                setLatestRecharge(latest);
                // Only trigger dot for 'Under Review' recharges
                if (latest.status === 'Under Review') {
                    setHasUnread(true);
                }
            }
        });

        // 2. Listen for User-Specific Reward Notifications
        const qUserNotifs = query(
            collection(db, "UserNotifications"),
            where("userId", "==", user.uid)
        );

        const unsubscribeNotifs = onSnapshot(qUserNotifs, async (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            // Client-side sort to avoid index requirements
            notifs.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });

            // Limit to top 25 most recent for display
            const limitedNotifs = notifs.slice(0, 25);

            setUserNotifs(limitedNotifs);

            // Sync unread dot with actual unread notifications
            const hasAnyUnread = limitedNotifs.some((n: any) => !n.read);
            if (hasAnyUnread) {
                setHasUnread(true);
            }

            // --- Auto-Cleanup Logic ---
            // If total notifications exceed 25, delete the older ones from the database
            if (notifs.length > 25) {
                const toDelete = notifs.slice(25);
                const batch = writeBatch(db);
                toDelete.forEach((notif) => {
                    const docRef = doc(db, "UserNotifications", notif.id);
                    batch.delete(docRef);
                });
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error cleaning up old notifications:", error);
                }
            }
        });

        return () => {
            unsubscribeRec();
            unsubscribeNotifs();
        };
    }, [user]);

    const handleMarkAsRead = async (notif: any) => {
        if (notif.read === false) {
            try {
                const docRef = doc(db, "UserNotifications", notif.id);
                await updateDoc(docRef, { read: true });
            } catch (error) {
                console.error("Error marking as read:", error);
            }
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);

                    // --- VIP Celebration Logic ---
                    const currentVip = data.vip || 0;
                    const vipViews = data.vipViews || {};
                    const currentViews = vipViews[`level_${currentVip}`] || 0;

                    if (currentVip > 0 && currentViews < 3) {
                        const notifDoc = await getDoc(doc(db, "VipNotifications", `vip_${currentVip}`));
                        if (notifDoc.exists()) {
                            setVipCelebData({ ...notifDoc.data(), currentViews });
                            setShowVipCeleb(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        // Fetch banners and notifications once
        const qBanners = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const bannerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanners(bannerData);
        });

        const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
            const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifData);
        });


        return () => {
            unsubscribeAuth();
            unsubscribeBanners();
            unsubscribeNotifs();
        };
    }, [router]);

    // Separate effect for banner interval to avoid redundant subscriptions
    useEffect(() => {
        if (banners.length <= 1) return;

        const bannerInterval = setInterval(() => {
            setCurrentBannerIndex((prev) => prev + 1);
        }, 2000);

        return () => clearInterval(bannerInterval);
    }, [banners.length]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleRechargeClick = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                router.push("/users/recharge");
                return;
            }

            // Check for pending recharge
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", currentUser.uid),
                where("status", "==", "Under Review"),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const pendingData = querySnapshot.docs[0].data();
                const theme = pendingData.paymentMethod || "regular";
                router.push(`/users/transaction-pending?theme=${theme}`);
            } else {
                router.push("/users/recharge");
            }
        } catch (error) {
            console.error("Error checking pending status:", error);
            router.push("/users/recharge");
        }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-slate-200 pb-44 relative overflow-hidden" onClick={() => showNotifPanel && setShowNotifPanel(false)}>
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Top Bar */}
            <header className="fixed top-0 left-0 right-0 bg-black/40 backdrop-blur-3xl z-40 px-6 py-5 flex items-center justify-between border-b border-white/5 shadow-2xl">
                <div className="flex items-center gap-4">
                    <motion.div
                        initial={{ rotate: -10, scale: 0.9 }}
                        animate={{ rotate: 0, scale: 1 }}
                        className="w-12 h-12 relative"
                    >
                        <img src="/zen-3d-logo.png" alt="Zen Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Account</span>
                        <span className="text-sm font-black text-white tracking-tight">
                            {userData?.email?.split('@')[0] || "User"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                setShowNotifPanel(!showNotifPanel);
                                setHasUnread(false);
                            }}
                            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 relative hover:bg-white/10 transition-all active:scale-95"
                        >
                            <Bell size={20} className="text-white" />
                            {hasUnread && (
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-indigo-500 border-2 border-black rounded-full"></span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute top-full right-0 mt-4 w-85 bg-[#121214] rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Updates</h4>
                                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded-full font-bold text-slate-500">LIVE</span>
                                </div>
                                <div className="max-h-[420px] overflow-y-auto p-2 space-y-2 scrollbar-hide">
                                    {(() => {
                                        const allNotifs: any[] = [...userNotifs];
                                        if (latestRecharge) allNotifs.push({ ...latestRecharge, type: 'recharge' });
                                        allNotifs.sort((a, b) => ((b.createdAt || b.timestamp)?.toMillis?.() || 0) - ((a.createdAt || a.timestamp)?.toMillis?.() || 0));

                                        if (allNotifs.length === 0) return (
                                            <div className="py-12 text-center text-slate-600 text-[10px] uppercase font-black tracking-widest opacity-40">No news</div>
                                        );

                                        return allNotifs.map((notif, idx) => {
                                            const isUnread = notif.read === false;
                                            const LEVEL_MAP: Record<string, string> = {
                                                "Level A": "1", "Level 1": "1", "Level B": "2", "Level 2": "2",
                                                "Level C": "3", "Level 3": "3", "Level D": "4", "Level 4": "4"
                                            };

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleMarkAsRead(notif)}
                                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isUnread ? "bg-white/5 border-white/10 scale-[1.02]" : "bg-transparent border-transparent hover:bg-white/5"}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-white/5 shrink-0 flex items-center justify-center overflow-hidden border border-white/10 shadow-sm">
                                                        <img
                                                            src={notif.type === 'registration' ? encodeURI(`/level ${LEVEL_MAP[notif.level as string] || "1"}.jpg`) : "/zen-3d-logo.png"}
                                                            className="w-full h-full object-cover"
                                                            alt="Notif"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-black text-white line-clamp-1 uppercase tracking-tight">{notif.message || notif.type.replace('_', ' ')}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{notif.amount ? `${Number(notif.amount).toLocaleString()} ETB` : "Success"}</p>
                                                    </div>
                                                    {isUnread && <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50"></div>}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-28 px-6 space-y-8 max-w-lg mx-auto pb-20 relative z-10">
                {activeNav === "home" ? (
                    <>
                        {/* Elite Banner Section - Vertical Slider Redesign */}
                        {banners.length > 0 && (
                            <section className="relative group">
                                <div className="w-full aspect-[1.2/1] rounded-[3rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-black relative">
                                    <div
                                        className="flex flex-col h-full"
                                        style={{
                                            transform: `translateY(-${currentBannerIndex * 100}%)`,
                                            transition: isResetting ? 'none' : 'transform 0.9s cubic-bezier(0.23, 1, 0.32, 1)'
                                        }}
                                        onTransitionEnd={() => {
                                            if (currentBannerIndex >= banners.length) {
                                                setIsResetting(true);
                                                setCurrentBannerIndex(0);
                                                setTimeout(() => setIsResetting(false), 50);
                                            }
                                        }}
                                    >
                                        {[...banners, banners[0]].map((banner, index) => (
                                            <div key={index} className="w-full min-h-full relative">
                                                <img src={banner?.url} alt="ZEN Collection" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 px-4">
                                        {banners.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${(currentBannerIndex % banners.length) === i ? "w-8 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "w-1.5 bg-white/20"}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Marquee - Optimized for luxury feel */}
                        {notifications.length > 0 && (
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl py-3 border border-white/5 overflow-hidden relative">
                                <div className="flex marquee-container gap-12 whitespace-nowrap animate-horizontal-scroll px-4">
                                    {[...notifications, ...notifications].map((notif, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{notif.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interactive Action Grid */}
                        <section className="space-y-6 pt-2">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Quick Actions</h3>
                                <div className="h-px flex-1 mx-4 bg-white/5"></div>
                                <Star size={12} className="text-slate-700" />
                            </div>

                            {/* Main CTA: Invitation */}
                            <motion.div
                                onClick={() => router.push("/users/invite")}
                                whileTap={{ scale: 0.97 }}
                                className="relative w-full h-44 rounded-[3rem] overflow-hidden cursor-pointer shadow-3xl shadow-black border border-white/10 group"
                            >
                                <img src="/invite_banner.png" alt="Invite" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 flex flex-col items-start justify-end h-full">
                                    <span className="bg-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-widest mb-3 shadow-lg shadow-indigo-600/30">Invite</span>
                                    <h2 className="text-2xl font-black text-white leading-none tracking-tight">Invite Friends</h2>
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Grow your network together</p>
                                </div>
                            </motion.div>

                            {/* Modern Bento Hub - Dark Premium Redesign */}
                            <div className="grid grid-cols-6 gap-4 auto-rows-fr">
                                {/* Primary Action: Recharge (Large Bento) */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleRechargeClick}
                                    className="col-span-3 row-span-1 bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 flex flex-col items-start justify-between border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-white/5">
                                        <Wallet size={24} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Wallet</span>
                                        <span className="text-sm font-black text-white tracking-tight">ADD MONEY</span>
                                    </div>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-3xl -mr-8 -mt-8"></div>
                                </motion.button>

                                {/* Primary Action: Collections (Large Bento) */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push("/users/product")}
                                    className="col-span-3 row-span-1 bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-6 flex flex-col items-start justify-between border border-white/10 relative overflow-hidden group hover:bg-white/10 transition-all"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform shadow-inner shadow-white/5">
                                        <Package size={24} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Shop</span>
                                        <span className="text-sm font-black text-white tracking-tight">PRODUCTS</span>
                                    </div>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl -mr-8 -mt-8"></div>
                                </motion.button>

                                {/* Secondary Action: VIP Rules (Compact Bento) */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push("/users/vip-rules")}
                                    className="col-span-2 row-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-white/10 group px-2 hover:bg-white/10 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:rotate-12 transition-transform">
                                        <Shield size={20} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">RULES</span>
                                </motion.button>

                                {/* Secondary Action: Payouts (Compact Bento) */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push("/users/withdraw")}
                                    className="col-span-2 row-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-white/10 group px-2 hover:bg-white/10 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:rotate-12 transition-transform">
                                        <Coins size={20} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">CASH OUT</span>
                                </motion.button>

                                {/* Secondary Action: Metrics (Compact Bento) */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push("/users/tasks")}
                                    className="col-span-2 row-span-1 bg-white/5 backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-white/10 group px-2 hover:bg-white/10 transition-all"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:rotate-12 transition-transform">
                                        <TrendingUp size={20} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[9px] font-black text-white uppercase tracking-tighter">TASKS</span>
                                </motion.button>
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                        <Loader2 size={32} className="animate-spin opacity-20" />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Loading...</p>
                    </div>
                )}
            </main>

            {/* Subdued Footer */}
            <div className="fixed bottom-32 left-0 right-0 text-center pointer-events-none">
                <p className="text-[8px] font-black text-slate-800 uppercase tracking-[0.4em]">ZEN APP • EST 2024</p>
            </div>

            {/* VIP Celebration Overlay */}
            {showVipCeleb && vipCelebData && (
                <VipCelebrationCard
                    vipLevel={vipCelebData.vipLevel}
                    text={vipCelebData.text}
                    imageUrl={vipCelebData.imageUrl}
                    onClose={async () => {
                        setShowVipCeleb(false);
                        if (user) {
                            try {
                                await updateDoc(doc(db, "users", user.uid), {
                                    [`vipViews.level_${vipCelebData.vipLevel}`]: (vipCelebData.currentViews || 0) + 1
                                });
                            } catch (err) { console.error(err); }
                        }
                    }}
                />
            )}
        </div>
    );
}

export default function WelcomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        }>
            <WelcomeContent />
        </Suspense>
    );
}
