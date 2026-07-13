import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "Team Portal | AWS Hackathon",
  description = "Build the future of Voice AI — work backwards from a real customer pain point. The official Team Portal for the AWS Hackathon: register your team, browse challenges, and submit your project.",
  keywords = "Voice AI Hackathon, AWS Hackathon, Voice AI, Conversational AI, Speech AI, AI Innovation Challenge, Build Voice AI, Developer Hackathon",
  canonical,
  ogImage = "/aws-logo.png",
  ogType = "website",
  noindex = false
}) => {
  const baseUrl = "https://hackathon.aws.dev";
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullCanonical} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      <meta property="og:site_name" content="AWS Hackathon" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullCanonical} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={`${baseUrl}${ogImage}`} />
    </Helmet>
  );
};

export default SEOHead;