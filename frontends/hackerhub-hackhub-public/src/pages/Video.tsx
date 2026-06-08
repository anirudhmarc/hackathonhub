import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video as VideoIcon, Upload, Clock, CheckCircle, Gitlab, Github, Code, File, Folder, Lock, FileX, Loader2, FileText, Image, Play, Archive, Download, Hash } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import axios from 'axios';
import { UploadedFile } from '@/types/files';
import { getMimeTypeFromExtension, getFileTypeInfo, formatFileSize, constructS3PublicUrl, validateRepositoryUrl, isPlaceholderVideo } from '@/utils/videoUtils';
import { useSubmissionTimer } from '@/hooks/useSubmissionTimer';

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_URL;
const S3_BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME;
const REGION = import.meta.env.VITE_AWS_REGION;

const SUBMISSION_START_DATE = new Date(import.meta.env.VITE_SUBMISSION_START_DATE);
const SUBMISSION_END_DATE = new Date(import.meta.env.VITE_SUBMISSION_END_DATE);

const FINAL_SUBMISSION_START_DATE = new Date(import.meta.env.VITE_FINAL_SUBMISSION_START_DATE || import.meta.env.VITE_SUBMISSION_START_DATE);
const FINAL_SUBMISSION_END_DATE = new Date(import.meta.env.VITE_FINAL_SUBMISSION_END_DATE || import.meta.env.VITE_SUBMISSION_END_DATE);

// getMimeTypeFromExtension, getFileTypeInfo moved to @/utils/videoUtils

interface BackendSubmissionData {
    submission_video_url: string | null;
    github_url: string;
    submission_project_description: string;
    submission_additional_materials_url: string[] | null;
    last_updated?: string;
    submission_id?: string;
}

interface PresignedUrlData {
  fileName: string;
  presignedUrl: string;
  fileUrl: string;
  category: 'video' | 'additional';
}

