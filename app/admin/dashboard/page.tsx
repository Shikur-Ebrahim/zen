"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Plus,
    Trash2,
    LogOut,
    Image as ImageIcon,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Menu,
    X,
    Home,
    Settings,
    UploadCloud,
    Camera,
    Bell,
    Banknote,
    ShieldCheck,
    Building2,
    Percent,
    Send,
    MessageSquare,
    BookOpen,
    UserX
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { useSearchParams } from "next/navigation";

function AdminDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("home");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) {
            if (tab === "settings") {
                router.push("/admin/settings");
                return;
            }
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Banner State
    const [banners, setBanners] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const unsubscribeBanners = onSnapshot(q, (snapshot) => {
            const bannerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanners(bannerData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBanners();
        };
    }, [router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUploadBanner = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setStatus({ type: "", message: "" });

        try {
            // 1. Upload to Cloudinary using unsigned preset
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "Turner");

            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "deve0w9bt";
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Cloudinary upload failed");
            }

            const data = await response.json();
            const downloadURL = data.secure_url;
            const publicId = data.public_id;

            // 2. Save to Firestore
            await addDoc(collection(db, "banners"), {
                url: downloadURL,
                publicId: publicId, // Store public_id for potential management
                createdAt: new Date().toISOString()
            });

            setSelectedFile(null);
            setPreviewUrl("");
            setStatus({ type: "success", message: "Banner uploaded to Cloudinary successfully!" });
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to upload banner to Cloudinary." });
        } finally {
            setUploading(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleDeleteBanner = async (banner: any) => {
        if (!confirm("Permanently delete this banner record?")) return;
        try {
            // Delete from Firestore only 
            // Note: Server-side deletion from Cloudinary requires signed requests
            await deleteDoc(doc(db, "banners", banner.id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem("admin_session");
        await signOut(auth);
        router.push("/");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            {/* Replaced Sidebar with Component */}
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Navbar */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-gray-600" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Manager / <span className="text-purple-600">{activeTab}</span>
                        </h2>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border-2 border-purple-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <main className="p-6 md:p-10 max-w-6xl mx-auto w-full">
                    {activeTab === "home" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-purple-900/5 relative overflow-hidden border border-gray-50">
                                <div className="relative z-10">
                                    <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Welcome, Admin! ✨</h1>
                                    <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                                        Managing the Turner Construction portal has never been easier. Use the sidebar to update banners, track team stats, or manage partners.
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                    <LayoutDashboard size={200} className="text-purple-600" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-purple-600 rounded-[2rem] p-8 text-white shadow-xl shadow-purple-600/20">
                                    <p className="text-purple-100 font-bold uppercase tracking-widest text-[10px] mb-2">Total Banners</p>
                                    <p className="text-4xl font-black">{banners.length}</p>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 border border-gray-100">
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">System Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <p className="text-2xl font-black text-gray-900 leading-none mt-1">Operational</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "banners" && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-purple-900/5 border border-gray-50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Banner Ads</h2>
                                        <p className="text-gray-500 font-medium">Upload new promotional images for the user welcome screen.</p>
                                    </div>
                                    <label className="group h-16 px-8 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3 cursor-pointer active:scale-95">
                                        <UploadCloud size={24} />
                                        Select File
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                    </label>
                                </div>

                                {status.message && (
                                    <div className={`mb-10 p-6 rounded-3xl flex items-center gap-4 border ${status.type === "success" ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                                        }`}>
                                        {status.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                        <span className="font-bold">{status.message}</span>
                                    </div>
                                )}

                                {previewUrl && (
                                    <div className="mb-10 p-8 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 animate-in zoom-in-95 duration-300">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="w-full md:w-80 aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl">
                                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                            </div>
                                            <div className="flex-1 space-y-4 text-center md:text-left">
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Upload Preview</p>
                                                <h3 className="text-2xl font-black text-gray-900">{selectedFile?.name}</h3>
                                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                                    <button
                                                        onClick={handleUploadBanner}
                                                        disabled={uploading}
                                                        className="px-8 py-4 bg-purple-600 text-white font-black rounded-2xl shadow-lg shadow-purple-600/20 transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {uploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                                                        Confirm Upload
                                                    </button>
                                                    <button
                                                        onClick={() => { setPreviewUrl(""); setSelectedFile(null); }}
                                                        className="px-8 py-4 bg-white text-gray-500 font-bold rounded-2xl border border-gray-200 transition-all hover:bg-gray-100"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                    {banners.map((banner) => (
                                        <div key={banner.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-2xl hover:shadow-purple-900/5 relative">
                                            <div className="aspect-[16/9] relative bg-gray-100">
                                                <img src={banner.url} className="w-full h-full object-cover" alt="Banner" />
                                                <div className="absolute top-4 right-4">
                                                    <button
                                                        onClick={() => handleDeleteBanner(banner)}
                                                        className="p-3 bg-red-600 text-white rounded-2xl shadow-xl shadow-red-600/30 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-white">
                                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                    <Camera size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Banner Image</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Added {new Date(banner.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {banners.length === 0 && (
                                        <div className="col-span-full py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                                            <ImageIcon size={48} className="mb-4 opacity-20" />
                                            <p className="font-bold uppercase tracking-widest text-[10px]">No banners collected</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                </main>
            </div>
        </div >
    );
}

export default function AdminDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        }>
            <AdminDashboard />
        </Suspense>
    );
}
