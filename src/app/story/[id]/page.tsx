import type { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import StoryClientPage from './StoryClientPage'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
    params: { id: string }
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const id = params.id

    const { data: story } = await supabase
        .from('stories')
        .select('title_malayalam, title_english, description, genre')
        .eq('id', id)
        .single()

    if (!story) {
        return {
            title: 'കഥ കണ്ടെത്താനായില്ല (Story Not Found) — കഥാലോകം',
        }
    }

    const title = `${story.title_malayalam} — കഥാലോകം`
    const description = story.description || `Listen to ${story.title_english || story.title_malayalam}, a free Malayalam ${story.genre} audio story on Kathalokam.`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'article',
            url: `https://kathalokam.com/story/${id}`,
            siteName: 'കഥാലോകം',
            images: [
                {
                    url: '/og-image.png',
                    width: 1200,
                    height: 630,
                    alt: story.title_malayalam,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/og-image.png'],
        },
    }
}

export default function StoryDetailPage({ params }: Props) {
    return <StoryClientPage storyId={params.id} />
}