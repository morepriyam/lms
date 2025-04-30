'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface QuizResultAnswer {
  questionId: string;
  questionText: string;
  selectedOption: {
    id: string;
    text: string;
  } | null;
  correctOption: {
    id: string;
    text: string;
  };
  isCorrect: boolean;
}

interface QuizResult {
  id: string;
  score: number;
  submittedAt: string;
  quiz: string;
  answers: QuizResultAnswer[];
}

export default function QuizResultPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
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
        
        // Fetch quiz result data
        const resultData = await api.quiz.getQuizResults(quizId, token);
        setResult(resultData);
        
      } catch (error) {
        console.error('Error loading result data:', error);
        setError('Failed to load quiz result');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId, courseId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading result...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Quiz result not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Detailed Results: {result.quiz}</h1>
            <Link 
              href={`/course/${courseId}`}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Course
            </Link>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <div className="text-sm text-gray-500">Final Score</div>
                <div className="text-3xl font-bold">{Math.round(result.score)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Submitted on</div>
                <div className="text-gray-700">{new Date(result.submittedAt).toLocaleString()}</div>
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Question Analysis</h2>
            
            {result.answers.map((answer, index) => (
              <div 
                key={answer.questionId} 
                className={`mb-6 p-4 rounded-lg border ${
                  answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg mb-2">Question {index + 1}</h3>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    answer.isCorrect 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answer.isCorrect ? 'Correct' : 'Incorrect'}
                  </div>
                </div>
                
                <p className="mb-4">{answer.questionText}</p>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Your answer:</div>
                  <div className={`p-2 rounded ${
                    answer.isCorrect 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {answer.selectedOption ? answer.selectedOption.text : 'No answer provided'}
                  </div>
                  
                  {!answer.isCorrect && (
                    <>
                      <div className="text-sm font-medium mt-2">Correct answer:</div>
                      <div className="p-2 rounded bg-green-100 text-green-800">
                        {answer.correctOption.text}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 