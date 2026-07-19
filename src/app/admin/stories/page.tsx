'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Clock, CheckCircle2, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

interface Story {
    id: string
    title_malayalam: string
    title_english: string
    genre: string
    total_episodes: number
    status: string
    created_at: string
}

export default function AllStoriesPage() {
    const [stories, setStories] = useState<Story[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchStories = async () => {
            try {
                setLoading(true)
                const { data, error: err } = await supabase
                    .from('stories')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (err) throw err
                setStories(data || [])
            } catch (err: any) {
                setError(err.message || 'Failed to fetch stories')
            } finally {
                setLoading(false)
            }
        }
        fetchStories()
    }, [])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Approved</span>
            case 'published':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><CheckCircle2 className="h-3 w-3" /> Published</span>
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Clock className="h-3 w-3" /> Draft</span>
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Stories ({stories.length})</h1>
                <p className="text-sm text-slate-500 mt-1">Manage and review all generated Malayalam audio stories.</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {stories.length === 0 && !error ? (
                <div className="p-12 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">No stories generated yet.</p>
                    <Link href="/admin/generate" className="mt-3 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg">
                        Generate Your First Story
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100">
                        {stories.map((story) => (
                            <div key={story.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                                            {story.genre}
                                        </span>
                                        {getStatusBadge(story.status)}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{story.title_malayalam}</h3>
                                    <p className="text-xs text-slate-500 font-medium">{story.title_english} • {story.total_episodes} Episodes</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/admin/stories/${story.id}`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                                    >
                                        <span>Review & Manage</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}