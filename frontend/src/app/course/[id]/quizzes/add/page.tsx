'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  isCorrect: boolean;
}

export default function AddQuizPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const nextOrderParam = searchParams.get('nextOrder');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [order, setOrder] = useState(nextOrderParam ? parseInt(nextOrderParam) : 1);
  const [existingItems, setExistingItems] = useState<{id: string, order: number, type: string}[]>([]);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: `temp-${Date.now()}`,
      text: '',
      options: [
        { id: `option-${Date.now()}-1`, text: '', isCorrect: false },
        { id: `option-${Date.now()}-2`, text: '', isCorrect: false },
        { id: `option-${Date.now()}-3`, text: '', isCorrect: false },
        { id: `option-${Date.now()}-4`, text: '', isCorrect: false }
      ]
    }
  ]);

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
        
        // If not provided in URL params, calculate the next order
        if (!nextOrderParam) {
          const maxOrder = combined.length > 0 
            ? Math.max(...combined.map((item: any) => item.order))
            : 0;
          setOrder(maxOrder + 1);
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

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `temp-${Date.now()}`,
        text: '',
        options: [
          { id: `option-${Date.now()}-1`, text: '', isCorrect: false },
          { id: `option-${Date.now()}-2`, text: '', isCorrect: false },
          { id: `option-${Date.now()}-3`, text: '', isCorrect: false },
          { id: `option-${Date.now()}-4`, text: '', isCorrect: false }
        ]
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].text = text;
    setQuestions(updatedQuestions);
  };

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex].text = text;
    setQuestions(updatedQuestions);
  };

  const updateCorrectOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    // Reset all options to not correct
    updatedQuestions[questionIndex].options.forEach(option => {
      option.isCorrect = false;
    });
    // Set the selected option as correct
    updatedQuestions[questionIndex].options[optionIndex].isCorrect = true;
    setQuestions(updatedQuestions);
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
      if (!title.trim()) {
        throw new Error('Quiz title is required');
      }

      // Validate each question has text and a correct option
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!question.text.trim()) {
          throw new Error(`Question ${i + 1} has no text`);
        }
        
        const hasCorrectOption = question.options.some(option => option.isCorrect);
        if (!hasCorrectOption) {
          throw new Error(`Question ${i + 1} has no correct answer selected`);
        }
        
        for (let j = 0; j < question.options.length; j++) {
          if (!question.options[j].text.trim()) {
            throw new Error(`Option ${j + 1} in Question ${i + 1} has no text`);
          }
        }
      }

      console.log('Adding quiz:', { title, questions });

      // First, handle reordering if needed
      if (order <= existingItems.length) {
        console.log(`Reordering items for insertion at position ${order}`);
        // Sort items by order in descending order to avoid conflicts when shifting
        const itemsToReorder = existingItems
          .filter(item => item.order >= order)
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

      // Then add the new quiz
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}/quizzes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title,
            order,
            questions: questions.map(q => ({
              text: q.text,
              options: q.options.map(o => ({
                text: o.text,
                isCorrect: o.isCorrect
              }))
            }))
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quiz creation error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
          throw new Error(errorData?.message || 'Failed to add quiz');
        } catch (e) {
          throw new Error('Failed to add quiz: ' + errorText);
        }
      }

      // Success
      router.push(`/course/${courseId}/content`);
    } catch (err) {
      console.error('Quiz creation failed:', err);
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
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Add New Quiz</h1>
            <Link 
              href={`/course/${courseId}/content`}
              className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded text-sm"
            >
              Back to Content
            </Link>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Quiz Title
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                required
              />
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Questions</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm"
                >
                  Add Question
                </button>
              </div>
              
              {questions.map((question, qIndex) => (
                <div key={question.id} className="mb-8 p-4 border rounded bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium">Question {qIndex + 1}</h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                      placeholder="Enter question text"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium mb-2">Answer Options</h4>
                    {question.options.map((option, oIndex) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={`question-${qIndex}-option-${oIndex}`}
                          name={`question-${qIndex}-correct`}
                          checked={option.isCorrect}
                          onChange={() => updateCorrectOption(qIndex, oIndex)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <input
                          className="shadow appearance-none border rounded flex-1 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          required
                        />
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 mt-1">Select the radio button for the correct answer</p>
                  </div>
                </div>
              ))}
            </div>
            
            {error && (
              <div className="mb-4 text-red-500 text-sm text-center">{error}</div>
            )}
            
            <div className="flex items-center justify-between">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Creating Quiz...' : 'Create Quiz'}
              </button>
              <Link
                href={`/course/${courseId}/content`}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 