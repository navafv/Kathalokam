'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Play,
  Headphones,
  Sparkles,
  BookOpen,
  AlertCircle,
  Volume2,
} from 'lucide-react'

interface Story {
  id: string
  title_malayalam: string
  title_english: string
  genre: string
  description: string
  cover_emoji: string
  total_episodes: number
  status: string
  published_at: string
}

interface ListeningProgress {
  episodeId: string
  progress: number // 0-100
}

const GENRES = [
  { key: 'All', malayalam: 'എല്ലാം', english: 'All', emoji: '✨' },
  { key: 'Thriller', malayalam: 'ത്രില്ലർ', english: 'Thriller', emoji: '🔪' },
  { key: 'Romance', malayalam: 'പ്രണയം', english: 'Romance', emoji: '💕' },
  { key: 'Mystery', malayalam: 'രഹസ്യം', english: 'Mystery', emoji: '🔍' },
  { key: 'Comedy', malayalam: 'കോമഡി', english: 'Comedy', emoji: '😄' },
  { key: 'Drama', malayalam: 'നാടകം', english: 'Drama', emoji: '🎭' },
  { key: 'Horror', malayalam: 'ഭയം', english: 'Horror', emoji: '👻' },
  { key: 'Fantasy', malayalam: 'ഫാന്റസി', english: 'Fantasy', emoji: '🧙' },
]

// Unique gradient per story (cycles through palette)
const CARD_GRADIENTS = [
  'from-emerald-900/80 via-emerald-800/60 to-[#1B4332]/90',
  'from-[#1B4332]/90 via-amber-900/40 to-emerald-900/80',
  'from-amber-900/70 via-[#1B4332]/60 to-emerald-800/80',
  'from-emerald-800/80 via-[#D4A017]/20 to-[#1B4332]/90',
  'from-[#1B4332]/80 via-emerald-700/40 to-amber-900/60',
  'from-emerald-900/70 via-[#1B4332]/80 to-amber-800/50',
]

function StoryCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-[#1B4332]/10 bg-white/60 animate-pulse">
      <div className="aspect-square bg-[#1B4332]/10 shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#1B4332]/10 rounded-full w-3/4 shimmer" />
        <div className="h-3 bg-[#1B4332]/8 rounded-full w-1/2 shimmer" />
        <div className="h-3 bg-[#1B4332]/8 rounded-full w-full shimmer" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-[#D4A017]/20 rounded-full w-16 shimmer" />
          <div className="w-9 h-9 rounded-full bg-[#1B4332]/10 shimmer" />
        </div>
      </div>
    </div>
  )
}

