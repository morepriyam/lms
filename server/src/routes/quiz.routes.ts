import express from 'express';
import { 
  createQuiz, 
  getCourseQuizzes, 
  getQuiz, 
  deleteQuiz, 
  submitQuiz,
  getQuizResults,
  getCourseQuizResults,
  updateQuiz
} from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asHandler, asMiddleware } from '../types';

// Create router with mergeParams to access parent router params
const router = express.Router({ mergeParams: true });

// Apply authentication middleware to all routes
router.use(asMiddleware(authenticate));

// Create a new quiz for a course
router.post('/courses/:courseId/quizzes', asHandler(createQuiz));

// Get all quizzes for a course
router.get('/courses/:courseId/quizzes', asHandler(getCourseQuizzes));

// Get a specific quiz by ID
router.get('/quizzes/:quizId', asHandler(getQuiz));

// Update a quiz
router.put('/quizzes/:quizId', asHandler(updateQuiz));

// Delete a quiz
router.delete('/quizzes/:quizId', asHandler(deleteQuiz));

// Submit a quiz (answer questions)
router.post('/quizzes/:quizId/submit', asHandler(submitQuiz));

// Get quiz results for current user
router.get('/quizzes/:quizId/results', asHandler(getQuizResults));

// Get all quiz results for a course (instructor only)
router.get('/courses/:courseId/quiz-results', asHandler(getCourseQuizResults));

export default router; 