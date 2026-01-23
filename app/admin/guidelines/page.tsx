"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import {
    ChevronLeft,
    Save,
    UploadCloud,
    Loader2,
    Plus,
    Trash2,
    Image as ImageIcon,
    LayoutDashboard,
    AlertCircle,
    CheckCircle2,
    Building2,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

const CATEGORIES = [
    { id: "welcome", label: "Welcome Message", description: "First greeting message with image" },
    { id: "goal", label: "Company Goal", description: "Define the company mission and vision" },
    { id: "recharge", label: "How to Recharge", description: "Instructions for topping up balance" },
    { id: "product", label: "How to Buy Product", description: "Guide on purchasing packages" },
    { id: "invite", label: "How to Invite User", description: "Referral program guidelines" }
];

export default function AdminGuidelines() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [guidelines, setGuidelines] = useState<any>({});
    const [uploading, setUploading] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchGuidelines = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "guidelines"));
                const data: any = {};
                querySnapshot.forEach((doc) => {
                    data[doc.id] = doc.data();
                });
                setGuidelines(data);
            } catch (error) {
                console.error("Error fetching guidelines:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGuidelines();
    }, []);

    const handleSave = async (categoryId: string) => {
        setSaving(categoryId);
        setStatus({ type: "", message: "" });

        try {
            const data = guidelines[categoryId] || { text: "", imageUrl: "" };
            await setDoc(doc(db, "guidelines", categoryId), {
                ...data,
                updatedAt: new Date().toISOString()
            });
            setStatus({ type: "success", message: `${categoryId} guideline updated successfully!` });
        } catch (error) {
            console.error(error);
            setStatus({ type: "error", message: "Failed to save guidelines." });
        } finally {
            setSaving(null);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(categoryId);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "Turner");

        try {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "deve0w9bt";
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                { method: "POST", body: formData }
            );

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            setGuidelines((prev: any) => ({
                ...prev,
                [categoryId]: {
                    ...(prev[categoryId] || {}),
                    imageUrl: data.secure_url
                }
            }));
        } catch (error) {
            console.error(error);
            setStatus({ type: "error", message: "Image upload failed." });
        } finally {
            setUploading(null);
        }
    };

    const handleTextChange = (categoryId: string, text: string) => {
        setGuidelines((prev: any) => ({
            ...prev,
            [categoryId]: {
                ...(prev[categoryId] || {}),
                text
            }
        }));
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
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden overflow-y-auto">
                <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="md:hidden w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    <Menu size={20} />
                                </button>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3 lowercase">
                                    <Plus className="text-purple-600" /> Guideline Settings
                                </h1>
                            </div>
                            <p className="text-gray-500 text-sm font-medium ml-13">Manage instructional content and images for newcomer support chat.</p>
                        </div>

                        {status.message && (
                            <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${status.type === "success" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                                }`}>
                                {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                {status.message}
                            </div>
                        )}
                    </div>

                    {/* Grid of Guideline Editors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {CATEGORIES.map((cat) => (
                            <div key={cat.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6 relative overflow-hidden group">
                                {/* Category Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors"></div>

                                <div className="relative z-10">
                                    <h2 className="text-xl font-black text-gray-900 mb-1">{cat.label}</h2>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{cat.description}</p>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Instructional Text</label>
                                        <textarea
                                            value={guidelines[cat.id]?.text || ""}
                                            onChange={(e) => handleTextChange(cat.id, e.target.value)}
                                            placeholder={`Enter ${cat.label} instructions...`}
                                            className="w-full h-32 p-5 rounded-3xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-600/20 text-sm font-medium resize-none placeholder:text-gray-300"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tutorial Image</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group/img relative">
                                                {guidelines[cat.id]?.imageUrl ? (
                                                    <>
                                                        <img src={guidelines[cat.id].imageUrl} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Trash2
                                                                size={18}
                                                                className="text-white cursor-pointer hover:scale-110 transition-transform"
                                                                onClick={() => setGuidelines((prev: any) => ({ ...prev, [cat.id]: { ...prev[cat.id], imageUrl: "" } }))}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <ImageIcon size={24} className="text-gray-300" />
                                                )}
                                                {uploading === cat.id && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <Loader2 size={18} className="animate-spin text-purple-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    id={`file-${cat.id}`}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, cat.id)}
                                                />
                                                <label
                                                    htmlFor={`file-${cat.id}`}
                                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-50 text-purple-600 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-purple-100 transition-colors"
                                                >
                                                    <UploadCloud size={16} />
                                                    {guidelines[cat.id]?.imageUrl ? "Change Image" : "Upload Image"}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSave(cat.id)}
                                    disabled={saving === cat.id}
                                    className={`
                                    w-full py-4 rounded-3xl flex items-center justify-center gap-3 transition-all
                                    ${saving === cat.id
                                            ? "bg-gray-100 text-gray-400"
                                            : "bg-purple-600 text-white shadow-xl shadow-purple-600/20 hover:bg-purple-700 active:scale-[0.98]"
                                        }
                                `}
                                >
                                    {saving === cat.id ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-xs font-black uppercase tracking-widest">Update {cat.label}</span>
                                            <Save size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
