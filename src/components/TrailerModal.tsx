import React from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerUrl: string;
  movieTitle: string;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  isOpen,
  onClose,
  trailerUrl,
  movieTitle
}) => {
  if (!isOpen) return null;

  // Convert various URL formats to embed format
  const getEmbedUrl = (url: string) => {
    // Vimeo embed HTML (check for iframe with vimeo player)
    if (url.includes('player.vimeo.com/video/')) {
      // Extract video ID from Vimeo player URL
      const match = url.match(/player\.vimeo\.com\/video\/(\d+)/);
      if (match) {
        const videoId = match[1];
        return `https://player.vimeo.com/video/${videoId}?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`;
      }
    }
    
    // Vimeo direct links
    if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}?title=0&amp;byline=0&amp;portrait=0&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`;
      }
    }
    
    // Google Drive links
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    
    // Google Drive direct preview links
    if (url.includes('drive.google.com') && url.includes('/preview')) {
      return url;
    }
    
    // YouTube embed links (already in embed format)
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // YouTube watch links
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // YouTube short links
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Return original URL if no conversion needed
    return url;
  };

  const isVimeoUrl = (url: string) => {
    return url.includes('vimeo.com') || url.includes('player.vimeo.com');
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">{movieTitle} - Trailer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        <div className="aspect-video relative">
          <iframe
            src={getEmbedUrl(trailerUrl)}
            title={`${movieTitle} Trailer`}
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0"
            allow={isVimeoUrl(trailerUrl) 
              ? "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            }
            allowFullScreen
          />
        </div>
      </div>
      {isVimeoUrl(trailerUrl) && (
        <script src="https://player.vimeo.com/api/player.js" async />
      )}
    </div>
  );
};