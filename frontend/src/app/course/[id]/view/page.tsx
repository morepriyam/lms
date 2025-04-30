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
  options: Option[];
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
  order: number;
  questions: Question[];
  type: 'quiz';
}

type ContentItem = Video | Quiz;

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    id: string;
  };
  videos: Video[];
  quizzes: Quiz[];
}

interface QuizResult {
  id: string;
  score: number;
  submittedAt: string;
  answers: Record<string, string>;
}

export default function CourseViewPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [combinedContent, setCombinedContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [expandedQuizzes, setExpandedQuizzes] = useState<Record<string, boolean>>({});
  const [loadingQuizSubmit, setLoadingQuizSubmit] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, string>>>({});

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
        setIsEnrolled(enrollmentResponse.enrolled);
        
        if (!enrollmentResponse.enrolled) {
          setError('You are not enrolled in this course');
          setLoading(false);
          return;
        }

        // Get course data
        const courseResponse = await api.courses.getCourse(courseId, token);
        setCourse(courseResponse.course);
        
        // Prepare combined content
        const videos = (courseResponse.course.videos || []).map((v: any) => ({...v, type: 'video'}));
        const quizzes = (courseResponse.course.quizzes || []).map((q: any) => ({...q, type: 'quiz'}));
        
        // Fetch complete quiz data for each quiz
        const quizzesWithDetails = await Promise.all(
          quizzes.map(async (quiz: Quiz) => {
            try {
              const quizDetails = await api.quiz.getQuiz(quiz.id, token);
              // Merge the detailed quiz data with the original quiz object
              return {
                ...quiz,
                questions: quizDetails.questions || [],
              };
            } catch (err) {
              console.error(`Error fetching details for quiz ${quiz.id}:`, err);
              return quiz; // Return original quiz if fetch fails
            }
          })
        );
        
        const combined = [...videos, ...quizzesWithDetails].sort((a, b) => a.order - b.order);
        console.log("Combined content with quiz details:", combined);
        setCombinedContent(combined);
        
        // Initialize quiz answers
        const initialQuizAnswers: Record<string, Record<string, string>> = {};
        quizzesWithDetails.forEach((quiz: Quiz) => {
          initialQuizAnswers[quiz.id] = {};
          if (quiz.questions) {
            quiz.questions.forEach((question: Question) => {
              initialQuizAnswers[quiz.id][question.id] = '';
            });
          }
        });
        setQuizAnswers(initialQuizAnswers);
        
        // Fetch any existing quiz results
        for (const quiz of quizzesWithDetails) {
          try {
            const resultResponse = await api.quiz.getQuizResults(quiz.id, token);
            if (resultResponse && resultResponse.score !== undefined) {
              setQuizResults(prev => ({
                ...prev,
                [quiz.id]: resultResponse
              }));
            }
          } catch (error) {
            // No result found for this quiz, which is expected
            console.log(`No previous result for quiz ${quiz.id}`);
          }
        }
        
      } catch (error) {
        console.error('Error loading course data:', error);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  const toggleQuiz = (quizId: string) => {
    setExpandedQuizzes(prev => ({
      ...prev,
      [quizId]: !prev[quizId]
    }));
  };

  const handleAnswerChange = (quizId: string, questionId: string, optionId: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        [questionId]: optionId
      }
    }));
  };

  const handleSubmitQuiz = async (quizId: string) => {
    setLoadingQuizSubmit(quizId);
    
    // Check if all questions are answered
    const currentQuiz = combinedContent.find(item => item.type === 'quiz' && item.id === quizId) as Quiz;
    const answers = quizAnswers[quizId] || {};
    const unansweredQuestions = currentQuiz?.questions?.filter(q => !answers[q.id]) || [];
    
    if (unansweredQuestions.length > 0) {
      if (!confirm(`You have ${unansweredQuestions.length} unanswered questions. Are you sure you want to submit?`)) {
        setLoadingQuizSubmit(null);
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const result = await api.quiz.submitQuiz(quizId, answers, token);
      
      // Ensure the result has an answers property
      if (!result.answers) {
        result.answers = {};
      }
      
      setQuizResults(prev => ({
        ...prev,
        [quizId]: result
      }));
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setLoadingQuizSubmit(null);
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
              <h1 className="text-2xl font-bold">{course.title}</h1>
              <Link 
                href="/dashboard" 
                className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
              >
                Back to Dashboard
              </Link>
            </div>
            <p className="mt-2 text-gray-600">{course.description}</p>
            <p className="mt-1 text-sm text-gray-500">Instructor: {course.instructor.name}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Course Content</h2>
              
            {combinedContent.length > 0 ? (
              <div className="space-y-6">
                {combinedContent.map((item, index) => (
                  <div key={item.id} className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded mr-3 mt-1">
                        {index + 1}
                      </div>
                      <span className={`text-xs mr-2 px-2 py-1 rounded ${
                        item.type === 'video' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type === 'video' ? 'Video' : 'Quiz'}
                      </span>
                      <div className="flex-grow">
                        <h3 className="font-medium">{item.title}</h3>
                        {item.type === 'video' && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {item.type === 'video' && (
                      <div className="mt-4 flex justify-center">
                        <div className="max-w-xl w-full">
                          <VideoPlayer url={item.url} title={item.title} />
                        </div>
                      </div>
                    )}
                    
                    {item.type === 'quiz' && (
                      <div className="mt-4 border-t pt-4">
                        {quizResults[item.id] ? (
                          // Show quiz results if already submitted
                          <div className="space-y-4 max-w-2xl mx-auto">
                            <div className="p-4 bg-gray-100 rounded-lg">
                              <h3 className="text-lg font-semibold mb-2">Your Results</h3>
                              <div className="flex items-center">
                                <div className="text-2xl font-bold">{Math.round(quizResults[item.id].score * 100)}%</div>
                                <div className="ml-4 text-gray-700">
                                  {quizResults[item.id].score >= 0.7 ? 'Great job!' : 
                                   quizResults[item.id].score >= 0.5 ? 'Good effort!' : 'Keep studying!'}
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 mt-2">
                                Submitted on: {new Date(quizResults[item.id].submittedAt).toLocaleString()}
                              </p>
                            </div>
                            
                            <div>
                              <h3 className="font-medium mb-2">Review Questions</h3>
                              {item.questions?.map((question, qIndex) => {
                                const userAnswerId = quizResults[item.id]?.answers?.[question.id];
                                const userAnswer = question.options.find(opt => opt.id === userAnswerId);
                                const correctAnswer = question.options.find(opt => opt.isCorrect);
                                const isCorrect = userAnswer?.isCorrect;
                                
                                return (
                                  <div key={question.id} className={`p-4 mb-3 rounded-lg ${
                                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                  }`}>
                                    <p className="font-medium mb-2">Question {qIndex + 1}: {question.text}</p>
                                    <div className="ml-4 space-y-1">
                                      {question.options.map(option => (
                                        <div key={option.id} className={`flex items-center p-2 rounded ${
                                          userAnswerId === option.id ? 
                                            (option.isCorrect ? 'bg-green-100' : 'bg-red-100') : 
                                            (option.isCorrect ? 'bg-green-50' : '')
                                        }`}>
                                          <span>{option.text}</span>
                                          {userAnswerId === option.id && 
                                            <span className="ml-2">(Your answer)</span>}
                                          {option.isCorrect && 
                                            <span className="ml-2 text-green-700">(Correct answer)</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          // Show quiz to take
                          <div className="max-w-2xl mx-auto">
                            <h3 className="text-lg font-semibold mb-4">Quiz ({item.questions?.length || 0} questions)</h3>
                            <form>
                              {item.questions?.map((question, qIndex) => (
                                <div key={question.id} className="mb-6 p-4 bg-gray-50 rounded-lg">
                                  <p className="font-medium mb-3">Question {qIndex + 1}: {question.text}</p>
                                  <div className="space-y-2 ml-4">
                                    {question.options.map(option => (
                                      <div key={option.id} className="flex items-center">
                                        <input
                                          type="radio"
                                          id={`${item.id}-${question.id}-${option.id}`}
                                          name={`${item.id}-${question.id}`}
                                          value={option.id}
                                          checked={quizAnswers[item.id]?.[question.id] === option.id}
                                          onChange={() => handleAnswerChange(item.id, question.id, option.id)}
                                          className="mr-2"
                                        />
                                        <label htmlFor={`${item.id}-${question.id}-${option.id}`}>
                                          {option.text}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              <div className="mt-6 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSubmitQuiz(item.id)}
                                  disabled={loadingQuizSubmit === item.id}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded"
                                >
                                  {loadingQuizSubmit === item.id ? 'Submitting...' : 'Submit Quiz'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center text-gray-500">
                <p>No content available for this course yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 