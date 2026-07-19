import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'കഥാലോകം — സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ'
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
    // Fetch Noto Serif Malayalam from Google Fonts for authentic typography in the image
    const fontData = await fetch(
        new URL('https://fonts.gstatic.com/s/notoserifmalayalam/v21/0nkoC9D2W31u1H0fS_Vf3Zf3ePZZYgGv7H-s5Q.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer())

    return new ImageResponse(
        (
            // ImageResponse JSX element (styled with Satori-compatible Flexbox properties)
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1B4332', // Brand Deep Forest Green
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(212, 160, 23, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(253, 246, 236, 0.08) 0%, transparent 50%)',
                    color: '#FDF6EC', // Brand Cream
                    fontFamily: '"Noto Serif Malayalam", serif',
                    padding: '60px',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                {/* Top Decorative Border Accent */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        backgroundColor: '#D4A017', // Brand Gold
                    }}
                />

                {/* Cover Emoji / Logo Circle */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '140px',
                        height: '140px',
                        borderRadius: '70px',
                        backgroundColor: 'rgba(253, 246, 236, 0.1)',
                        border: '3px solid #D4A017',
                        fontSize: '72px',
                        marginBottom: '32px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    📖
                </div>

                {/* Main Malayalam Title */}
                <div
                    style={{
                        fontSize: '84px',
                        fontWeight: 700,
                        color: '#FDF6EC',
                        letterSpacing: '-0.02em',
                        marginBottom: '16px',
                        textShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    കഥാലോകം
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: '32px',
                        color: '#D4A017', // Brand Gold
                        fontWeight: 600,
                        marginBottom: '40px',
                    }}
                >
                    സൗജന്യ മലയാളം ഓഡിയോ കഥകൾ
                </div>

                {/* Feature Badges Footer */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        fontSize: '20px',
                        color: 'rgba(253, 246, 236, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: '12px 32px',
                        borderRadius: '40px',
                        border: '1px solid rgba(253, 246, 236, 0.15)',
                    }}
                >
                    <span>✨ 100% Free</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🎧 AI Narrated</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🚫 No Ads</span>
                </div>

                {/* Bottom Domain URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '24px',
                        fontSize: '18px',
                        color: 'rgba(253, 246, 236, 0.4)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                >
                    kathalokam.vercel.app
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Noto Serif Malayalam',
                    data: fontData,
                    style: 'normal',
                    weight: 700,
                },
            ],
        }
    )
}