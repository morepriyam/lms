'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  email: string;
}

interface QuizResult {
  resultId: string;
  student: Student;
  score: number;
  submittedAt: string;
}

interface QuizSummary {
  quizId: string;
  quizTitle: string;
  results: QuizResult[];
}

export default function CourseQuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [quizSummaries, setQuizSummaries] = useState<QuizSummary[]>([]);
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
        
        // Redirect if not an instructor
        if (userResponse.user.role !== 'INSTRUCTOR') {
          router.push('/dashboard');
          return;
        }

        // Fetch all quiz results for the course
        const resultsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}/quiz-results`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!resultsResponse.ok) {
          const errorData = await resultsResponse.json();
          throw new Error(errorData.message || 'Failed to fetch quiz results');
        }

        const resultsData = await resultsResponse.json();
        setQuizSummaries(resultsData);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load quiz results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Course Quiz Results</h1>
            <Link 
              href={`/course/${courseId}/content`}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Course Content
            </Link>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {quizSummaries.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center text-gray-500">
              <p>No quiz results found. Students haven't taken any quizzes yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {quizSummaries.map((summary) => (
                <div key={summary.quizId} className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="bg-indigo-600 text-white px-6 py-3">
                    <h2 className="text-lg font-semibold">{summary.quizTitle}</h2>
                  </div>
                  
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submitted
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summary.results.map((result) => (
                            <tr key={result.resultId}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{result.student.name}</div>
                                <div className="text-xs text-gray-500">{result.student.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  result.score >= 80 ? 'bg-green-100 text-green-800' :
                                  result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {Math.round(result.score)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(result.submittedAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <Link
                                  href={`/admin/quiz-results/${result.resultId}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  View Details
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="mt-4 text-sm text-gray-500">
                <p>Note: This view is only visible to instructors. Students can only see their own quiz results.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 