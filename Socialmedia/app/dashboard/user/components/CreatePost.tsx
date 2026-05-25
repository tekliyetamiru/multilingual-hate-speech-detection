'use client';

import { useState, useRef } from 'react';
import { useUploadThing } from '@/lib/uploadthing';
import { Image, Smile, MapPin, X, Loader2, Globe, Users, Lock, Upload, Play, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { toast } from 'react-hot-toast';

interface CreatePostProps {
  user: any;
  onPostCreated?: (newPost: any) => void;
}

export function CreatePost({ user, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { startUpload } = useUploadThing('postMedia', {
    onUploadProgress: (p) => setUploadProgress(p),
    onClientUploadComplete: (res) => {
      setUploadedFiles(prev => [...prev, ...res]);
      setIsUploading(false);
      setUploadProgress(0);
      toast.success('Upload complete!');
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'followers', label: 'Followers only', icon: Users },
    { value: 'close_friends', label: 'Close friends', icon: Lock },
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      await startUpload(Array.from(files));
    } catch (err) {
      console.error(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearInputOnViolation = () => {
    setContent('');
    setUploadedFiles([]);
    setLocation('');
    setTags('');
    
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          visibility,
          location,
          tags,
          mediaUrls: uploadedFiles.map(f => f.ufsUrl),
          mediaTypes: uploadedFiles.map(f => f.type?.startsWith('image') ? 'image' : 'video'),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.blocked) {
          setIsBlocked(true);
          clearInputOnViolation();
          setTimeout(() => setIsBlocked(false), 2000);
          
          const categories = data.toxic_categories?.length > 0 ? ` (${data.toxic_categories.join(', ')})` : '';
          toast.error(`${data.error || 'Your post contains inappropriate content'}${categories}. Please review our community guidelines.`, {
            duration: 5000,
            icon: '🚫',
          });
        } else {
          toast.error(data.error || 'Failed to create post');
        }
        return;
      }

      toast.success('Post created successfully!');
      setContent('');
      setUploadedFiles([]);
      setLocation('');
      setTags('');
      setIsExpanded(false);

      if (onPostCreated) onPostCreated(data);

    } catch (error) {
      console.error(error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const SelectedVisibilityIcon = visibilityOptions.find(v => v.value === visibility)?.icon || Globe;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50/20 to-pink-50/20 dark:from-gray-800 dark:via-purple-900/10 dark:to-pink-900/10 rounded-2xl shadow-xl border border-purple-100/50 dark:border-purple-900/30 p-6 mb-6 backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:border-purple-200/70 dark:hover:border-purple-800/50">
      
      {/* Decorative background elements */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 dark:from-purple-500/5 dark:to-pink-500/5 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-gradient-to-tr from-blue-400/10 to-purple-400/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-2xl"></div>
      
      {/* Sparkle decoration */}
      <div className="absolute top-4 right-4 opacity-30">
        <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400 animate-pulse" />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-start space-x-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
            <Avatar 
              src={user.avatar_url} 
              alt={user.username} 
              size="md" 
              className="relative ring-2 ring-purple-200 dark:ring-purple-800 shadow-lg transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              placeholder="What's on your mind? "
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              className={`w-full p-4 border-2 rounded-xl resize-none focus:outline-none focus:ring-2 dark:bg-gray-700/50 backdrop-blur-sm transition-all duration-300 ${
                isShaking ? 'animate-shake border-red-500 focus:ring-red-500 bg-red-50/50 dark:bg-red-950/50' : 
                isBlocked ? 'border-red-500 focus:ring-red-500 bg-red-50/50 dark:bg-red-950/50' :
                'border-purple-200/50 dark:border-purple-700/50 focus:ring-purple-500 focus:border-purple-400 dark:focus:border-purple-600 hover:border-purple-300 dark:hover:border-purple-600'
              } ${isExpanded ? 'shadow-lg' : 'shadow-md'}`}
              rows={isExpanded ? 5 : 2}
              disabled={isSubmitting}
            />

            {/* Blocked Status Indicator */}
            {isBlocked && (
              <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50 border-2 border-red-300 dark:border-red-700 rounded-xl flex items-start gap-3 animate-slideInUp shadow-lg">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">Content Blocked</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Your post contains inappropriate content and has been cleared. Please review our community guidelines.</p>
                </div>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800 shadow-lg">
                <div className="flex items-center space-x-3 text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                    <Loader2 className="relative h-5 w-5 animate-spin" />
                  </div>
                  <span>Uploading... {uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 h-full transition-all duration-300 rounded-full shadow-lg relative overflow-hidden"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="relative group animate-scaleIn"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl overflow-hidden shadow-lg border-2 border-purple-200/50 dark:border-purple-700/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-600">
                      {file.type?.startsWith('image') ? (
                        <img
                          src={file.ufsUrl}
                          alt="Uploaded"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                          <Play className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-pink-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl hover:from-red-600 hover:to-pink-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded Options */}
            {isExpanded && (
              <div className="mt-5 space-y-4 animate-slideInUp">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative group">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-purple-400 transition-all duration-300 group-hover:scale-110" />
                    <input
                      type="text"
                      placeholder="Add location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-purple-200/50 dark:border-purple-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 dark:focus:border-purple-600 dark:bg-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600 shadow-sm hover:shadow-md"
                    />
                  </div>
                  <div className="flex-1 relative group">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 dark:text-purple-400 font-semibold transition-all duration-300 group-hover:scale-110">#</span>
                    <input
                      type="text"
                      placeholder="Add tags (comma separated)"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-purple-200/50 dark:border-purple-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 dark:focus:border-purple-600 dark:bg-gray-700/50 backdrop-blur-sm transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600 shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      <span className="font-medium">Media</span>
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105"
                    >
                      <Smile className="h-5 w-5 mr-2" />
                      <span className="font-medium">Feeling</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-all duration-300 hover:shadow-md hover:scale-105"
                        >
                          <SelectedVisibilityIcon className="h-5 w-5 mr-2" />
                          <span className="font-medium">{visibilityOptions.find(v => v.value === visibility)?.label}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-xl shadow-xl">
                        {visibilityOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setVisibility(option.value)}
                            className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-all duration-200"
                          >
                            <option.icon className="h-4 w-4 mr-3 text-purple-600 dark:text-purple-400" />
                            <span className="font-medium">{option.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent('');
                        setUploadedFiles([]);
                        setLocation('');
                        setTags('');
                      }}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-md"
                    >
                      <span className="font-medium">Cancel</span>
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={(!content.trim() && uploadedFiles.length === 0) || isSubmitting || isUploading}
                      className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>Post</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}