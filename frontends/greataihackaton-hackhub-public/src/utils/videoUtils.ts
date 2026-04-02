export const getMimeTypeFromExtension = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'ogv': 'video/ogg',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    '3gp': 'video/3gpp',
    'm4v': 'video/mp4',
    'mpg': 'video/mpeg',
    'mpeg': 'video/mpeg',
    'mts': 'video/mp2t',
    'm2ts': 'video/mp2t',
    'ts': 'video/mp2t',
    'vob': 'video/x-ms-vob',
    'rm': 'video/x-pn-realvideo',
    'rmvb': 'video/x-pn-realvideo',
    'asf': 'video/x-ms-asf',
    'f4v': 'video/x-f4v',
    'divx': 'video/x-divx',
    'xvid': 'video/x-xvid'
  };
  return mimeTypes[extension] || 'video/mp4';
};

import { FileText, Image, Play, Archive, File } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FileTypeInfo {
  icon: LucideIcon;
  label: string;
  color: string;
  textColor: string;
}

export const getFileTypeInfo = (fileName: string): FileTypeInfo => {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const commonColor = 'bg-blue-500 hover:bg-blue-600';
  const commonTextColor = 'text-white';

  switch (extension) {
    case 'pdf':
      return { icon: FileText, label: 'PDF', color: commonColor, textColor: commonTextColor };
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'webp':
      return { icon: Image, label: 'IMG', color: commonColor, textColor: commonTextColor };
    case 'mp4': case 'avi': case 'mov': case 'wmv': case 'mkv': case 'webm':
    case 'flv': case '3gp': case 'm4v': case 'ogv': case 'ogg': case 'mts':
    case 'm2ts': case 'ts': case 'vob': case 'rm': case 'rmvb': case 'asf':
    case 'f4v': case 'swf': case 'mpg': case 'mpeg': case 'divx': case 'xvid':
    case 'h264': case 'h265': case 'hevc': case 'av1': case 'vp8': case 'vp9':
      return { icon: Play, label: 'VIDEO', color: commonColor, textColor: commonTextColor };
    case 'docx': case 'doc': case 'txt': case 'rtf':
      return { icon: FileText, label: 'DOC', color: commonColor, textColor: commonTextColor };
    case 'pptx': case 'ppt':
      return { icon: FileText, label: 'PPT', color: commonColor, textColor: commonTextColor };
    case 'xlsx': case 'xls': case 'csv':
      return { icon: FileText, label: 'SHEET', color: commonColor, textColor: commonTextColor };
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
      return { icon: Archive, label: 'ZIP', color: commonColor, textColor: commonTextColor };
    case 'json': case 'xml': case 'yaml': case 'yml':
      return { icon: FileText, label: 'DATA', color: commonColor, textColor: commonTextColor };
    default:
      return { icon: File, label: 'FILE', color: commonColor, textColor: commonTextColor };
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const constructS3PublicUrl = (s3Key: string): string => {
  if (!s3Key || s3Key === 'null' || s3Key === 'undefined') return '';
  // If already a full URL (e.g., presigned URL), return as-is
  if (s3Key.startsWith('https://')) return s3Key;
  const bucketName = import.meta.env.VITE_S3_BUCKET_NAME;
  const region = import.meta.env.VITE_AWS_REGION;
  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
};

export const validateRepositoryUrl = (url: string): boolean => {
  const repoPattern = /^https?:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/.+\/.+/i;
  return repoPattern.test(url);
};

export const isPlaceholderVideo = (videoUrl: string | null | undefined): boolean => {
  if (!videoUrl) return true;
  const placeholders = [
    'null', 'undefined', '', 'N/A', 'n/a', 'none', 'None',
    'placeholder', 'example', 'test', 'sample',
    'https://example.com', 'http://example.com',
    'https://placeholder', 'http://placeholder',
    'video_url_placeholder', 'your_video_url_here'
  ];
  const trimmed = videoUrl.trim();
  if (placeholders.includes(trimmed)) return true;
  if (trimmed.length < 10) return true;
  if (/^(https?:\/\/)?(www\.)?(example|placeholder|test)\.(com|org|net)/i.test(trimmed)) return true;
  return false;
};
