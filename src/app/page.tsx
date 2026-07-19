'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Play, Headphones, Sparkles, AlertCircle, Volume2, Mic2 } from 'lucide-react'

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

const CARD_COLORS = [
  { from: '#4F1B8C', via: '#7C3AED', to: '#1E0A4A' },
  { from: '#831843', via: '#DB2777', to: '#3B0764' },
  { from: '#064E3B', via: '#059669', to: '#1C1038' },
  { from: '#7C2D12', via: '#EA580C', to: '#1A0A2E' },
  { from: '#1E3A5F', via: '#2563EB', to: '#0F172A' },
  { from: '#3B1F63', via: '#9333EA', to: '#0F0A20' },
]

function StoryCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden glass">
      <div className="aspect-[3/4] shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 shimmer rounded-full w-3/4" />
        <div className="h-3 shimmer rounded-full w-1/2" />
        <div className="h-3 shimmer rounded-full w-full" />
      </div>
    </div>
  )
}

function isNewStory(publishedAt: string): boolean {
  const diff = new Date().getTime() - new Date(publishedAt).getTime()
  return diff / (1000 * 60 * 60 * 24) <= 7
}

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState('All')
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const { data, error: e } = await supabase
          .from('stories').select('*').eq('status', 'published')
          .order('published_at', { ascending: false })
        if (e) throw new Error(e.message)
        setStories(data || [])
      } catch (err: any) {
        setError(err.message || 'കഥകൾ ലഭ്യമാക്കുന്നതിൽ പരാജയപ്പെട്ടു.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const filteredStories = useMemo(() => {
    if (selectedGenre === 'All') return stories
    return stories.filter(s => s.genre.toLowerCase() === selectedGenre.toLowerCase())
  }, [stories, selectedGenre])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'കഥാലോകം (Kathalokam)',
    url: 'https://kathalokam.vercel.app',
    description: 'Free Malayalam audio stories — thrillers, romance, mystery and more.',
    inLanguage: 'ml',
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080C18] text-[#F0F0FF]" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <style>{`
        .wave-bar { animation: waveform 1.2s ease-in-out infinite; transform-origin: bottom; }
        @keyframes waveform { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        .float { animation: floatAnim 4s ease-in-out infinite; }
        @keyframes floatAnim { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.5s ease-out forwards; }
        .mesh-bg {
          background: radial-gradient(ellipse at 20% 30%, rgba(168,85,247,0.25) 0%, transparent 55%),
                      radial-gradient(ellipse at 80% 70%, rgba(236,72,153,0.2) 0%, transparent 55%),
                      radial-gradient(ellipse at 60% 10%, rgba(245,200,66,0.1) 0%, transparent 40%),
                      #080C18;
        }
        .card-glow:hover { box-shadow: 0 0 40px rgba(168,85,247,0.2); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        .genre-pill { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .genre-pill.active { background: linear-gradient(135deg,#A855F7,#EC4899); box-shadow: 0 0 20px rgba(168,85,247,0.4); }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'rgba(8,12,24,0.85)', backdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
              <Headphones className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-malayalam)' }}>
                കഥാലോകം
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
            <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            <span className="text-xs font-semibold text-purple-300 tracking-wide"
              style={{ fontFamily: 'var(--font-malayalam)' }}>
              സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ
            </span>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden mesh-bg py-16 sm:py-24 px-4 sm:px-6">
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #A855F7, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #EC4899, transparent)' }} />

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 text-center lg:text-left space-y-6">

            {/* Animated waveform */}
            <div className="flex items-end justify-center lg:justify-start gap-1 h-8">
              {[30, 60, 45, 80, 55, 70, 40, 65, 35, 55].map((h, i) => (
                <div key={i} className="wave-bar rounded-full"
                  style={{ width: '3px', height: `${h}%`, background: `linear-gradient(to top,#A855F7,#EC4899)`, animationDelay: `${i * 0.1}s` }} />
              ))}
              <Volume2 className="h-4 w-4 text-purple-400/60 ml-2 self-center" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#C084FC' }}>
                <Mic2 className="h-3 w-3" />
                Malayalam Audio Stories
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight"
                style={{ fontFamily: 'var(--font-malayalam)', color: '#F0F0FF' }}>
                കഥകളുടെ{' '}
                <span style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899,#F5C842)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  ലോകത്തേക്ക്
                </span>
              </h2>
              <p className="text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ color: 'rgba(240,240,255,0.6)' }}>
                Immerse yourself in free AI-crafted Malayalam audio stories — thrillers, romance, mystery, and more. No subscription, no ads, forever free.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {[
                { icon: '🎧', label: 'No Subscription', color: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#C084FC' },
                { icon: '✨', label: 'AI-Crafted', color: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)', text: '#F472B6' },
                { icon: '📖', label: '100% Free · സൗജന്യം', color: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.3)', text: '#FCD34D', ml: true },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ background: b.color, border: `1px solid ${b.border}`, color: b.text, fontFamily: b.ml ? 'var(--font-malayalam)' : undefined }}>
                  <span>{b.icon}</span>
                  <span className="text-xs font-semibold">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating stats */}
          <div className="float flex-shrink-0 hidden sm:flex flex-col items-center gap-4">
            <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-3xl flex items-center justify-center text-7xl lg:text-8xl shadow-2xl"
              style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.15))', border: '1px solid rgba(168,85,247,0.3)', backdropFilter: 'blur(20px)' }}>
              📚
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold"
                style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {stories.length > 0 ? `${stories.length}+` : '∞'}
              </div>
              <div className="text-sm font-semibold mt-1" style={{ color: 'rgba(240,240,255,0.5)', fontFamily: 'var(--font-malayalam)' }}>
                കഥകൾ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Genre pills */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(240,240,255,0.3)' }}>
            Browse by Genre
          </p>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
            {GENRES.map((g) => {
              const active = selectedGenre === g.key
              return (
                <button key={g.key} onClick={() => setSelectedGenre(g.key)}
                  className={`genre-pill flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 min-h-[44px] ${active ? 'active text-white border-transparent' : 'text-white/60 border-white/10 hover:border-white/20 hover:text-white/80'}`}
                  style={active ? {} : { background: 'rgba(255,255,255,0.04)' }}
                  aria-pressed={active}>
                  <span className="text-base">{g.emoji}</span>
                  <span style={{ fontFamily: 'var(--font-malayalam)' }}>{g.malayalam}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section header */}
        {!loading && !error && filteredStories.length > 0 && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
              {selectedGenre === 'All' ? 'എല്ലാ കഥകളും' : GENRES.find(g => g.key === selectedGenre)?.malayalam || selectedGenre}
            </h2>
            <span className="text-sm font-semibold" style={{ color: 'rgba(240,240,255,0.35)' }}>
              {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
            </span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <StoryCardSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="max-w-md mx-auto my-12 p-8 rounded-2xl text-center space-y-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="h-10 w-10 mx-auto text-red-400" />
            <p className="text-sm font-semibold text-red-300" style={{ fontFamily: 'var(--font-malayalam)' }}>{error}</p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white min-h-[44px]"
              style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
              വീണ്ടും ശ്രമിക്കുക
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredStories.length === 0 && (
          <div className="py-24 text-center space-y-4 fade-up">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>📭</div>
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
              കഥകൾ ഒന്നും ലഭ്യമല്ല
            </h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'rgba(240,240,255,0.45)' }}>
              No stories in "{selectedGenre}" yet. More are being crafted — check back soon!
            </p>
            <button onClick={() => setSelectedGenre('All')} className="mt-3 px-6 py-3 rounded-full text-sm font-bold text-white min-h-[44px]"
              style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
              Show all stories
            </button>
          </div>
        )}

        {/* Stories grid */}
        {!loading && !error && filteredStories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredStories.map((story, index) => {
              const color = CARD_COLORS[index % CARD_COLORS.length]
              const isNew = isNewStory(story.published_at)

              return (
                <Link key={story.id} href={`/story/${story.id}`}
                  className="group rounded-2xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C18] fade-up card-glow transition-all duration-300"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', animationDelay: `${index * 50}ms` }}
                  aria-label={`${story.title_malayalam} — ${story.title_english || ''}`}>

                  {/* Cover */}
                  <div className="relative aspect-[3/4] flex flex-col items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(160deg, ${color.from}, ${color.via}, ${color.to})` }}>

                    {/* Dot pattern */}
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

                    {/* Glow orb */}
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-2xl opacity-50"
                      style={{ background: color.via }} />

                    <span className="relative z-10 text-5xl sm:text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl">
                      {story.cover_emoji || '📖'}
                    </span>

                    {/* Genre chip */}
                    <div className="absolute bottom-3 left-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}>
                        {story.genre}
                      </span>
                    </div>

                    {/* New badge */}
                    {isNew && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)', color: 'white' }}>
                        NEW
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: 'rgba(0,0,0,0.35)' }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300"
                        style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
                        <Play className="h-5 w-5 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3 sm:p-4 space-y-2">
                    <h2 className="text-sm sm:text-base font-bold leading-snug line-clamp-2 text-white"
                      style={{ fontFamily: 'var(--font-malayalam)' }}>
                      {story.title_malayalam}
                    </h2>
                    {story.title_english && (
                      <p className="text-[11px] font-medium italic line-clamp-1" style={{ color: 'rgba(240,240,255,0.4)' }}>
                        {story.title_english}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(168,85,247,0.15)', color: '#C084FC' }}>
                        {story.total_episodes} eps
                      </span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
                        <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t py-10 mt-8" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-7xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
              കഥാലോകം
            </span>
          </div>
          <p className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(240,240,255,0.35)' }}>
            Malayalam AI Stories · 100% Free · No ads · No subscription
          </p>
          <p className="text-[10px]" style={{ color: 'rgba(240,240,255,0.2)' }}>
            Built with love for Malayalam literature lovers everywhere.
          </p>
        </div>
      </footer>
    </div>
  )
}