function isNewStory(publishedAt: string): boolean {
  const published = new Date(publishedAt)
  const now = new Date()
  const diffMs = now.getTime() - published.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

function getStoryProgress(storyId: string, totalEpisodes: number): number {
  if (typeof window === 'undefined' || totalEpisodes === 0) return 0
  let completedCount = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('completed_')) {
      completedCount++
    }
  }
  // Simplified: check if any progress keys exist for this story's episodes
  // In a real app you'd track per-story completion
  return 0
}

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchPublishedStories = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('stories')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })

        if (fetchError) throw new Error(fetchError.message)
        setStories(data || [])
      } catch (err: any) {
        setError(err.message || 'കഥകൾ ലഭ്യമാക്കുന്നതിൽ പരാജയപ്പെട്ടു.')
      } finally {
        setLoading(false)
      }
    }
    fetchPublishedStories()
  }, [])

  const filteredStories = useMemo(() => {
    if (selectedGenre === 'All') return stories
    return stories.filter(
      (story) => story.genre.toLowerCase() === selectedGenre.toLowerCase()
    )
  }, [stories, selectedGenre])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'കഥാലോകം (Kathalokam)',
    alternateName: 'Free Malayalam Audio Stories',
    url: 'https://kathalokam.vercel.app',
    description: 'Listen to free Malayalam audio stories. Thrillers, romance, mystery and more.',
    inLanguage: 'ml',
  }

  return (
    <div className="min-h-screen flex flex-col font-serif bg-[#FDF6EC] text-[#1B4332]">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent 25%, rgba(27,67,50,0.06) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s infinite;
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .wave-bar { animation: wave 1.2s ease-in-out infinite; }
        .wave-bar:nth-child(1) { animation-delay: 0s; }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; }
        .wave-bar:nth-child(6) { animation-delay: 0.3s; }
        .wave-bar:nth-child(7) { animation-delay: 0.2s; }
        .wave-bar:nth-child(8) { animation-delay: 0.1s; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .float { animation: float 3s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-slide-up { animation: fadeSlideUp 0.5s ease-out forwards; }
      `}</style>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── STICKY HEADER ─────────────────────────────────────────── */}
      <header className="border-b border-[#1B4332]/15 bg-[#FDF6EC]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1B4332] text-[#D4A017] flex items-center justify-center shadow-md flex-shrink-0">
              <Headphones className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[family-name:var(--font-malayalam)] text-[#1B4332]">
              കഥാലോകം
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B4332]/5 border border-[#1B4332]/15">
            <Sparkles className="h-3.5 w-3.5 text-[#D4A017] animate-pulse" />
            <span className="text-xs font-semibold font-[family-name:var(--font-malayalam)] tracking-wide text-[#1B4332]">
              സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ
            </span>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1B4332] text-[#FDF6EC] py-14 sm:py-20 px-4 sm:px-6">
        {/* CSS-only decorative pattern background */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #D4A017 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, #D4A017 1px, transparent 1px),
              radial-gradient(circle at 60% 80%, #D4A017 1px, transparent 1px)`,
            backgroundSize: '60px 60px, 80px 80px, 50px 50px',
          }}
        />
        {/* Subtle warm glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4A017]/10 via-transparent to-emerald-900/30 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="flex-1 text-center lg:text-left space-y-5">
            {/* Animated waveform */}
            <div className="flex items-end justify-center lg:justify-start gap-1 h-10 mb-2">
              {[40, 70, 55, 90, 65, 80, 50, 70].map((h, i) => (
                <div
                  key={i}
                  className="wave-bar w-1.5 rounded-full bg-[#D4A017]/70"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
              <Volume2 className="h-5 w-5 text-[#D4A017]/60 ml-2 self-center" />
            </div>

            <div>
              <p className="text-[#D4A017] font-semibold text-sm sm:text-base tracking-widest uppercase mb-2 font-sans">
                Malayalam Audio Stories
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-[family-name:var(--font-malayalam)] leading-tight text-[#FDF6EC]">
                കഥകളുടെ ലോകത്തേക്ക് സ്വാഗതം
              </h2>
              <p className="text-base sm:text-lg text-[#FDF6EC]/70 font-sans mt-3 max-w-xl lg:mx-0 mx-auto leading-relaxed">
                Welcome to the world of stories — free Malayalam audio stories spanning thrillers, romance, mystery, and more. All AI-crafted, entirely free.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/30">
                <span className="text-[#D4A017] text-lg">📖</span>
                <span className="font-[family-name:var(--font-malayalam)] text-sm font-semibold text-[#FDF6EC]">
                  സൗജന്യം · Free
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <span className="text-lg">🎧</span>
                <span className="text-sm font-semibold text-[#FDF6EC]/85 font-sans">
                  No subscription
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <span className="text-lg">✨</span>
                <span className="text-sm font-semibold text-[#FDF6EC]/85 font-sans">
                  AI-crafted
                </span>
              </div>
            </div>
          </div>

          {/* Decorative book stack */}
          <div className="float flex-shrink-0 hidden sm:flex flex-col items-center gap-3">
            <div className="w-36 h-36 lg:w-44 lg:h-44 rounded-2xl bg-gradient-to-br from-[#D4A017]/30 via-amber-800/20 to-emerald-900/40 border border-[#D4A017]/30 flex items-center justify-center text-7xl lg:text-8xl shadow-2xl">
              📚
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-[#D4A017] font-sans">
                {stories.length > 0 ? `${stories.length}+` : '∞'}
              </div>
              <div className="font-[family-name:var(--font-malayalam)] text-sm text-[#FDF6EC]/70">
                കഥകൾ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Genre Scroll — Rich Cards */}
        <div>
          <h3 className="text-sm font-bold font-sans uppercase tracking-widest text-[#1B4332]/50 mb-3 px-0.5">
            Browse by Genre
          </h3>
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {GENRES.map((genre) => {
              const isSelected = selectedGenre === genre.key
              return (
                <button
                  key={genre.key}
                  onClick={() => setSelectedGenre(genre.key)}
                  className={`
                    relative flex-shrink-0 snap-start flex flex-col items-center justify-center gap-1.5
                    w-20 sm:w-24 py-3 px-2 rounded-xl border transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF6EC]
                    min-h-[72px]
                    ${isSelected
                      ? 'bg-[#1B4332] border-[#1B4332] shadow-lg text-[#FDF6EC]'
                      : 'bg-white/80 border-[#1B4332]/15 hover:border-[#1B4332]/40 hover:bg-white text-[#1B4332]'
                    }
                  `}
                  aria-pressed={isSelected}
                >
                  <span className="text-2xl leading-none">{genre.emoji}</span>
                  <span className={`text-[10px] font-bold font-[family-name:var(--font-malayalam)] leading-tight text-center ${isSelected ? 'text-[#D4A017]' : 'text-[#1B4332]'}`}>
                    {genre.malayalam}
                  </span>
                  <span className={`text-[9px] font-sans leading-tight ${isSelected ? 'text-[#FDF6EC]/70' : 'text-[#1B4332]/50'}`}>
                    {genre.english}
                  </span>
                  {isSelected && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#D4A017] rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section header */}
        {!loading && !error && filteredStories.length > 0 && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
              {selectedGenre === 'All' ? 'എല്ലാ കഥകളും' : GENRES.find(g => g.key === selectedGenre)?.malayalam || selectedGenre}
            </h2>
            <span className="text-sm font-sans font-semibold text-[#1B4332]/50">
              {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
            </span>
          </div>
        )}

        {/* Loading — Shimmer Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-md mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-800 font-sans shadow-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-sm font-semibold font-[family-name:var(--font-malayalam)]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2.5 bg-[#1B4332] text-[#FDF6EC] text-xs font-semibold rounded-lg hover:bg-[#1B4332]/90 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
            >
              വീണ്ടും ശ്രമിക്കുക (Retry)
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredStories.length === 0 && (
          <div className="py-20 text-center space-y-3 font-sans fade-slide-up">
            <div className="w-20 h-20 bg-[#1B4332]/5 rounded-full flex items-center justify-center mx-auto text-4xl">
              📭
            </div>
            <h3 className="text-lg font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
              കഥകൾ ഒന്നും ലഭ്യമല്ല
            </h3>
            <p className="text-xs text-[#1B4332]/60 max-w-sm mx-auto">
              No stories found in "{selectedGenre}" yet. More are being crafted — check back soon!
            </p>
            <button
              onClick={() => setSelectedGenre('All')}
              className="mt-3 px-5 py-2.5 bg-[#1B4332] text-[#FDF6EC] text-sm font-semibold rounded-full hover:bg-[#1B4332]/90 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
            >
              Show all stories
            </button>
          </div>
        )}

        {/* Stories Grid */}
        {!loading && !error && filteredStories.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {filteredStories.map((story, index) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
              const isNew = isNewStory(story.published_at)
              const progressPct = progressMap[story.id] || 0

              return (
                <Link
                  key={story.id}
                  href={`/story/${story.id}`}
                  className="group rounded-2xl overflow-hidden border border-[#1B4332]/15 bg-white/90 hover:bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 fade-slide-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                  aria-label={`${story.title_malayalam} — ${story.title_english || ''}`}
                >
                  {/* Square cover art */}
                  <div className={`relative aspect-square bg-gradient-to-br ${gradient} flex flex-col items-center justify-center overflow-hidden`}>
                    {/* Pattern overlay */}
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: 'radial-gradient(circle, rgba(212,160,23,0.3) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />

                    {/* Emoji */}
                    <span className="relative z-10 text-5xl sm:text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                      {story.cover_emoji || '📖'}
                    </span>

                    {/* Genre label */}
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/40 to-transparent">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4A017] font-sans">
                        {story.genre}
                      </span>
                    </div>

                    {/* "New" badge in Malayalam */}
                    {isNew && (
                      <div className="absolute top-2.5 right-2.5 bg-[#D4A017] text-[#1B4332] px-2 py-0.5 rounded-full text-[9px] font-bold font-[family-name:var(--font-malayalam)] shadow-md">
                        പുതിയത്
                      </div>
                    )}

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-[#D4A017] flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-200">
                        <Play className="h-5 w-5 fill-[#1B4332] text-[#1B4332] ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-3 sm:p-4 space-y-2">
                    <div className="flex-1 space-y-1">
                      <h2 className="text-sm sm:text-base font-bold font-[family-name:var(--font-malayalam)] leading-snug text-[#1B4332] line-clamp-2 group-hover:text-[#1B4332] transition-colors">
                        {story.title_malayalam}
                      </h2>
                      {story.title_english && (
                        <p className="text-[11px] font-sans font-medium text-[#1B4332]/55 line-clamp-1 italic">
                          {story.title_english}
                        </p>
                      )}
                      {story.description && (
                        <p className="text-[11px] font-sans text-[#1B4332]/65 line-clamp-2 mt-1 leading-relaxed hidden sm:block">
                          {story.description}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="pt-1 flex items-center justify-between gap-2 font-sans">
                      <span className="text-[10px] font-semibold text-[#1B4332]/60">
                        {story.total_episodes} {story.total_episodes === 1 ? 'ep' : 'eps'}
                      </span>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1B4332] group-hover:bg-[#1B4332]/90 text-[#FDF6EC] flex items-center justify-center shadow-sm flex-shrink-0 transition-colors min-h-[44px] min-w-[44px] -mr-1 -mb-1">
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    {progressPct > 0 && (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] font-sans text-[#1B4332]/50">
                          <span>Progress</span>
                          <span>{Math.round(progressPct)}%</span>
                        </div>
                        <div className="h-1 bg-[#1B4332]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D4A017] rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1B4332]/15 bg-[#FDF6EC] py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center font-sans space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#1B4332] text-[#D4A017] flex items-center justify-center">
              <Headphones className="h-4 w-4" />
            </div>
            <span className="font-[family-name:var(--font-malayalam)] font-bold text-[#1B4332]">
              കഥാലോകം
            </span>
          </div>
          <p className="text-xs font-semibold text-[#1B4332]/60 tracking-wide">
            Malayalam AI Stories · 100% Free · No ads · No subscription
          </p>
          <p className="text-[10px] text-[#1B4332]/35">
            Built with love for Malayalam literature lovers everywhere.
          </p>
        </div>
      </footer>
    </div>
  )
}