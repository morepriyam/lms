'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  courseId: string;
  course?: {
    id: string;
    title: string;
  };
}

export default function VideoWatchPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const videoId = params.videoId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseVideos, setCourseVideos] = useState<Video[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Get user data
        const userResponse = await api.auth.getCurrentUser(token);
        setUser(userResponse.user);
        
        // Check if user is enrolled
        const enrollmentResponse = await api.courses.checkEnrollment(courseId, token);
        
        if (!enrollmentResponse.enrolled) {
          setError('You are not enrolled in this course');
          setLoading(false);
          return;
        }

        // Get video data
        const videoResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/videos/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!videoResponse.ok) {
          const error = await videoResponse.json();
          throw new Error(error.message || 'Failed to load video');
        }
        
        const videoData = await videoResponse.json();
        setVideo(videoData.video || videoData);
        
        // Get all course videos for the playlist
        const courseVideosResponse = await api.videos.getCourseVideos(courseId, token);
        setCourseVideos(courseVideosResponse.videos || []);

      } catch (error) {
        console.error('Error loading video data:', error);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, videoId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg p-6 shadow">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-700">{error}</p>
              <div className="mt-6">
                <Link 
                  href="/dashboard" 
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Video not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-12 gap-6">
            {/* Main content - Video player */}
            <div className="col-span-12 lg:col-span-9">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Video player */}
                <div className="aspect-w-16 aspect-h-9">
                  <iframe
                    src={video.url}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
                
                {/* Video info */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
                      <p className="text-gray-600">
                        Course: <Link href={`/course/${courseId}/view`} className="text-blue-600 hover:underline">
                          {video.course?.title || 'Back to course'}
                        </Link>
                      </p>
                    </div>
                    <Link 
                      href={`/course/${courseId}/view`}
                      className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
                    >
                      Back to Course
                    </Link>
                  </div>
                  
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Description</h2>
                    <p className="text-gray-700 whitespace-pre-line">
                      {video.description || 'No description available.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sidebar - Course playlist */}
            <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Course Videos</h2>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {courseVideos.map((v) => (
                    <Link 
                      key={v.id}
                      href={`/course/${courseId}/videos/watch/${v.id}`}
                      className={`block p-3 rounded-md ${
                        v.id === videoId 
                          ? 'bg-gray-200 border-l-4 border-gray-800' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <p className={`font-medium ${v.id === videoId ? 'text-gray-900' : 'text-gray-800'}`}>
                        {v.title}
                      </p>
                    </Link>
                  ))}
                  
                  {courseVideos.length === 0 && (
                    <p className="text-gray-500 text-sm italic">No videos available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 