const VideoSubmissionPage: React.FC = () => {
  const { user, idToken, updateUserTeam, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isFinalist = false;

  const getSubmissionDates = () => {
    if (isFinalist) {
      return {
        startDate: FINAL_SUBMISSION_START_DATE,
        endDate: FINAL_SUBMISSION_END_DATE,
        roundType: 'Final Round'
      };
    }
    return {
      startDate: SUBMISSION_START_DATE,
      endDate: SUBMISSION_END_DATE,
      roundType: 'Preliminary Round'
    };
  };

  const { startDate: currentStartDate, endDate: currentEndDate, roundType } = getSubmissionDates();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [demoAppUrl, setDemoAppUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'uploading' | 'confirming' | 'success' | 'error'>('idle');

  const [isDragging, setIsDragging] = useState(false);
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [totalAdditionalFilesSize, setTotalAdditionalFilesSize] = useState(0);
  const [submissionData, setSubmissionData] = useState<BackendSubmissionData | null>(null);

  const [timeLeft, setTimeLeft] = useState<string>("");
  const [submissionPeriodOpen, setSubmissionPeriodOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
        if (user.hasSubmitted && !isEditing) {
            console.log("VideoSubmission: Populating form from AuthContext user data.");
            const savedDescription = user.submissionProjectDescription || "";
            // The optional Demo App URL is persisted as a trailing labelled line inside
            // the project description (there is no dedicated backend field). Parse it back out.
            const demoMatch = savedDescription.match(/\n*Demo App URL:\s*(\S+)\s*$/i);
            if (demoMatch) {
                setDemoAppUrl(demoMatch[1]);
                setDescription(savedDescription.replace(/\n*Demo App URL:\s*\S+\s*$/i, "").trimEnd());
            } else {
                setDemoAppUrl("");
                setDescription(savedDescription);
            }
            setRepositoryUrl(user.gitlabUrl || "");
            setVideoFile(null);

            if (user.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls)) {
                setUploadedFiles(user.submissionAdditionalMaterialsUrls.map(url => ({
                    name: url.split('/').pop() || 'Unknown File',
                    size: 0, type: '', lastModified: 0, url: url
                } as File & { url: string })));
                setTotalAdditionalFilesSize(0);
            } else {
                setUploadedFiles([]);
                setTotalAdditionalFilesSize(0);
            }
            setSubmissionStatus('success');
            toast({ title: "Submission Found", description: "Your team has a project submitted.", variant: "default" });
        } else if (!user.hasSubmitted) {
            setSubmissionStatus('idle');
            setDescription("");
            setRepositoryUrl("");
            setDemoAppUrl("");
            setVideoFile(null);
            setUploadedFiles([]);
            setTotalAdditionalFilesSize(0);
            setIsEditing(false);
        }
    }
    else if (!isLoading && !user && submissionStatus !== 'idle' && submissionStatus !== 'error') {
        setSubmissionStatus('idle');
        setDescription("");
        setRepositoryUrl("");
        setVideoFile(null);
        setUploadedFiles([]);
        setTotalAdditionalFilesSize(0);
        setIsEditing(false);
    }
  }, [isLoading, user, submissionStatus, toast, isEditing]);

  useEffect(() => {
    if (!isLoading && user && user.hasSubmitted && idToken) {
      fetchSubmissionData();
    }
  }, [isLoading, user, idToken]);

  useEffect(() => {
    const updateSubmissionStatus = () => {
        const now = new Date();
        const hasStarted = now.getTime() >= currentStartDate.getTime();
        const hasEnded = now.getTime() >= currentEndDate.getTime();
        const isOpen = hasStarted && !hasEnded;

        setSubmissionPeriodOpen(isOpen);

    if (!hasStarted) {
      const difference = currentStartDate.getTime() - now.getTime();
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(`${roundType} starts in: ${days}d ${hours}h ${minutes}m ${seconds}s`);
    } else if (hasEnded) {
            setTimeLeft(`${roundType} submission deadline passed`);
        } else {
            const difference = currentEndDate.getTime() - now.getTime();
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            setTimeLeft(`${roundType}: ${days}d ${hours}h ${minutes}m ${seconds}s remaining`);
        }
    };

    updateSubmissionStatus();
    const timer = setInterval(updateSubmissionStatus, 1000);
    return () => clearInterval(timer);
  }, [currentStartDate, currentEndDate, roundType]);

  const fetchSubmissionData = async () => {
    if (!idToken || !user?.teamId) return;
    
    try {
      const response = await axios.get(
        `${API_GATEWAY_BASE_URL}/participant/submissions`,
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      
      if (response.data?.submission) {
        setSubmissionData(response.data.submission);
      }
    } catch (error) {
      console.error("Error fetching submission data:", error);
    }
  };

  const validateAndSetVideo = (file: File) => {
    
    const supportedVideoTypes = [
      
      'video/mp4',
      'video/webm', 
      'video/ogg',
      'video/ogv',
      'video/mov',
      'video/quicktime',
      'video/m4v',
      
      'video/avi',
      'video/x-msvideo',
      'video/wmv',
      'video/x-ms-wmv',
      'video/mkv',
      'video/x-matroska',
      'video/flv',
      'video/x-flv',
      'video/3gp',
      'video/3gpp',
      'video/3gpp2',
      
      'video/mpeg',
      'video/mpg',
      'video/mp2',
      'video/mpe',
      'video/mpv',
      
      'video/x-ms-asf',
      'video/x-ms-vob',
      'video/divx',
      'video/x-divx',
      'video/xvid',
      'video/x-xvid',
      
      'video/mp2t',
      'video/mts',
      'video/m2ts',
      
      'video/vnd.rn-realvideo',
      'video/x-pn-realvideo',
      
      'video/x-f4v',
      'video/x-swf',
      
      'video/x-h264',
      'video/h264',
      'video/x-h265',
      'video/h265',
      'video/hevc',
      'video/av01'
    ];
    
    const isVideoFile = file.type.startsWith('video/') || supportedVideoTypes.includes(file.type);
    
    if (!isVideoFile) {
      
      const fileName = file.name.toLowerCase();
      const videoExtensions = [
        
        '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v',
        
        '.avi', '.wmv', '.mkv', '.flv', '.3gp',
        
        '.mpg', '.mpeg', '.mp2', '.mpe', '.mpv',
        
        '.mts', '.m2ts', '.ts',
        
        '.vob', '.rm', '.rmvb', '.asf', '.f4v', '.swf',
        '.divx', '.xvid', '.h264', '.h265', '.hevc', '.av1',
        '.vp8', '.vp9'
      ];
      const hasVideoExtension = videoExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasVideoExtension) {
        toast({ 
          title: "Invalid File Type", 
          description: "Please upload a valid video file. Supported formats: MP4, WebM, AVI, MOV, WMV, MKV, FLV, 3GP, MPEG, and many more.", 
          variant: "destructive" 
        });
        return;
      }
    }
    
  if (file.size > 500 * 1024 * 1024) {
      toast({ 
        title: "File Too Large", 
        description: "Video file must be less than 500MB and 10 minutes in duration.", 
        variant: "destructive" 
      });
      return;
    }
    
    
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
      
      const durationInSeconds = video.duration;
  const maxDurationSeconds = 602;
      
      if (durationInSeconds > maxDurationSeconds) {
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = Math.round(durationInSeconds % 60);
        toast({ 
          title: "Video Too Long", 
          description: `Video duration is ${minutes}:${seconds.toString().padStart(2, '0')}. Please upload a video that is 10 minutes or less.`, 
          variant: "destructive" 
        });
        return;
      }
      
      
      setVideoFile(file);
      
      
      const fileName = file.name.toLowerCase();
      if (file.type === 'video/avi' || fileName.endsWith('.avi')) {
        toast({ 
          title: "AVI Format Notice", 
          description: "AVI files may have limited browser support. MP4 format is recommended for best compatibility.", 
          variant: "default" 
        });
      } else if (file.type === 'video/mkv' || fileName.endsWith('.mkv')) {
        toast({ 
          title: "MKV Format Notice", 
          description: "MKV files may not play in all browsers. MP4 format is recommended for best compatibility.", 
          variant: "default" 
        });
      } else if (fileName.endsWith('.wmv') || fileName.endsWith('.asf')) {
        toast({ 
          title: "WMV/ASF Format Notice", 
          description: "Windows Media formats have limited cross-platform support. MP4 or WebM is recommended.", 
          variant: "default" 
        });
      } else if (fileName.endsWith('.flv') || fileName.endsWith('.f4v')) {
        toast({ 
          title: "Flash Video Notice", 
          description: "Flash video formats may require conversion for modern browsers. MP4 or WebM is recommended.", 
          variant: "default" 
        });
      } else if (fileName.endsWith('.rm') || fileName.endsWith('.rmvb')) {
        toast({ 
          title: "RealMedia Format Notice", 
          description: "RealMedia formats have very limited browser support. Please convert to MP4 or WebM.", 
          variant: "default" 
        });
      } else if (fileName.endsWith('.vob')) {
        toast({ 
          title: "VOB Format Notice", 
          description: "DVD VOB files may need conversion for web playback. MP4 format is recommended.", 
          variant: "default" 
        });
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({ 
        title: "Invalid Video File", 
        description: "Unable to process the video file. Please ensure it's a valid video format.", 
        variant: "destructive" 
      });
    };
    
    video.src = objectUrl;
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetVideo(e.target.files[0]);
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles = files.filter(file => !uploadedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size));

    if (uploadedFiles.length + newFiles.length > 5) {
      toast({ title: "File Limit Exceeded", description: "You can upload a maximum of 5 additional files.", variant: "destructive" });
      return;
    }

    const newFilesTotalSize = newFiles.reduce((total, file) => total + file.size, 0);
    const totalSizeMB = (totalAdditionalFilesSize + newFilesTotalSize) / (1024 * 1024);
    if (totalSizeMB > 500) {
      toast({ title: "Size Limit Exceeded", description: "Total upload size cannot exceed 500MB.", variant: "destructive" });
      return;
    }

    setTotalAdditionalFilesSize(totalAdditionalFilesSize + newFilesTotalSize);

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);

    if (fileToRemove.size > 0) {
      setTotalAdditionalFilesSize(prev => prev - fileToRemove.size);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, isVideo: boolean = false) => {
    e.preventDefault();
    if (isVideo) setIsVideoDragging(true);
    else setIsDragging(true);
  };

  const handleDragLeave = (isVideo: boolean = false) => {
    if (isVideo) setIsVideoDragging(false);
    else setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isVideo: boolean = false) => {
    e.preventDefault();
    if (isVideo) {
      setIsVideoDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) validateAndSetVideo(e.dataTransfer.files[0]);
    } else {
      setIsDragging(false);
      if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    
    if (!user?.teamId) {
      toast({ title: "Requirements Not Met", description: "Please register a team on the dashboard first.", variant: "destructive" });
      return;
    }
    
    
    if (!submissionPeriodOpen) {
      toast({ 
        title: "Submission Period Closed", 
        description: "The submission deadline has passed or hasn't started yet. Please check the submission timeline.", 
        variant: "destructive" 
      });
      return;
    }
    
    const trimmedRepositoryUrl = repositoryUrl.trim();
    if (trimmedRepositoryUrl && trimmedRepositoryUrl !== "-" && !validateRepositoryUrl(trimmedRepositoryUrl)) {
      toast({ 
        title: "Invalid Repository URL", 
        description: "Please provide a valid GitLab or GitHub repository URL, or enter a single hyphen (-) if you don't have a repository.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!description.trim()) {
      toast({ 
        title: "Project Description Required", 
        description: "Please provide a detailed description of your project, including the problem it solves and technologies used.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (uploadedFiles.length === 0 && (!user?.submissionAdditionalMaterialsUrls || user.submissionAdditionalMaterialsUrls.length === 0)) {
      toast({ 
        title: "Additional Materials Required", 
        description: "Please upload at least one file (presentation slides, code files, documentation, etc.). This is required for submission.", 
        variant: "destructive" 
      });
      return;
    }
    
    
    console.log("Submission validation passed:", {
      teamId: user?.teamId,
      problemId: user?.problemId,
      submissionPeriodOpen,
      hasDescription: !!description.trim(),
      hasFiles: uploadedFiles.length > 0,
      hasExistingFiles: user?.submissionAdditionalMaterialsUrls?.length > 0,
      repositoryUrl: trimmedRepositoryUrl
    });
    

    setIsSubmitting(true);
    setSubmissionStatus('uploading');

    try {
        let finalVideoUrl = user?.videoUrl || "";
        let finalAdditionalUrls: string[] = [];

        const filesToGetUrlsFor: { fileName: string; fileType: string; category: 'video' | 'additional'; }[] = [];
        const isNewVideoSelected = videoFile !== null;
        if (isNewVideoSelected) {
            filesToGetUrlsFor.push({ fileName: videoFile.name, fileType: videoFile.type, category: 'video' });
        } else if (user?.videoUrl) {
            finalVideoUrl = user.videoUrl;
    } else {
            
      finalVideoUrl = null;
    }

        if (user?.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls)) {
             finalAdditionalUrls = user.submissionAdditionalMaterialsUrls.filter(url =>
                uploadedFiles.some(f => f.url === url)
            );
        }
        uploadedFiles.forEach(file => {
            if (!file.url || !finalAdditionalUrls.includes(file.url)) {
                filesToGetUrlsFor.push({ fileName: file.name, fileType: file.type, category: 'additional' });
            }
        });

        let videoPresignedData: { presignedUrl: string, fileUrl: string } | undefined;
        let additionalPresignedData: { fileName: string, presignedUrl: string, fileUrl: string }[] = [];

        if (filesToGetUrlsFor.length > 0) {
            const getUrlsResponse = await axios.post(
                `${API_GATEWAY_BASE_URL}/participant/submission-urls`,
                { teamId: user.teamId, files: filesToGetUrlsFor },
                { headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' } }
            );
            const { urls } = getUrlsResponse.data;
            videoPresignedData = urls.find((u) => u.category === 'video');
            additionalPresignedData = urls.filter((u) => u.category === 'additional');
        }

        if (videoPresignedData && videoFile) {
            setIsVideoUploading(true);
            await axios.put(videoPresignedData.presignedUrl, videoFile, {
                headers: { 'Content-Type': videoFile.type },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                },
            });
            finalVideoUrl = videoPresignedData.fileUrl;
            setIsVideoUploading(false);
            setUploadProgress(100);
        }

        const uploadedAdditionalS3Urls: string[] = [];
        if (additionalPresignedData.length > 0) {
            const uploadPromises = additionalPresignedData.map((fileData) => {
                const correspondingFile = uploadedFiles.find(f => f.name === fileData.fileName);
                if (correspondingFile) {
                    return axios.put(fileData.presignedUrl, correspondingFile, {
                        headers: { 'Content-Type': correspondingFile.type },
                    }).then(() => fileData.fileUrl);
                }
                return Promise.resolve(null);
            });
            const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean);
            uploadedAdditionalS3Urls.push(...uploadedUrls);
        }
        finalAdditionalUrls.push(...uploadedAdditionalS3Urls);

        setSubmissionStatus('confirming');

        
        let submissionVideoUrl = finalVideoUrl;
        if (!finalVideoUrl) {
            submissionVideoUrl = "https://placeholder.video/no-video-uploaded";
        }

    // Fold the optional Demo App URL into the persisted project description as a trailing
    // labelled line (there is no dedicated backend field for it).
    const trimmedDemoUrl = demoAppUrl.trim();
    const projectDescriptionToSave = trimmedDemoUrl
      ? `${description.trimEnd()}\n\nDemo App URL: ${trimmedDemoUrl}`
      : description;

    const submissionPayload = {
      teamId: user.teamId,
      videoUrl: submissionVideoUrl,
      gitlabUrl: repositoryUrl.trim() || "-",
      projectDescription: projectDescriptionToSave,
      additionalMaterialsUrls: finalAdditionalUrls,
      problemId: user.problemId || "prob-system"
    };

    console.log("Submission payload:", submissionPayload);

    const confirmResponse = await axios.put(
      `${API_GATEWAY_BASE_URL}/participant/submissions`,
      submissionPayload,
      { headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' } }
    );

    let submissionId = user.submissionId;
    try {
      const getSubmissionResponse = await axios.get(
        `${API_GATEWAY_BASE_URL}/participant/submissions`,
        { headers: { 'Authorization': `Bearer ${idToken}` } }
      );
      if (getSubmissionResponse.data?.submission?.submission_id) {
        submissionId = getSubmissionResponse.data.submission.submission_id;
        setSubmissionData(getSubmissionResponse.data.submission);
      }
    } catch (getError) {
      console.error("VideoSubmission: Failed to get new submission ID after submit:", getError);
    }

    const submissionTimestamp = new Date().toISOString();

    const localStateVideoUrl = finalVideoUrl || null;

    updateUserTeam(
      user.teamName,
      user.teamId,
      user.problemId || "prob-system",
      user.track,
      localStateVideoUrl,
      true,
      repositoryUrl,
      projectDescriptionToSave,
      finalAdditionalUrls,
      submissionId
    );

    setSubmissionStatus('success');
    setIsEditing(false);
    toast({ title: "Submission Complete", description: "Your project has been successfully submitted/updated!", variant: "default" });
    setTimeout(() => {
      window.location.reload();
    }, 50);

    } catch (error) {
        console.error("VideoSubmission: Error during video upload/confirmation:", error);
        
        
        const errorMessage = axios.isAxiosError(error) && error.response
            ? error.response.data.message || error.response.statusText || error.message
            : error.message;
            
        
        if (errorMessage.toLowerCase().includes('video') || errorMessage.toLowerCase().includes('url')) {
            console.log("VideoSubmission: Attempting fallback strategy for video URL");
            
            
            setSubmissionStatus('error');
            toast({ 
                title: "Submission Failed", 
                description: "There was an issue processing your submission. Please try again or contact support if the problem persists.", 
                variant: "destructive" 
            });
        } else {
            setSubmissionStatus('error');
            toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
        }
    } finally {
        setIsSubmitting(false);
        setIsVideoUploading(false);
    }
  };

  const handleEdit = () => {
    if (submissionPeriodOpen) {
        setIsEditing(true);
        setSubmissionStatus('idle');
        setUploadProgress(0);
        setIsVideoUploading(false);

        if (user) {
            setDescription(user.submissionProjectDescription || "");
            setRepositoryUrl(user.gitlabUrl || "");
            setVideoFile(null);

            if (user.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls)) {
                setUploadedFiles(user.submissionAdditionalMaterialsUrls.map(url => ({
                    name: url.split('/').pop() || 'Unknown File',
                    size: 0, type: '', lastModified: 0, url: url
                } as File & { url: string })));
            } else {
                setUploadedFiles([]);
            }
            setTotalAdditionalFilesSize(0);
        }
    } else {
        toast({ title: "Submission Closed", description: "The submission deadline has passed, editing is no longer allowed.", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setDescription(user.submissionProjectDescription || "");
      setRepositoryUrl(user.gitlabUrl || "");
      setVideoFile(null);

      if (user.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls)) {
        setUploadedFiles(user.submissionAdditionalMaterialsUrls.map(url => ({
          name: url.split('/').pop() || 'Unknown File',
          size: 0, type: '', lastModified: 0, url: url
        } as File & { url: string })));
      } else {
        setUploadedFiles([]);
      }
      setTotalAdditionalFilesSize(0);
    }

    setIsEditing(false);
    setSubmissionStatus('success');
    setIsSubmitting(false);
    setIsVideoUploading(false);
    setUploadProgress(0);
  };

  
  const renderContent = () => {
    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12 flex justify-center">
                    <div className="flex flex-col items-center">
                        <div className="mb-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                        <p className="text-muted-foreground">Loading user data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!user || !user.teamId) {
        return (
            <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-in fade-in-50 duration-500">
                <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center animate-in fade-in-0 slide-in-from-bottom-8 duration-500">
                        <Lock size={48} className="mb-4 text-muted-foreground transition-all duration-300 hover:text-primary hover:scale-110" />
                        <h3 className="text-xl font-bold mb-2 transition-colors duration-200 hover:text-primary">Team Registration Required</h3>
                        <p className="mb-4 max-w-md text-muted-foreground transition-colors duration-200 hover:text-foreground/80">
                            Please register your team on the dashboard before submitting your project.
                        </p>
                        <Button asChild className="transition-all duration-200 hover:scale-105 hover:shadow-md">
                            <Link to="/dashboard">Go to Dashboard</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const now = new Date();
    const hasStarted = now.getTime() >= currentStartDate.getTime();
    const hasEnded = now.getTime() >= currentEndDate.getTime();

    if (hasEnded) {
        
        if (user.hasSubmitted) {
            return (
                <div className="space-y-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle size={20} className="text-green-600" />
                                <h3 className="text-lg font-semibold text-green-700">Submission Period Ended - View Only</h3>
                            </div>
                            <p className="text-muted-foreground mb-4">
                                The submission deadline has passed. You can view your submitted project details below, but editing is no longer allowed.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <VideoIcon className="text-primary" />
                                <CardTitle>Your Submitted Project</CardTitle>
                            </div>
                            <CardDescription>
                                Review your submitted project details (read-only).
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-6">
                                {user?.submissionId && (
                                    <div>
                                        <Label className="text-base font-medium">Submission ID</Label>
                                        <div className="mt-1.5 p-3 bg-muted/50 border border-muted-foreground/20 rounded flex items-center gap-2">
                                            <Hash size={16} className="text-muted-foreground" />
                                            <span className="text-muted-foreground font-medium whitespace-pre-wrap">
                                                {user.submissionId}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {submissionData?.last_updated && (
                                    <div>
                                        <Label className="text-base font-medium">Last Submitted</Label>
                                        <div className="mt-1.5 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                                            <Clock size={16} className="text-blue-600" />
                                            <span className="text-blue-800 font-medium">
                                                {new Date(submissionData.last_updated).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    timeZone: 'Asia/Kuala_Lumpur'
                                                })} at {new Date(submissionData.last_updated).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZoneName: 'short',
                                                    timeZone: 'Asia/Kuala_Lumpur'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <Label className="text-base font-medium">Video Submission</Label>
                                    <div className="mt-1.5">
                                        {user?.videoUrl && !isPlaceholderVideo(user.videoUrl) ? (
                                            <div className="w-full max-w-2xl mt-2 rounded-lg overflow-hidden border border-muted-foreground/30 bg-black aspect-video">
                                                <video
                                                    src={constructS3PublicUrl(user.videoUrl)}
                                                    controls
                                                    crossOrigin="anonymous"
                                                    preload="metadata"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        console.error('Video playback error:', e);
                                                        const target = e.target as HTMLVideoElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent && !parent.querySelector('.video-error')) {
                                                            const errorDiv = document.createElement('div');
                                                            errorDiv.className = 'video-error flex flex-col items-center justify-center h-full text-white p-4';
                                                            errorDiv.innerHTML = `
                                                                <div class="text-center">
                                                                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                    </svg>
                                                                    <p class="text-gray-300 mb-2">Video preview unavailable</p>
                                                                    <a href="${constructS3PublicUrl(user.videoUrl)}" 
                                                                       target="_blank" 
                                                                       rel="noopener noreferrer"
                                                                       class="text-blue-400 hover:text-blue-300 underline text-sm">
                                                                        Download video file
                                                                    </a>
                                                                </div>
                                                            `;
                                                            parent.appendChild(errorDiv);
                                                        }
                                                    }}
                                                >
                                                    <source 
                                                      src={constructS3PublicUrl(user.videoUrl)} 
                                                      type={getMimeTypeFromExtension(user.videoUrl || '')} 
                                                    />
                                                    
                                                    <source src={constructS3PublicUrl(user.videoUrl)} type="video/mp4" />
                                                    <source src={constructS3PublicUrl(user.videoUrl)} type="video/webm" />
                                                    <source src={constructS3PublicUrl(user.videoUrl)} type="video/ogg" />
                                                    Your browser does not support the video tag or this video format.
                                                    <div className="flex flex-col items-center justify-center h-full text-white p-4">
                                                        <div className="text-center">
                                                            <Play size={48} className="mx-auto text-gray-400 mb-4" />
                                                            <p className="text-gray-300 mb-2">Video format not supported by browser</p>
                                                            <a 
                                                                href={constructS3PublicUrl(user.videoUrl)} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 hover:text-blue-300 underline text-sm"
                                                            >
                                                                Download video file
                                                            </a>
                                                        </div>
                                                    </div>
                                                </video>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                                                <VideoIcon className="h-4 w-4 text-muted-foreground" />
                                                <p className="text-muted-foreground">No video uploaded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Repository</Label>
                                    <div className="mt-1.5 flex items-center gap-2">
                                        {!user.gitlabUrl || user.gitlabUrl.trim() === '' || user.gitlabUrl.trim() === '-' ? (
                                            <>
                                                <Code size={16} className="text-gray-400" />
                                                <span className="text-gray-500">No repository provided</span>
                                            </>
                                        ) : user.gitlabUrl.includes('github.com') ? (
                                            <>
                                                <Github size={16} className="text-gray-800" />
                                                <a href={user.gitlabUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                                    {user.gitlabUrl}
                                                </a>
                                            </>
                                        ) : user.gitlabUrl.includes('gitlab.com') ? (
                                            <>
                                                <Gitlab size={16} className="text-orange-600" />
                                                <a href={user.gitlabUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                                    {user.gitlabUrl}
                                                </a>
                                            </>
                                        ) : (
                                            <>
                                                <Code size={16} className="text-gray-400" />
                                                <span className="text-gray-600 break-all">{user.gitlabUrl}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Project Description</Label>
                                    <div className="mt-1.5 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                                        {user.submissionProjectDescription || '-'}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-base font-medium">Additional Materials</Label>
                                    <div className="mt-3">
                                        {user?.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls) && user.submissionAdditionalMaterialsUrls.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {user.submissionAdditionalMaterialsUrls.map((url: string, idx: number) => {
                                                    const fileName = url.split('/').pop() || 'Unknown File';
                                                    const fileInfo = getFileTypeInfo(fileName);
                                                    const IconComponent = fileInfo.icon;
                                                    
                                                    return (
                                                        <div key={idx} className="group">
                                                            <a
                                                                href={constructS3PublicUrl(url) || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-sm text-muted-foreground border border-transparent hover:bg-white/10 transition-colors duration-150 w-full"
                                                            >
                                                                <IconComponent size={14} className="text-current" />
                                                                <span className="text-xs font-medium truncate" title={fileName}>
                                                                    {fileName}
                                                                </span>
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                                <div className="text-center">
                                                    <FileX size={48} className="mx-auto mb-2 text-gray-400" />
                                                    <p className="text-sm text-gray-500">No additional materials uploaded</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        
        return (
            <Card>
                <CardContent className="p-12">
                    <div className="flex flex-col items-center text-center">
                        <FileX size={48} className="mb-4 text-red-500" />
                        <h3 className="text-xl font-bold mb-2">Submission Deadline Passed</h3>
                        <p className="mb-4 max-w-md text-muted-foreground">
                            The submission period has ended. You can no longer submit or edit your project.
                        </p>
                        <div className="bg-amber-50 p-4 border border-amber-200 rounded-md text-amber-800 text-left max-w-lg">
                            <p className="text-sm font-medium mb-2">Need to submit?</p>
                            <p className="text-sm mb-2">
                                If you have already submitted and are seeing this message, you may still be able to edit your submission.
                                Please contact the committee via <a href="https://amazon.enterprise.slack.com/archives/C0AJ99ZSWCU" target="_blank" rel="noopener noreferrer" className="underline font-medium">Slack</a> with
                                screenshots of your work and explanation.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasStarted) {
        return (
            <Card>
                <CardContent className="p-12">
                    <div className="flex flex-col items-center text-center">
                        <FileX size={48} className="mb-4 text-red-500" />
                        <h3 className="text-xl font-bold mb-2">Submissions Not Yet Open</h3>
                        <p className="mb-4 max-w-md text-muted-foreground">
                            {roundType} submissions will be open from {currentStartDate.toLocaleDateString()} to {currentEndDate.toLocaleDateString()}.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    

    const displaySubmittedView = user.hasSubmitted && submissionStatus === 'success';

    return (
      <div className="space-y-8 animate-in fade-in-50 duration-500">
        
        {isFinalist && (
          <Card className="border-yellow-200 bg-yellow-50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] animate-in fade-in-0 slide-in-from-top-6 hover:bg-yellow-100">
            <CardHeader className="transition-all duration-200 hover:bg-yellow-100/50">
              <div className="flex items-center gap-2">
                <div className="text-yellow-600 transition-all duration-200 hover:scale-105">🏆</div>
                <CardTitle className="text-yellow-800 transition-colors duration-200 hover:text-yellow-900">Final Round Submission Requirements</CardTitle>
              </div>
              <CardDescription className="text-yellow-700 transition-colors duration-200 hover:text-yellow-800">
                As a finalist team, please ensure you submit the following materials for final evaluation:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 transition-all duration-300 hover:bg-yellow-100/50 hover:scale-[1.02] p-2 rounded-lg animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: '100ms' }}>
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110 hover:bg-yellow-700">1</span>
                  <div>
                    <span className="font-medium text-yellow-800 transition-colors duration-200 hover:text-yellow-900">PPT/PDF of pitching slides</span>
                    <p className="text-sm text-yellow-700 mt-1 transition-colors duration-200 hover:text-yellow-800">Upload your presentation slides in PPT or PDF format</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 transition-all duration-300 hover:bg-yellow-100/50 hover:scale-[1.02] p-2 rounded-lg animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: '200ms' }}>
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110 hover:bg-yellow-700">2</span>
                  <div>
                    <span className="font-medium text-yellow-800 transition-colors duration-200 hover:text-yellow-900">Optional Solution Demonstration Video</span>
                    <p className="text-sm text-yellow-700 mt-1 transition-colors duration-200 hover:text-yellow-800">For archiving purpose if teams need to show their demo solutions to public audience</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 transition-all duration-300 hover:bg-yellow-100/50 hover:scale-[1.02] p-2 rounded-lg animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: '300ms' }}>
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110 hover:bg-yellow-700">3</span>
                  <div>
                    <span className="font-medium text-yellow-800 transition-colors duration-200 hover:text-yellow-900">Solution Code Zip files</span>
                    <p className="text-sm text-yellow-700 mt-1 transition-colors duration-200 hover:text-yellow-800">Upload your complete source code as compressed zip files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 transition-all duration-300 hover:bg-yellow-100/50 hover:scale-[1.02] p-2 rounded-lg animate-in fade-in-0 slide-in-from-left-4" style={{ animationDelay: '400ms' }}>
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110 hover:bg-yellow-700">4</span>
                  <div>
                    <span className="font-medium text-yellow-800 transition-colors duration-200 hover:text-yellow-900">Any other supporting files</span>
                    <p className="text-sm text-yellow-700 mt-1 transition-colors duration-200 hover:text-yellow-800">Documentation, architecture diagrams, or any additional materials</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.01] animate-in fade-in-50 slide-in-from-bottom-6">
          <CardHeader className="transition-colors duration-200 hover:bg-muted/20">
            <div className="flex items-center gap-2">
              <VideoIcon className="text-primary transition-transform duration-200 hover:scale-110" />
              <CardTitle className="transition-colors duration-200 hover:text-primary">Project Files & Documentation Submission</CardTitle>
            </div>
            <CardDescription className="transition-colors duration-200 hover:text-foreground/80">
              Submit your project files, documentation, optional demo video, and repository link with project description.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {displaySubmittedView ? (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <p className="text-green-700">
                    Project submitted.
                  </p>
                </div>
                {user?.submissionId && (
                  <div>
                    <Label className="text-base font-medium">Submission ID</Label>
                    <div className="mt-1.5 p-3 bg-muted/50 border border-muted-foreground/20 rounded flex items-center gap-2">
                      <Hash size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground font-medium whitespace-pre-wrap">
                        {user.submissionId}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {submissionData?.last_updated && (
                    <div>
                      <Label className="text-base font-medium">Last Submitted</Label>
                      <div className="mt-1.5 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                        <Clock size={16} className="text-blue-600" />
                        <span className="text-blue-800 font-medium">
                          {new Date(submissionData.last_updated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'Asia/Kuala_Lumpur'
                          })} at {new Date(submissionData.last_updated).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short',
                            timeZone: 'Asia/Kuala_Lumpur'
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-base font-medium">Video URL</Label>
                    <div className="mt-1.5">
                      {user?.videoUrl && !isPlaceholderVideo(user.videoUrl) ? (
                        <div className="w-full max-w-2xl mt-2 rounded-lg overflow-hidden border border-muted-foreground/30 bg-black aspect-video">
                          <video
                            src={constructS3PublicUrl(user.videoUrl)}
                            controls
                            crossOrigin="anonymous"
                            preload="metadata"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              console.error('Video playback error:', e);
                              const target = e.target as HTMLVideoElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.video-error')) {
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'video-error flex flex-col items-center justify-center h-full text-white p-4';
                                errorDiv.innerHTML = `
                                  <div class="text-center">
                                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-gray-300 mb-2">Video preview unavailable</p>
                                    <a href="${constructS3PublicUrl(user.videoUrl)}" 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       class="text-blue-400 hover:text-blue-300 underline text-sm">
                                      Download video file
                                    </a>
                                  </div>
                                `;
                                parent.appendChild(errorDiv);
                              }
                            }}
                          >
                            <source 
                              src={constructS3PublicUrl(user.videoUrl)} 
                              type={getMimeTypeFromExtension(user.videoUrl || '')} 
                            />
                            
                            <source src={constructS3PublicUrl(user.videoUrl)} type="video/mp4" />
                            <source src={constructS3PublicUrl(user.videoUrl)} type="video/webm" />
                            <source src={constructS3PublicUrl(user.videoUrl)} type="video/ogg" />
                            Your browser does not support the video tag or this video format.
                            <div className="flex flex-col items-center justify-center h-full text-white p-4">
                              <div className="text-center">
                                <Play size={48} className="mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-300 mb-2">Video format not supported by browser</p>
                                <a 
                                  href={constructS3PublicUrl(user.videoUrl)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline text-sm"
                                >
                                  Download video file
                                </a>
                              </div>
                            </div>
                          </video>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                          <VideoIcon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No video uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Repository</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      {!user.gitlabUrl || user.gitlabUrl.trim() === '' || user.gitlabUrl.trim() === '-' ? (
                        <>
                          <Code size={16} className="text-gray-400" />
                          <span className="text-gray-500">No repository provided</span>
                        </>
                      ) : user.gitlabUrl.includes('github.com') ? (
                        <>
                          <Github size={16} className="text-gray-800" />
                          <a href={user.gitlabUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                            {user.gitlabUrl}
                          </a>
                        </>
                      ) : user.gitlabUrl.includes('gitlab.com') ? (
                        <>
                          <Gitlab size={16} className="text-orange-600" />
                          <a href={user.gitlabUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                            {user.gitlabUrl}
                          </a>
                        </>
                      ) : (
                        <>
                          <Code size={16} className="text-gray-400" />
                          <span className="text-gray-600 break-all">{user.gitlabUrl}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Project Description</Label>
                    <div className="mt-1.5 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                      {user.submissionProjectDescription || '-'}
                    </div>
                  </div>

                 <div>
                    <Label className="text-base font-medium">Additional Materials</Label>
                    <div className="mt-3">
                      {user?.submissionAdditionalMaterialsUrls && Array.isArray(user.submissionAdditionalMaterialsUrls) && user.submissionAdditionalMaterialsUrls.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {user.submissionAdditionalMaterialsUrls.map((url: string, idx: number) => {
                                  const fileName = url.split('/').pop() || 'Unknown File';
                                  const fileInfo = getFileTypeInfo(fileName);
                                  const IconComponent = fileInfo.icon;
                                  
                  return (
                    <div key={idx} className="group">
                      <a
                        href={constructS3PublicUrl(url) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-sm text-muted-foreground border border-transparent hover:bg-white/10 transition-colors duration-150 w-full"
                      >
                        <IconComponent size={14} className="text-current" />
                        <span className="text-xs font-medium truncate" title={fileName}>
                          {fileName}
                        </span>
                      </a>
                    </div>
                  );
                })}
                          </div>
                      ) : (
                          <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                              <div className="text-center">
                                  <FileX size={48} className="mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-500">No additional materials uploaded</p>
                              </div>
                          </div>
                      )}
                    </div>
                  </div>

                  {submissionPeriodOpen && (
                    <Button onClick={handleEdit} className="w-full md:w-auto">
                      Edit Submission
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 group">
                  <Label htmlFor="videoUpload" className="transition-colors duration-200 group-hover:text-primary">
                    Upload Demo Video (Optional)
                  </Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-md ${isVideoDragging ? "bg-primary/10 border-primary scale-105 shadow-lg" :
                      videoFile || user?.videoUrl ? "bg-primary/5 border-primary" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    onDragOver={(e) => handleDragOver(e, true)}
                    onDragLeave={() => handleDragLeave(true)}
                    onDrop={(e) => handleDrop(e, true)}
                  >
                    <VideoIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:scale-110" />
                    {videoFile || user?.videoUrl ? (
                      <div className="space-y-2 animate-in fade-in-50 zoom-in-95 duration-300">
                        <p className="font-medium transition-colors duration-200 hover:text-primary">{videoFile?.name || (user?.videoUrl?.split('/').pop() || 'Existing Video')}</p>
                        {videoFile && (
                            <p className="text-sm text-muted-foreground transition-all duration-200">
                                {formatFileSize(videoFile.size)}
                            </p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                          onClick={() => {
                            setVideoFile(null);
                            if (user) {
                                updateUserTeam(
                                    user.teamName,
                                    user.teamId,
                                    user.problemId,
                                    user.track,
                                    null,
                                    user.hasSubmitted,
                                    user.gitlabUrl,
                                    user.submissionProjectDescription,
                                    user.submissionAdditionalMaterialsUrls,
                                    user.lastSubmitted
                                );
                            }
                          }}
                          disabled={!submissionPeriodOpen}
                        >
                          Change Video
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                          <h4 className="text-lg font-medium mb-2 transition-colors duration-200 group-hover:text-primary">Upload Demo Video</h4>
                          <p className="text-sm text-muted-foreground mb-1 transition-all duration-200 group-hover:text-foreground/80">
                            Drag and drop or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground transition-all duration-200 group-hover:text-foreground/70">
                            Please upload in MP4 format only (Maximum size: 500MB, Maximum duration: 10 minutes)
                          </p>
                          <p className="text-xs text-amber-600 mt-1 transition-all duration-200 hover:text-amber-500">
                            💡 Other formats (e.g. .mov) will not preview in the browser — convert to .mp4 before uploading
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="transition-all duration-200 hover:scale-105 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
                          onClick={() => document.getElementById("video-upload")?.click()}
                          disabled={!submissionPeriodOpen}
                        >
                          Browse Video
                        </Button>
                      </>
                    )}
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/mp4,.mp4"
                      onChange={handleVideoChange}
                      className="hidden"
                      disabled={!submissionPeriodOpen}
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="repositoryUrl" className="transition-colors duration-200 group-hover:text-primary">Repository URL (optional)</Label>
                  <div className="flex gap-2 transition-all duration-200 hover:scale-[1.01]">
                    <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md transition-all duration-200 group-hover:bg-primary/10 group-hover:border-primary/30">
                      {repositoryUrl.trim() === '' || repositoryUrl.trim() === '-' ? (
                        <Code size={16} className="text-gray-400 transition-colors duration-200 group-hover:text-primary" />
                      ) : repositoryUrl.includes('github.com') ? (
                        <Github size={16} className="text-gray-800 transition-all duration-200 hover:scale-110" />
                      ) : repositoryUrl.includes('gitlab.com') ? (
                        <Gitlab size={16} className="text-orange-600 transition-all duration-200 hover:scale-110" />
                      ) : (
                        <Code size={16} className="text-gray-400 transition-colors duration-200 group-hover:text-primary" />
                      )}
                    </div>
                    <Input
                      id="repositoryUrl"
                      value={repositoryUrl}
                      onChange={(e) => setRepositoryUrl(e.target.value)}
                      placeholder="https://gitlab.aws.dev/your-team/your-project"
                      className="rounded-l-none transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                      disabled={!submissionPeriodOpen}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80">
                    Push your code to <strong className="transition-colors duration-200 group-hover:text-primary">internal Amazon GitLab</strong> (gitlab.aws.dev) and paste the repository URL here. Make sure judges have access.
                  </p>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="demoAppUrl" className="transition-colors duration-200 group-hover:text-primary">Demo App URL (optional)</Label>
                  <Input
                    id="demoAppUrl"
                    value={demoAppUrl}
                    onChange={(e) => setDemoAppUrl(e.target.value)}
                    placeholder="https://your-live-demo.example.com"
                    className="transition-all duration-200 focus:scale-[1.01] focus:shadow-md"
                    disabled={!submissionPeriodOpen}
                  />
                  <p className="text-sm text-muted-foreground">
                    If you have a live, hosted version of your voice AI app, share the link so judges can try it.
                  </p>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="description" className="transition-colors duration-200 group-hover:text-primary">Problem Statement &amp; Project Description *</Label>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 transition-all duration-300 hover:bg-blue-100 hover:border-blue-300 hover:shadow-md">
                    <p className="text-sm text-blue-800 transition-colors duration-200">
                      <strong className="transition-colors duration-200 hover:text-blue-900">Start by defining the customer pain point and your problem statement</strong>, then describe your voice AI solution.
                    </p>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={"Problem Statement: [Describe the customer pain point you worked backwards from]\n\nProject Description: [Describe your voice AI solution, the AWS / Deepgram / Pipecat services used, and any other relevant details...]"}
                    rows={8}
                    className="transition-all duration-200 focus:scale-[1.01] focus:shadow-md hover:shadow-sm"
                    required
                    disabled={!submissionPeriodOpen}
                  />
                </div>

                <div className="space-y-2 group">
                  <Label className="transition-colors duration-200 group-hover:text-primary">Additional Materials *</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-md ${isDragging ? "border-primary bg-primary/5 scale-105 shadow-lg" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={() => handleDragLeave()}
                    onDrop={handleDrop}
                  >
                    <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:scale-110" />
                    <div className="mb-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                      <h4 className="text-lg font-medium mb-2 transition-colors duration-200 group-hover:text-primary">Drag & Drop Files Here</h4>
                      <p className="text-sm text-muted-foreground mb-2 transition-colors duration-200 group-hover:text-foreground/80">
                        Or click to browse your device
                      </p>
                      <p className="text-xs text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
                        Maximum 5 files, 500MB total
                      </p>
                      <div className="mt-3 p-3 bg-blue-50/50 border border-blue-200/50 rounded-md transition-all duration-300 hover:bg-blue-100/50 hover:border-blue-300/50 hover:shadow-sm">
                        <p className="text-xs text-blue-800 font-medium mb-1 transition-colors duration-200 hover:text-blue-900">📋 Required Files:</p>
                        <p className="text-xs text-blue-700 transition-colors duration-200">
                          • Slides must also be uploaded in this section
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="transition-all duration-200 hover:scale-105 hover:shadow-md hover:bg-primary hover:text-primary-foreground"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={!submissionPeriodOpen}
                    >
                      Browse Files
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleAdditionalFilesChange}
                      className="hidden"
                      disabled={!submissionPeriodOpen}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 animate-in fade-in-50 slide-in-from-top-4 duration-300">
                      <h4 className="font-medium mb-3 transition-colors duration-200 hover:text-primary">Selected/Uploaded Files</h4>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md transition-all duration-300 hover:bg-muted/50 hover:shadow-md hover:scale-[1.02] animate-in fade-in-0 slide-in-from-left-4"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-center gap-2">
                              <File className="h-4 w-4 transition-colors duration-200 hover:text-primary" />
                              <span className="text-sm font-medium truncate max-w-[150px] md:max-w-[300px] transition-colors duration-200 hover:text-primary">
                                {file.name}
                              </span>
                              {file.size > 0 && (
                                <Badge variant="outline" className="text-xs transition-all duration-200 hover:scale-105">
                                  {formatFileSize(file.size)}
                                </Badge>
                              )}
                              {file.size === 0 && file.url && (
                                <Badge variant="outline" className="text-xs bg-green-100 text-green-800 transition-all duration-200 hover:scale-105 hover:bg-green-200">
                                    Uploaded
                                </Badge>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 transition-all duration-200 hover:scale-110 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeFile(index)}
                              disabled={!submissionPeriodOpen}
                            >
                              <span className="sr-only">Remove file</span>
                              <FileX className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 text-sm text-muted-foreground">
                        {uploadedFiles.length} of 5 files
                        ({(totalAdditionalFilesSize / (1024 * 1024)).toFixed(1)}MB
                        of 500MB)
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 p-4 rounded-md space-y-2 mb-4">
                  <h3 className="font-medium">Submission Guidelines:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Videos should be 5 minutes or less in length</li>
                    <li>Include a demo of your working solution</li>
                    <li>Explain the architecture and AWS services used in your additional materials</li>
                    <li>Describe how your solution addresses the problem statement</li>
                    <li>Make sure your GitHub or GitLab repository is public if you have used GitHub or GitLab</li>
                    <li>Please contact the committee on <a href="https://amazon.enterprise.slack.com/archives/C0AJ99ZSWCU" target="_blank" rel="noopener noreferrer" className="underline font-medium">Slack</a> if you have any issues with submission</li>
                  </ul>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="w-full md:w-auto transition-all duration-200 hover:scale-105 hover:shadow-md hover:bg-muted"
                    >
                      Cancel Edit
                    </Button>
                  )}

                  <Button
                    type="submit"
                    className="w-full md:w-auto transition-all duration-300 hover:scale-105 hover:shadow-lg transform active:scale-95 disabled:scale-100 disabled:hover:shadow-none"
                    disabled={isSubmitting || isVideoUploading || !submissionPeriodOpen}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="animate-pulse">{isVideoUploading ? `Uploading Video (${uploadProgress}%)...` : "Submitting..."}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                        <span className="transition-all duration-200">Submit Project</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="aws-container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Project Submission</h1>
        {isFinalist && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            🏆 <span>Finalist Team - Final Round</span>
          </div>
        )}
      </div>

      <Card className="mb-8 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] animate-in fade-in-50 slide-in-from-bottom-4">
        <CardContent className="p-6 transition-colors duration-200 hover:bg-muted/10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} className="text-aws-light-blue transition-transform duration-200 group-hover:scale-105" />
                <h2 className="text-xl font-bold transition-colors duration-200 group-hover:text-primary">{roundType} Submission Deadline</h2>
              </div>
              <p className="text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80">
{currentEndDate.toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Kuala_Lumpur'
})}, {currentEndDate.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short',
  timeZone: 'Asia/Kuala_Lumpur'
})}
</p>
            </div>
            <div className="px-4 py-2 bg-aws-blue text-white rounded-md font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-aws-blue/90 animate-in fade-in-0 slide-in-from-right-4 duration-500">
              <span className="transition-opacity duration-200">{timeLeft}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderContent()}
    </div>
  );
};

export default VideoSubmissionPage;