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
  title = "HackHub - Great AI Hackathon Malaysia 2025 | AWS AI Innovation Challenge",
  description = "Join the Great AI Hackathon Malaysia 2025 on HackHub - the official AWS AI Innovation Challenge platform. Compete in Malaysia's premier AI hackathon, build innovative solutions with AWS services, and win amazing prizes.",
  keywords = "Great AI Hackathon, AI Hackathon Malaysia, AWS Great AI Hackathon, Malaysia Great AI Hackathon, HackHub, AWS AI Challenge, Malaysia AI Competition, Artificial Intelligence Hackathon, AWS Innovation Challenge, Tech Competition Malaysia",
  canonical,
  ogImage = "/aws-logo.png",
  ogType = "website",
  noindex = false
}) => {
  const baseUrl = "https://hackhub.aws-malaysia.com";
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
      <meta property="og:site_name" content="HackHub - Great AI Hackathon Malaysia" />
      
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