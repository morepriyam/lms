import { AuthResponse, LoginCredentials, RegisterCredentials } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = {
  auth: {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return response.json();
    },

    register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      return response.json();
    },

    getCurrentUser: async (token: string): Promise<AuthResponse> => {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get current user');
      }
      return response.json();
    },
  },
  
  courses: {
    // Get all courses
    getAllCourses: async (token: string) => {
      const response = await fetch(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch courses');
      }
      return response.json();
    },
    
    // Get enrolled courses (for students)
    getEnrolledCourses: async (token: string) => {
      const response = await fetch(`${API_URL}/courses/enrolled`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch enrolled courses');
      }
      return response.json();
    },
    
    // Get a specific course
    getCourse: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch course');
      }
      return response.json();
    },
    
    // Check enrollment status
    checkEnrollment: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/check-enrollment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check enrollment status');
      }
      return response.json();
    },
    
    // Enroll in a course
    enrollInCourse: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enroll in course');
      }
      return response.json();
    },
    
    // Get enrollments for a course (instructor only)
    getEnrollments: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch course enrollments');
      }
      return response.json();
    },
  },
  
  videos: {
    // Get videos for a course
    getCourseVideos: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch videos');
      }
      return response.json();
    },
    
    // Add a video to a course (instructor only)
    addVideo: async (courseId: string, videoData: { title: string, description: string, url: string, order?: number }, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(videoData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add video');
      }
      return response.json();
    },
  },
  
  quiz: {
    // Get a specific quiz
    getQuiz: async (quizId: string, token: string) => {
      const response = await fetch(`${API_URL}/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch quiz');
      }
      return response.json();
    },
    
    // Get all quizzes for a course
    getCourseQuizzes: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch course quizzes');
      }
      return response.json();
    },
    
    // Submit a quiz
    submitQuiz: async (quizId: string, answers: Record<string, string>, token: string) => {
      const response = await fetch(`${API_URL}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit quiz');
      }
      return response.json();
    },
    
    // Get quiz results for current user
    getQuizResults: async (quizId: string, token: string) => {
      const response = await fetch(`${API_URL}/quizzes/${quizId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch quiz results');
      }
      return response.json();
    },
    
    // Get all quiz results for a course (instructor only)
    getCourseQuizResults: async (courseId: string, token: string) => {
      const response = await fetch(`${API_URL}/courses/${courseId}/quiz-results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch course quiz results');
      }
      return response.json();
    },
  },
}; 