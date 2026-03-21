import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
}

const siteDefaults = {
  siteName: 'SchoolDekho',
  domain: import.meta.env.VITE_SITE_URL || 'https://schooldekho.vercel.app',
  description: 'Find, compare, and review schools near you. Make informed decisions about your child\'s education.',
  image: `${(import.meta.env.VITE_SITE_URL || 'https://schooldekho.vercel.app').replace(/\/$/, '')}/school.jpg`,
};

export function useSeo(props: SeoProps) {
  const {
    title = 'SchoolDekho',
    description = siteDefaults.description,
    image = siteDefaults.image,
    url = siteDefaults.domain,
    type = 'website',
  } = props;

  const fullTitle = title === 'SchoolDekho' ? title : `${title} | SchoolDekho`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteDefaults.siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
