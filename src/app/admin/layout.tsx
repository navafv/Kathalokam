'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Sparkles,
    BookOpen,
    Clock,
    CheckCircle2,
    LogOut,
    Menu,
    X
} from 'lucide-react'

const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Generate Story', href: '/admin/generate', icon: Sparkles },
    { name: 'All Stories', href: '/admin/stories', icon: BookOpen },
    { name: 'Pending Approval', href: '/admin/pending', icon: Clock },
    { name: 'Published', href: '/admin/published', icon: CheckCircle2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [authorized, setAuthorized] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Password Gate
    useEffect(() => {
        if (pathname === '/admin/login') {
            setAuthorized(true)
            return
        }
        const isAuth = localStorage.getItem('admin_auth')
        if (isAuth !== 'kathalokam2024') {
            router.push('/admin/login')
        } else {
            setAuthorized(true)
        }
    }, [pathname, router])

    const handleLogout = () => {
        localStorage.removeItem('admin_auth')
        router.push('/admin/login')
    }

    // Skip rendering sidebar layout for login route
    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    if (!authorized) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="h-8 w-8 bg-slate-900 rounded-full"></div>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Verifying Access...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
            {/* Top Mobile Header */}
            <header className="bg-slate-900 text-white flex items-center justify-between px-4 py-3 md:hidden sticky top-0 z-50 border-b border-slate-800">
                <span className="text-xl font-extrabold tracking-tight">കഥാലോകം </span>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-300 focus:outline-none"
                    aria-label="Toggle Menu"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>
            {/* Mobile Off-canvas Navigation Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-white pt-5 pb-4">
                        <div className="px-6 pb-4 border-b border-slate-800">
                            <span className="text-2xl font-extrabold tracking-tight block">കഥാലോകം </span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mt-0.5">Admin Portal</span>
                        </div>
                        <nav className="mt-6 flex-1 px-3 space-y-1 overflow-y-auto">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span>{item.name}</span>
                                    </Link>
                                )
                            })}
                        </nav>
                        <div className="px-3 mt-auto pt-4 border-t border-slate-800">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5
                            text-sm font-medium text-red-400 hover:bg-slate-800/50 rounded-lg transition"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 text-white border-r border-slate-800">
                <div className="p-6 border-b border-slate-800">
                    <span className="text-3xl font-extrabold tracking-tight block text-white">
                        കഥാലോകം
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mt-1">
                        Admin Control Panel
                    </span>
                </div>
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition ${isActive ? 'bg-slate-800 text-white shadow-sm font-semibold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                            >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>
                <div className="p-3 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-slate-800/50 rounded-lg transition"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>
            {/* Main Content Area */}
            <main className="flex-1 md:pl-64 min-h-screen bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </main>
        </div >
    )
}