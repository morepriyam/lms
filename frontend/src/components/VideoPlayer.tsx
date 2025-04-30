import React, { useEffect, useState } from 'react';

interface VideoPlayerProps {
  url: string;
  title: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title }) => {
  const [videoId, setVideoId] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract YouTube video ID from URL
    const extractYouTubeId = (url: string): string | null => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      
      if (match && match[2].length === 11) {
        return match[2];
      }
      return null;
    };
    
    setVideoId(extractYouTubeId(url));
  }, [url]);
  
  if (!videoId) {
    return (
      <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded">
        <p className="text-gray-500">Invalid YouTube URL</p>
      </div>
    );
  }
  
  return (
    <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-lg max-w-full">
      <iframe 
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default VideoPlayer; 