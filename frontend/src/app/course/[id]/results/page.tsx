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
  quizId: string;
  quizTitle: string;
  student: Student;
  score: number;
  submittedAt: string;
}

interface CourseEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  user: Student;
}

interface Quiz {
  id: string;
  title: string;
  order: number;
}

interface AggregateStudentResults {
  student: Student;
  quizResults: Record<string, number | null>; // quizId -> score (null if not attempted)
  averageScore: number | null;
  completedQuizzes: number;
  totalQuizzes: number;
}

export default function CourseResultsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [courseName, setCourseName] = useState('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [studentResults, setStudentResults] = useState<AggregateStudentResults[]>([]);
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

        // Fetch course details
        const courseResponse = await api.courses.getCourse(courseId, token);
        const courseQuizzes = courseResponse.course.quizzes || [];
        setCourseName(courseResponse.course.title);
        setQuizzes(courseQuizzes);
        
        // Fetch enrollments
        const enrollmentsResponse = await api.courses.getEnrollments(courseId, token);
        setEnrollments(enrollmentsResponse.enrollments || []);

        // Fetch quiz results
        const resultsResponse = await api.quiz.getCourseQuizResults(courseId, token);
        
        // Flatten results for easier processing
        const flatResults: QuizResult[] = [];
        resultsResponse.forEach((quizSummary: any) => {
          quizSummary.results.forEach((result: any) => {
            flatResults.push({
              ...result,
              quizId: quizSummary.quizId,
              quizTitle: quizSummary.quizTitle
            });
          });
        });
        
        setResults(flatResults);
        
        // Process student results
        const studentAggregateResults: AggregateStudentResults[] = [];
        const quizIds = courseQuizzes.map((q: Quiz) => q.id);
        
        // Debug logs
        console.log('Processing quiz results:');
        console.log('Quizzes:', courseQuizzes);
        console.log('FlatResults:', flatResults);
        
        enrollmentsResponse.enrollments.forEach((enrollment: CourseEnrollment) => {
          // Get all results for this student
          const studentQuizResults = flatResults.filter(r => r.student.id === enrollment.user.id);
          console.log(`Student ${enrollment.user.name} has ${studentQuizResults.length} quiz results`);
          
          // Create map of quizId -> score
          const quizScores: Record<string, number | null> = {};
          quizIds.forEach((quizId: string) => {
            const result = studentQuizResults.find(r => r.quizId === quizId);
            if (result) {
              console.log(`Found result for quiz ${quizId}: ${result.score}`);
              quizScores[quizId] = parseFloat(result.score.toString());
            } else {
              quizScores[quizId] = null;
            }
          });
          
          // Calculate aggregate stats
          const completedQuizzes = Object.values(quizScores).filter(score => score !== null).length;
          const totalQuizzes = quizIds.length;
          const scores = Object.values(quizScores).filter(score => score !== null) as number[];
          const averageScore = scores.length > 0 
            ? scores.reduce((acc, curr) => acc + curr, 0) / scores.length 
            : null;
            
          studentAggregateResults.push({
            student: enrollment.user,
            quizResults: quizScores,
            averageScore,
            completedQuizzes,
            totalQuizzes
          });
        });
        
        console.log('Final student results:', studentAggregateResults);
        setStudentResults(studentAggregateResults);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load course results');
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
            <h1 className="text-2xl font-bold text-indigo-900">Course Results: {courseName}</h1>
            <Link 
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 shadow-sm"
            >
              Back to Dashboard
            </Link>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-md shadow-sm">
              {error}
            </div>
          )}
          
          {studentResults.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center text-gray-500 border border-gray-100">
              <p>No students are enrolled in this course yet.</p>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100">
              <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <h2 className="text-lg font-semibold">Student Performance Summary</h2>
              </div>
              
              <div className="p-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-b border-gray-200">
                        Student
                      </th>
                      {quizzes.map(quiz => (
                        <th key={quiz.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                          {quiz.title}
                        </th>
                      ))}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Average Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Completion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentResults.map((studentResult) => (
                      <tr key={studentResult.student.id} className="hover:bg-indigo-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white hover:bg-indigo-50 transition-colors duration-150 border-r border-gray-100">
                          <div className="text-sm font-medium text-gray-900">{studentResult.student.name}</div>
                          <div className="text-xs text-gray-500">{studentResult.student.email}</div>
                        </td>
                        
                        {quizzes.map(quiz => {
                          const score = studentResult.quizResults[quiz.id];
                          return (
                            <td key={`${studentResult.student.id}-${quiz.id}`} className="px-6 py-4 whitespace-nowrap">
                              {score !== null ? (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  score >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                                  score >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                  'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                  {Math.round(score)}%
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm italic">Not attempted</span>
                              )}
                            </td>
                          );
                        })}
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {studentResult.averageScore !== null ? (
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              studentResult.averageScore >= 80 ? 'bg-green-100 text-green-800 border border-green-200' :
                              studentResult.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                              'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                              {Math.round(studentResult.averageScore)}%
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">No attempts</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-3 mr-3 max-w-[120px] shadow-inner">
                              <div 
                                className="bg-indigo-600 h-3 rounded-full" 
                                style={{ width: `${(studentResult.completedQuizzes / studentResult.totalQuizzes) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-indigo-700">
                              {studentResult.completedQuizzes}/{studentResult.totalQuizzes}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 