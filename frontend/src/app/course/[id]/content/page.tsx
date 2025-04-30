'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  options?: Option[];
}

interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  order: number;
  type: 'video';
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  order: number;
  type: 'quiz';
}

type ContentItem = Video | Quiz;

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  published: boolean;
  videos: Video[];
  quizzes: Quiz[];
}

export default function CourseContentPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [combinedContent, setCombinedContent] = useState<ContentItem[]>([]);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [quizDetailsMap, setQuizDetailsMap] = useState<Record<string, any>>({});
  const [loadingQuizzes, setLoadingQuizzes] = useState<string[]>([]);

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

        // Fetch course data with videos and quizzes
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
        
        // Combine and sort videos and quizzes by order
        const videos = (courseData.course.videos || []).map((v: any) => ({...v, type: 'video'}));
        const quizzes = (courseData.course.quizzes || []).map((q: any) => ({...q, type: 'quiz'}));
        const combined = [...videos, ...quizzes].sort((a, b) => a.order - b.order);
        setCombinedContent(combined);
        
        // Automatically fetch details for all quizzes
        const quizIds = quizzes.map((q: Quiz) => q.id);
        await Promise.all(quizIds.map(fetchQuizDetails));
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  const fetchQuizDetails = async (quizId: string) => {
    setLoadingQuizzes(prev => [...prev, quizId]);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${baseUrl}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch quiz details');
      }
      
      const quizData = await response.json();
      setQuizDetailsMap(prev => ({
        ...prev,
        [quizId]: quizData
      }));
      
    } catch (error) {
      console.error('Error fetching quiz details:', error);
    } finally {
      setLoadingQuizzes(prev => prev.filter(id => id !== quizId));
    }
  };

  const handleDeleteContent = async (itemId: string, itemType: 'video' | 'quiz') => {
    if (!confirm(`Are you sure you want to delete this ${itemType}?`)) {
      return;
    }

    setDeleteInProgress(itemId);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const endpoint = itemType === 'video' 
        ? `${baseUrl}/courses/videos/${itemId}`
        : `${baseUrl}/quizzes/${itemId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${itemType}`);
      }

      // Remove the item locally instead of reloading the page
      setCombinedContent(prevContent => 
        prevContent.filter(item => item.id !== itemId)
      );
      
      // Also remove quiz details if it was a quiz
      if (itemType === 'quiz') {
        setQuizDetailsMap(prev => {
          const updated = {...prev};
          delete updated[itemId];
          return updated;
        });
      }
    } catch (error) {
      console.error(`Error deleting ${itemType}:`, error);
      alert(`Failed to delete ${itemType}. Please try again.`);
    } finally {
      setDeleteInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Course not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Content: {course.title}</h1>
              <Link 
                href="/dashboard" 
                className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
            <p className="mt-2 text-gray-600">{course.description}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                course.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {course.published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Course Content</h2>
              <div className="flex space-x-2">
                <Link
                  href={`/course/${courseId}/videos/add?nextOrder=${combinedContent.length + 1}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm"
                >
                  Add Video
                </Link>
                <Link
                  href={`/course/${courseId}/quizzes/add?nextOrder=${combinedContent.length + 1}`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded text-sm"
                >
                  Add Quiz
                </Link>
              </div>
            </div>

            {combinedContent.length > 0 ? (
              <div className="space-y-4">
                {combinedContent.map((item, index) => (
                  <div key={item.id} className="bg-white shadow rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <div className="flex items-center">
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded mr-2">
                            {index + 1}
                          </span>
                          <span className={`text-xs mr-2 px-2 py-1 rounded ${
                            item.type === 'video' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type === 'video' ? 'Video' : 'Quiz'}
                          </span>
                          <h3 className="font-medium">{item.title}</h3>
                        </div>
                        {item.type === 'video' && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        {item.type === 'quiz' && (
                          <p className="text-xs text-gray-500 mt-1">
                            {item.questions ? item.questions.length : 0} questions
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDeleteContent(item.id, item.type)}
                          disabled={deleteInProgress === item.id}
                          className={`${
                            deleteInProgress === item.id 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          } py-1 px-3 rounded text-sm`}
                        >
                          {deleteInProgress === item.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Always show video */}
                    {item.type === 'video' && (
                      <div className="mt-4 flex justify-center">
                        <div className="max-w-xl w-full">
                          <VideoPlayer url={item.url} title={item.title} />
                        </div>
                      </div>
                    )}

                    {/* Always show quiz */}
                    {item.type === 'quiz' && (
                      <div className="mt-4 border-t pt-4 flex justify-center">
                        <div className="w-full max-w-2xl">
                          {loadingQuizzes.includes(item.id) ? (
                            <div className="text-center py-4">
                              <p className="text-gray-500">Loading quiz details...</p>
                            </div>
                          ) : quizDetailsMap[item.id] ? (
                            <div className="space-y-4">
                              {quizDetailsMap[item.id].questions?.map((question: any, qIndex: number) => (
                                <div key={question.id} className="bg-gray-50 p-3 rounded-lg">
                                  <p className="font-medium mb-2">Question {qIndex + 1}: {question.text}</p>
                                  <div className="ml-4 space-y-1">
                                    {question.options?.map((option: any, oIndex: number) => (
                                      <div key={option.id} className="flex items-center">
                                        <span className={`w-4 h-4 mr-2 inline-block rounded-full ${
                                          option.isCorrect ? 'bg-green-500' : 'bg-gray-300'
                                        }`}></span>
                                        <span>{option.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-red-500">Failed to load quiz details</p>
                              <button 
                                onClick={() => fetchQuizDetails(item.id)}
                                className="mt-2 bg-indigo-100 text-indigo-700 py-1 px-3 rounded text-sm hover:bg-indigo-200"
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                <p>No content added yet. Add videos and quizzes to get started.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 