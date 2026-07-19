import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/admin/'], // Protect admin panel & backend triggers
        },
        sitemap: 'https://kathalokam.vercel.app/sitemap.xml',
    }
}