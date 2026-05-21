import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import Script from 'next/script';

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
                <Script
                    id="chatwoot-widget"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
  (function(d,t) {
    var BASE_URL="https://chat.hitouae.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: 'SvVUmhTUqJj5oyfmc7SQTgPP',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
                        `,
                    }}
                />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
