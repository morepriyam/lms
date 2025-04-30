'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface Option {
  id: string;
  text: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  course: {
    id: string;
    title: string;
  };
}

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const quizId = params.quizId as string;

  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{score: number, answers: Record<string, string>} | null>(null);

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

        // Get quiz data
        const quizResponse = await api.quiz.getQuiz(quizId, token);
        setQuiz(quizResponse.quiz || quizResponse);
        
        // Initialize answers object
        const initialAnswers: Record<string, string> = {};
        if (quizResponse.quiz && quizResponse.quiz.questions) {
          quizResponse.quiz.questions.forEach((question: Question) => {
            initialAnswers[question.id] = '';
          });
        }
        setAnswers(initialAnswers);
        
        // Check if user has already taken this quiz
        try {
          const resultResponse = await api.quiz.getQuizResults(quizId, token);
          if (resultResponse && resultResponse.score !== undefined) {
            setQuizResult(resultResponse);
            setSubmitted(true);
          }
        } catch (error) {
          // No quiz result found, which is expected for new quizzes
          console.log('No previous quiz result found');
        }
        
      } catch (error) {
        console.error('Error loading quiz data:', error);
        setError('Failed to load quiz data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, quizId, router]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all questions are answered
    const unansweredQuestions = quiz?.questions.filter(q => !answers[q.id]) || [];
    if (unansweredQuestions.length > 0) {
      if (!confirm(`You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const result = await api.quiz.submitQuiz(quizId, answers, token);
      setQuizResult(result);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
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
                  className="bg-gray-800 hover:bg-black text-white py-2 px-4 rounded"
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

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Quiz not found</div>
      </div>
    );
  }

  if (submitted && quizResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg p-6 shadow">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{quiz.title} - Results</h1>
              <Link 
                  href={`/course/${courseId}/view`}
                className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
              >
                Back to Course
              </Link>
            </div>
            
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <h2 className="text-xl font-semibold mb-2">Your Score</h2>
                <div className="flex items-center">
                  <div className="text-4xl font-bold text-gray-900">{(quizResult.score * 100).toFixed(0)}%</div>
                  <div className="ml-4 text-gray-700">
                    {quizResult.score >= 0.7 ? 'Great job!' : quizResult.score >= 0.5 ? 'Good effort!' : 'Keep studying!'}
                </div>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Quiz Review</h2>
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium">Question {index + 1}: {question.text}</h3>
                    <div className="ml-4 mt-2 space-y-2">
                      {question.options.map(option => {
                        const isSelected = quizResult.answers[question.id] === option.id;
                        return (
                          <div 
                            key={option.id} 
                            className={`p-2 rounded ${
                              isSelected 
                                ? 'bg-gray-200 border border-gray-400' 
                                : 'bg-white border'
                            }`}
                          >
                            {option.text}
                            {isSelected && <span className="ml-2 text-gray-900">✓ Your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
              <Link
                  href={`/course/${courseId}/view`}
                  className="bg-gray-800 hover:bg-black text-white py-2 px-4 rounded"
              >
                  Return to Course
              </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <Link 
                href={`/course/${courseId}/view`}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Course
            </Link>
          </div>
          
            <p className="text-gray-600 mb-6">Course: {quiz.course.title}</p>
            
            <form onSubmit={handleSubmit}>
              {quiz.questions.map((question, index) => (
                <div key={question.id} className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium">Question {index + 1}: {question.text}</h3>
                  <div className="ml-4 mt-2 space-y-2">
                    {question.options.map(option => (
                      <div key={option.id} className="flex items-center">
                      <input
                        type="radio"
                        id={option.id}
                          name={question.id}
                          value={option.id}
                        checked={answers[question.id] === option.id}
                          onChange={() => handleAnswerChange(question.id, option.id)}
                          className="mr-2"
                      />
                        <label htmlFor={option.id} className="text-gray-700">{option.text}</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
              <div className="mt-6 text-center">
              <button
                type="submit"
                disabled={submitting}
                  className="bg-gray-800 hover:bg-black text-white py-2 px-6 rounded-lg font-medium disabled:opacity-50"
              >
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
} 