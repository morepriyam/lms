import { Router } from 'express';
import { 
  getAllCourses, 
  getCourseById, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  enrollInCourse,
  getEnrolledCourses,
  checkEnrollment,
  addVideo,
  getCourseVideos,
  updateVideo,
  deleteVideo,
  getCourseEnrollments
} from '../controllers/course.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asHandler, asMiddleware } from '../types';

const router = Router();

// Apply authentication middleware to all routes
router.use(asMiddleware(authenticate));

// Course routes
// Get all courses (filtered by role)
router.get('/', asHandler(getAllCourses));

// Get enrolled courses (for students)
router.get('/enrolled', asHandler(getEnrolledCourses));

// Get course by ID
router.get('/:id', asHandler(getCourseById));

// Create a new course (instructors only)
router.post('/', asHandler(createCourse));

// Update a course (instructor who owns it)
router.put('/:id', asHandler(updateCourse));

// Delete a course (instructor who owns it)
router.delete('/:id', asHandler(deleteCourse));

// Enrollment routes
// Enroll in a course (students only)
router.post('/:courseId/enroll', asHandler(enrollInCourse));

// Check enrollment status
router.get('/:courseId/check-enrollment', asHandler(checkEnrollment));

// Get all enrollments for a course (instructor only)
router.get('/:courseId/enrollments', asHandler(getCourseEnrollments));

// Video routes
// Get all videos for a course
router.get('/:courseId/videos', asHandler(getCourseVideos));

// Add a video to a course (instructors only)
router.post('/:courseId/videos', asHandler(addVideo));

// Update a video (instructor who owns the course)
router.put('/videos/:videoId', asHandler(updateVideo));

// Delete a video (instructor who owns the course)
router.delete('/videos/:videoId', asHandler(deleteVideo));

export default router; 