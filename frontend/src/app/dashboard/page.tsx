'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User } from '@/types/auth';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  published: boolean;
  instructor: {
    name: string;
  };
}

interface EnrollmentStatus {
  [courseId: string]: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>({});
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<{[key: string]: boolean}>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const userResponse = await api.auth.getCurrentUser(token);
      setUser(userResponse.user);
      console.log('User data:', userResponse.user);
      
      // Fetch all published courses
      const coursesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Courses response status:', coursesResponse.status);
      
      if (coursesResponse.ok) {
        const data = await coursesResponse.json();
        console.log('Courses data:', data);
        setCourses(data.courses || []);
        
        // If user is a student, check enrollment status for each course
        if (userResponse.user.role === 'STUDENT') {
          const enrolledCoursesResponse = await api.courses.getEnrolledCourses(token);
          setEnrolledCourses(enrolledCoursesResponse.courses || []);
          
          // Create a lookup object for quick enrollment status checking
          const statusMap: EnrollmentStatus = {};
          for (const course of enrolledCoursesResponse.courses || []) {
            statusMap[course.id] = true;
          }
          setEnrollmentStatus(statusMap);
        }
      } else {
        const errorText = await coursesResponse.text();
        console.error('Failed to fetch courses:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error('Error details:', errorData);
        } catch (e) {
          // Text wasn't JSON, which is fine for logging
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error instanceof Error && error.message.includes('token')) {
        localStorage.removeItem('token');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refresh the courses list
        refreshData();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete course: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('An error occurred while deleting the course.');
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrolling({...enrolling, [courseId]: true});
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      await api.courses.enrollInCourse(courseId, token);
      
      // Update enrollment status
      setEnrollmentStatus({...enrollmentStatus, [courseId]: true});
      
      // Fetch updated enrolled courses
      const enrolledCoursesResponse = await api.courses.getEnrolledCourses(token);
      setEnrolledCourses(enrolledCoursesResponse.courses || []);
      
      alert('Successfully enrolled in the course!');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Failed to enroll in course. Please try again.');
    } finally {
      setEnrolling({...enrolling, [courseId]: false});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const publishedCourses = courses.filter(course => course.published);
  const draftCourses = courses.filter(course => !course.published);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Welcome, {user?.name}!</h2>
            <button 
              onClick={refreshData}
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
            >
              Refresh Courses
            </button>
          </div>
          
          {user?.role === 'INSTRUCTOR' ? (
            <>
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  Draft Courses 
                  <span className="ml-2 text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                    Not Visible to Students
                  </span>
                </h3>
                
                {draftCourses.length === 0 ? (
                  <p className="text-gray-500">No draft courses.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {draftCourses.map(course => (
                      <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-gray-400">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700 font-medium">
                              ${course.price.toFixed(2)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                              Draft
                            </span>
                          </div>
                          <div className="flex space-x-2 pt-3 border-t">
                            <Link
                              href={`/edit-course/${course.id}`}
                              className="flex-1 text-center bg-gray-800 hover:bg-black text-white py-1 px-3 rounded text-sm"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/course/${course.id}/content`}
                              className="flex-1 text-center bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm"
                            >
                              Add Content
                            </Link>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="flex-1 bg-gray-900 hover:bg-black text-white py-1 px-3 rounded text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">Published Courses</h3>
                
                {publishedCourses.length === 0 ? (
                  <p className="text-gray-500">No published courses.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publishedCourses.map(course => (
                      <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-gray-700">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700 font-medium">
                              ${course.price.toFixed(2)}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
                              Published
                            </span>
                          </div>
                          <div className="flex space-x-2 pt-3 border-t">
                            <Link
                              href={`/edit-course/${course.id}`}
                              className="flex-1 text-center bg-gray-800 hover:bg-black text-white py-1 px-3 rounded text-sm"
                            >
                              Edit
                            </Link>
                            <Link
                              href={`/course/${course.id}/content`}
                              className="flex-1 text-center bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-sm"
                            >
                              Add Content
                            </Link>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="flex-1 bg-gray-900 hover:bg-black text-white py-1 px-3 rounded text-sm"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <Link
                              href={`/course/${course.id}/results`}
                              className="w-full block text-center bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm"
                            >
                              View Results
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* STUDENT VIEW */}
              
              {/* Enrolled courses section */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold mb-4">My Courses</h3>
                
                {enrolledCourses.length === 0 ? (
                  <p className="text-gray-500 mb-8">You haven't enrolled in any courses yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {enrolledCourses.map(course => (
                      <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-gray-600">
                        <div className="p-6">
                          <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700 font-medium">
                              ${course.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              By {course.instructor.name}
                            </span>
                          </div>
                          <div className="flex pt-3 border-t">
                            <Link
                              href={`/course/${course.id}/view`}
                              className="w-full text-center bg-gray-800 hover:bg-black text-white py-2 px-4 rounded text-sm"
                            >
                              Continue Learning
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Available courses section */}
              <div>
              <h3 className="text-xl font-semibold mb-4">Available Courses</h3>
              
              {publishedCourses.length === 0 ? (
                <p className="text-gray-500">No courses available yet. Check back later!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publishedCourses.map(course => (
                    <div key={course.id} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-700 font-medium">
                            ${course.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            By {course.instructor.name}
                          </span>
                        </div>
                          <div className="flex pt-3 border-t">
                            {enrollmentStatus[course.id] ? (
                              <Link
                                href={`/course/${course.id}/view`}
                                className="w-full text-center bg-gray-800 hover:bg-black text-white py-2 px-4 rounded text-sm"
                              >
                                Continue Learning
                              </Link>
                            ) : (
                              <button
                                onClick={() => handleEnroll(course.id)}
                                disabled={enrolling[course.id]}
                                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded text-sm disabled:opacity-50"
                              >
                                {enrolling[course.id] ? 'Enrolling...' : 'Enroll Now'}
                              </button>
                            )}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 