"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    onSnapshot,
    setDoc,
    serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Loader2,
    Upload,
    Trash2,
    Plus,
    Crown,
    Bell,
    PartyPopper,
    Image as ImageIcon,
    Save,
    ChevronLeft,
    Menu,
    Sparkles
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import VipCelebrationCard from "@/components/VipCelebrationCard";

export default function AdminVipNotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Form State
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        vipLevel: 0,
        text: "",
        imageUrl: "",
        publicId: ""
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
            }
        });

        // Listen for VIP Rules to get available tiers
        const qRules = query(collection(db, "VipRules"), orderBy("createdAt", "asc"));
        const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
            const ruleList = snapshot.docs.map(doc => {
                const data = doc.data();
                const level = parseInt(data.level?.replace(/\D/g, '') || "0");
                return { id: doc.id, ...data, levelNum: level };
            });
            // Ensure we handle levels up to 10
            setRules(ruleList.sort((a, b) => a.levelNum - b.levelNum));
        });

        // Listen for existing notifications
        const qNotif = query(collection(db, "VipNotifications"));
        const unsubscribeNotif = onSnapshot(qNotif, (snapshot) => {
            const notifList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifList);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRules();
            unsubscribeNotif();
        };
    }, [router]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Show local preview
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        // 2. Immediate Upload to Cloudinary
        setUploading(true);
        const cloudFormData = new FormData();
        cloudFormData.append("file", file);
        cloudFormData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

        try {
            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'duv3y969s'}/image/upload`,
                { method: "POST", body: cloudFormData }
            );
            const fileData = await res.json();

            if (fileData.secure_url) {
                setFormData(prev => ({
                    ...prev,
                    imageUrl: fileData.secure_url,
                    publicId: fileData.public_id || ""
                }));
            } else {
                console.error("Cloudinary error:", fileData);
                alert("Upload failed. Please check your image or Cloudinary settings.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Error uploading image");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vipLevel || !formData.text) {
            alert("Please select a VIP level and enter congratulation text");
            return;
        }

        setUploading(true);
        try {
            // 1. Save or update existing notification for this level
            const docId = `vip_${formData.vipLevel}`;

            // Ensure no undefined values are sent to Firestore
            const saveData = {
                vipLevel: Number(formData.vipLevel),
                text: formData.text || "",
                imageUrl: formData.imageUrl || "",
                publicId: formData.publicId || "",
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "VipNotifications", docId), saveData);

            // Reset form
            setFormData({ vipLevel: 0, text: "", imageUrl: "", publicId: "" });
            setSelectedFile(null);
            setPreviewUrl("");
            alert("Notification saved successfully!");
        } catch (error: any) {
            console.error("Save error:", error);
            alert(`Failed to save notification: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const deleteNotification = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this notification?")) {
            try {
                await deleteDoc(doc(db, "VipNotifications", id));
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    };

    const editNotification = (notif: any) => {
        setFormData({
            vipLevel: notif.vipLevel,
            text: notif.text,
            imageUrl: notif.imageUrl,
            publicId: notif.publicId
        });
        setPreviewUrl(notif.imageUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white whitespace-pre-wrap">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30 md:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <PartyPopper size={20} className="text-indigo-600" />
                        <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">VIP Celebration</h1>
                    </div>
                    <div className="w-10"></div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10">
                    <div className="hidden md:flex items-center justify-between bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">VIP Achievement Ecosystem</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-500" />
                                Professional Reward Configuration — Supports up to 10 Levels
                            </p>
                        </div>
                        <div className="flex -space-x-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-12 h-12 rounded-2xl bg-indigo-50 border-4 border-white flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-600/5 hover:-translate-y-1 transition-transform cursor-default">
                                    <Crown size={20} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notification Form */}
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <form onSubmit={handleSaveNotification} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Details */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Crown size={14} className="text-amber-500" />
                                            VIP Tier
                                        </label>
                                        <select
                                            value={formData.vipLevel}
                                            onChange={(e) => setFormData({ ...formData, vipLevel: Number(e.target.value) })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                            required
                                        >
                                            <option value="">Select Target VIP Level</option>
                                            {rules.map(rule => (
                                                <option key={rule.id} value={rule.levelNum}>
                                                    VIP {rule.levelNum} - Promotion Goal
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                            <Bell size={14} className="text-indigo-500" />
                                            Congratulation Text
                                        </label>
                                        <textarea
                                            value={formData.text}
                                            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                                            placeholder="Write a message to wow the user on their achievement..."
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Image Section */}
                                <div className="space-y-8">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <ImageIcon size={14} className="text-indigo-500" />
                                        Celebration Image
                                    </label>

                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`aspect-video rounded-3xl border-4 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${previewUrl ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-100 bg-slate-50 group-hover:bg-slate-100'}`}>
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-[1.2rem]" />
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Drop Image Here</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">Max Size: 5MB</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {formData.vipLevel ? "Update Achievement Config" : "Save Celebration Settings"}
                                </button>

                                {formData.text && previewUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="md:w-fit px-10 bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        <PartyPopper size={18} />
                                        Live Preview
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Active Notifications List */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <Crown className="text-amber-500" size={18} />
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Achievement Cards</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {notifications.map((notif) => (
                                <div key={notif.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-600/5 transition-all duration-500">
                                    <div className="aspect-video relative overflow-hidden">
                                        <img src={notif.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        <div className="absolute top-4 left-4 bg-indigo-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            VIP {notif.vipLevel}
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <p className="text-sm font-bold text-slate-600 line-clamp-3 leading-relaxed">
                                            {notif.text}
                                        </p>
                                        <div className="flex items-center gap-3 pt-4">
                                            <button
                                                onClick={() => editNotification(notif)}
                                                className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                            >
                                                Edit Config
                                            </button>
                                            <button
                                                onClick={() => deleteNotification(notif.id)}
                                                className="w-12 h-12 bg-slate-50 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {notifications.length === 0 && (
                                <div className="col-span-full border-2 border-dashed border-slate-100 rounded-[3rem] p-16 flex flex-col items-center justify-center text-slate-300 gap-4">
                                    <Bell size={48} className="opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active celebration cards</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Live Preview Modal */}
            {showPreview && (
                <VipCelebrationCard
                    vipLevel={formData.vipLevel}
                    text={formData.text}
                    imageUrl={previewUrl}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
}
