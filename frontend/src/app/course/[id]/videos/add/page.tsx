'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AddVideoPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const nextOrderParam = searchParams.get('nextOrder');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    order: nextOrderParam ? parseInt(nextOrderParam) : 1
  });
  const [existingItems, setExistingItems] = useState<{id: string, order: number, type: string}[]>([]);

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
        
        // Redirect if not an instructor
        if (userResponse.user.role !== 'INSTRUCTOR') {
          router.push('/dashboard');
          return;
        }

        // Check if course exists and belongs to instructor
        const courseResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course data');
        }

        // Get existing content for reordering
        const courseData = await courseResponse.json();
        const videos = (courseData.course.videos || []).map((v: any) => ({...v, type: 'video'}));
        const quizzes = (courseData.course.quizzes || []).map((q: any) => ({...q, type: 'quiz'}));
        const combined = [...videos, ...quizzes].sort((a, b) => a.order - b.order);
        setExistingItems(combined);
        
        // If not provided in URL, use next order value
        if (!nextOrderParam) {
          const maxOrder = combined.length > 0 
            ? Math.max(...combined.map((item: any) => item.order))
            : 0;
          setFormData(prev => ({...prev, order: maxOrder + 1}));
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router, nextOrderParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.url.trim()) {
        throw new Error('Video URL is required');
      }
      
      // Validate YouTube URL
      if (!formData.url.includes('youtube.com/') && !formData.url.includes('youtu.be/')) {
        throw new Error('Please provide a valid YouTube URL');
      }

      console.log('Adding video:', formData);

      // First, handle reordering if needed
      if (formData.order <= existingItems.length) {
        console.log(`Reordering items for insertion at position ${formData.order}`);
        // Sort items by order in descending order to avoid conflicts when shifting
        const itemsToReorder = existingItems
          .filter(item => item.order >= formData.order)
          .sort((a, b) => b.order - a.order); // Sort in descending order
        
        console.log(`Found ${itemsToReorder.length} items to reorder`);
        
        // Shift each item down one by one
        for (const item of itemsToReorder) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
            const endpoint = item.type === 'video' 
              ? `${baseUrl}/courses/videos/${item.id}`
              : `${baseUrl}/quizzes/${item.id}`;
            
            const newOrder = item.order + 1;
            console.log(`Reordering ${item.type} (${item.id}) from ${item.order} to ${newOrder}`);
            
            const updateResponse = await fetch(endpoint, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ order: newOrder })
            });
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`Failed to reorder item ${item.id}: ${errorText}`);
              // Continue with other items rather than throwing
            } else {
              console.log(`Successfully reordered ${item.type} to position ${newOrder}`);
            }
          } catch (reorderError) {
            console.error(`Error reordering item ${item.id}:`, reorderError);
            // Continue with other items
          }
        }
      }

      // Then add the new video
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}/videos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Video creation error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          throw new Error(errorData?.message || 'Failed to add video');
        } catch (e) {
          throw new Error('Failed to add video: ' + errorText);
        }
      }

      // Success
      router.push(`/course/${courseId}/content`);
    } catch (err) {
      console.error('Video creation failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Add New Video</h1>
            <Link 
              href={`/course/${courseId}/content`}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Content
            </Link>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Video Title
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter video title"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter video description"
                rows={3}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
                YouTube URL
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="url"
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://www.youtube.com/watch?v=XXXXXXXXXX"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter a YouTube video URL (e.g., https://youtube.com/watch?v=XXXXXXXXXX or https://youtu.be/XXXXXXXXXX)</p>
            </div>
            
            {error && (
              <div className="mb-4">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                  submitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Video'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 