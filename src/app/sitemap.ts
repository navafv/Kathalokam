import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch all published stories
    const { data: stories } = await supabase
        .from('stories')
        .select('id, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

    const baseUrl = 'https://kathalokam.vercel.app'

    // Standard static routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ]

    // Dynamic story routes
    const storyRoutes: MetadataRoute.Sitemap = (stories || []).map((story) => ({
        url: `${baseUrl}/story/${story.id}`,
        lastModified: new Date(story.published_at || new Date()),
        changeFrequency: 'weekly',
        priority: 0.8,
    }))

    return [...staticRoutes, ...storyRoutes]
}