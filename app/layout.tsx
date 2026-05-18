import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Hito Health Tourism',
    description: 'Premium health tourism services in the UAE — dental, cosmetic surgery, fertility and more.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" dir="ltr">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
