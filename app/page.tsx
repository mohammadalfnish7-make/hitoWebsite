import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/shared/lib/i18n';

/**
 * Root page — redirects to default locale.
 * e.g. / → /en
 */
export default function RootPage() {
    redirect(`/${DEFAULT_LOCALE}`);
}
