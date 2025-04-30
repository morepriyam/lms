'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  order: number;
}

interface Course {
  id: string;
  title: string;
  videos: Video[];
}

export default function ViewVideoPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const videoId = params.videoId as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await api.auth.getCurrentUser(token);
        setUser(userResponse.user);

        // Fetch course data
        const courseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course data');
        }

        const courseData = await courseResponse.json();
        setCourse(courseData.course);
        
        // Find the specific video
        const foundVideo = courseData.course.videos.find(
          (v: Video) => v.id === videoId
        );
        
        if (!foundVideo) {
          throw new Error('Video not found');
        }
        
        setVideo(foundVideo);
      } catch (error) {
        console.error('Error loading data:', error);
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

  if (error || !video || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">{error || 'Video not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <Link 
              href={`/course/${courseId}/content`} 
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Course
            </Link>
          </div>
          <p className="mt-2 text-gray-600">
            <span className="font-medium">Course:</span> {course.title}
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-1">
            <VideoPlayer url={video.url} title={video.title} />
          </div>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">{video.title}</h2>
            <div className="prose max-w-none">
              <p>{video.description || 'No description provided.'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">More Videos in This Course</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {course.videos
              .filter(v => v.id !== videoId)
              .map(v => (
                <Link href={`/course/${courseId}/videos/view/${v.id}`} key={v.id}>
                  <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
                    <h4 className="font-medium truncate">{v.title}</h4>
                    <p className="text-sm text-gray-500 mt-1 truncate">{v.description}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
} 