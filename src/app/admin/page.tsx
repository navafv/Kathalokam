'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Clock, CheckCircle2, Layers, RefreshCw } from
    'lucide-react'
interface DashboardStats {
    totalStories: number
    pendingApproval: number
    publishedStories: number
    totalEpisodes: number
}
export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalStories: 0,
        pendingApproval: 0,
        publishedStories: 0,
        totalEpisodes: 0,
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const supabase = createClient()
    const fetchStats = async () => {
        try {
            setRefreshing(true)
            // Parallel queries using count: 'exact', head: true for optimal efficiency

            const [
                { count: totalStoriesCount },
                { count: pendingCount },
                { count: publishedCount },
                { count: episodesCount },
            ] = await Promise.all([
                supabase.from('stories').select('*', {
                    count: 'exact', head:

                        true
                }),

                supabase.from('stories').select('*', {
                    count: 'exact', head:

                        true
                }).eq('status', 'draft'),

                supabase.from('stories').select('*', {
                    count: 'exact', head:

                        true
                }).eq('status', 'published'),

                supabase.from('episodes').select('*', {
                    count: 'exact', head:

                        true
                }),
            ])
            setStats({
                totalStories: totalStoriesCount || 0,
                pendingApproval: pendingCount || 0,
                publishedStories: publishedCount || 0,
                totalEpisodes: episodesCount || 0,
            })
        } catch (error) {
            console.error('Failed to fetch dashboard metrics:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }
    useEffect(() => {
        fetchStats()
    }, [])
    const statCards = [
        {
            title: 'Total Stories',
            value: stats.totalStories,
            icon: BookOpen,
            iconBg: 'bg-slate-100 text-slate-800',
            description: 'All generated and draft stories',
        },
        {
            title: 'Pending Approval',
            value: stats.pendingApproval,
            icon: Clock,
            iconBg: 'bg-amber-50 text-amber-600',
            description: 'Stories waiting for script/audio review',

        },
        {
            title: 'Published',
            value: stats.publishedStories,
            icon: CheckCircle2,
            iconBg: 'bg-emerald-50 text-emerald-600',
            description: 'Live audio stories on the platform',
        },
        {
            title: 'Total Episodes',
            value: stats.totalEpisodes,
            icon: Layers,
            iconBg: 'bg-blue-50 text-blue-600',
            description: 'Total individual audio episodes produced',
        },
    ]
    return (
        <div className="space-y-8">
            {/* Page Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time content creation and publication analytics for കഥാലോകം.</p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((card, index) => {
                    const Icon = card.icon
                    return (
                        <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {card.title}
                                </span>
                                <div className={`p-2.5 rounded-lg ${card.iconBg}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline gap-2">
                                {loading ? (
                                    <div className="h-8 w-16 bg-slate-100 animate-pulse rounded"></div>
                                ) : (
                                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                        {card.value.toLocaleString()}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-normal border-t border-slate-50 pt-3">
                                {card.description}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}