import { Request, Response } from 'express';
import prisma from '../utils/db';
import { AuthRequest } from '../types';
import { UserRole } from '@prisma/client';

// Get all courses
export const getAllCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    console.log('Fetching courses for user:', { userId, userRole });
    
    // Different query based on user role
    let courses;
    
    if (userRole === UserRole.INSTRUCTOR) {
      // Instructors see their own courses (both published and unpublished)
      console.log('Fetching instructor courses, including drafts');
      courses = await prisma.course.findMany({
        where: {
          instructorId: userId
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Students see all published courses
      console.log('Fetching student-viewable courses (published only)');
      courses = await prisma.course.findMany({
        where: {
          published: true
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
    
    console.log(`Found ${courses.length} courses for user`);
    res.status(200).json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

// Get course by ID
export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        videos: {
          orderBy: {
            order: 'asc'
          }
        },
        quizzes: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    // Check access permissions
    if (!course.published && course.instructorId !== userId && userRole !== UserRole.INSTRUCTOR) {
      res.status(403).json({ message: 'You do not have permission to access this course' });
      return;
    }
    
    res.status(200).json({ course });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
};

// Create a new course with improved logging
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, price, published } = req.body;
    const instructorId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    console.log('Creating course, received data:', { title, description, price, published });
    console.log('User info:', { instructorId, userRole });
    
    // Validate instructor role
    if (userRole !== UserRole.INSTRUCTOR) {
      console.log('Course creation failed: User is not an instructor');
      res.status(403).json({ message: 'Only instructors can create courses' });
      return;
    }
    
    // Validate input
    if (!title || !description) {
      console.log('Course creation failed: Missing required fields');
      res.status(400).json({ message: 'Title and description are required' });
      return;
    }
    
    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        price: typeof price === 'number' ? price : 0,
        published: Boolean(published),
        instructorId: instructorId as string
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('Course created successfully:', newCourse);
    res.status(201).json({ course: newCourse });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, price, published } = req.body;
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    // Check if course exists and belongs to instructor
    const course = await prisma.course.findUnique({
      where: { id }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    if (course.instructorId !== userId) {
      res.status(403).json({ message: 'You do not have permission to update this course' });
      return;
    }
    
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        title: title || course.title,
        description: description || course.description,
        price: typeof price === 'number' ? price : course.price,
        published: typeof published === 'boolean' ? published : course.published
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    res.status(200).json({ course: updatedCourse });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
};

// Delete a course
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.id;
    
    // Check if course exists and belongs to instructor
    const course = await prisma.course.findUnique({
      where: { id }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    if (course.instructorId !== userId) {
      res.status(403).json({ message: 'You do not have permission to delete this course' });
      return;
    }
    
    // Delete related records first
    await prisma.$transaction([
      // Delete enrollments
      prisma.enrollment.deleteMany({
        where: { courseId: id }
      }),
      // Delete videos
      prisma.video.deleteMany({
        where: { courseId: id }
      }),
      // Delete quiz results related to quizzes in this course
      prisma.quizResult.deleteMany({
        where: {
          quiz: {
            courseId: id
          }
        }
      }),
      // Delete options related to questions in quizzes in this course
      prisma.option.deleteMany({
        where: {
          question: {
            quiz: {
              courseId: id
            }
          }
        }
      }),
      // Delete questions related to quizzes in this course
      prisma.question.deleteMany({
        where: {
          quiz: {
            courseId: id
          }
        }
      }),
      // Delete quizzes
      prisma.quiz.deleteMany({
        where: { courseId: id }
      }),
      // Finally delete the course
      prisma.course.delete({
        where: { id }
      })
    ]);
    
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
}; 

// Enroll in a course
export const enrollInCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    // Validate student role
    if (userRole !== UserRole.STUDENT) {
      res.status(403).json({ message: 'Only students can enroll in courses' });
      return;
    }
    
    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        published: true
      }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found or not published' });
      return;
    }
    
    // Check if user is already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId as string,
          courseId
        }
      }
    });
    
    if (existingEnrollment) {
      res.status(400).json({ message: 'You are already enrolled in this course' });
      return;
    }
    
    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: userId as string,
        courseId,
        paid: true, // In a real app, this would be set after payment processing
      },
      include: {
        course: {
          select: {
            title: true,
            price: true
          }
        }
      }
    });
    
    res.status(201).json({ enrollment, message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ message: 'Failed to enroll in course' });
  }
};

// Get user's enrolled courses
export const getEnrolledCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.id;
    
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: userId as string
      },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });
    
    const courses = enrollments.map(enrollment => enrollment.course);
    
    res.status(200).json({ courses });
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ message: 'Failed to fetch enrolled courses' });
  }
};

// Check if a user is enrolled in a specific course
export const checkEnrollment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = (req as AuthRequest).user?.id;
    
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: userId as string,
          courseId
        }
      }
    });
    
    res.status(200).json({ enrolled: !!enrollment });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ message: 'Failed to check enrollment status' });
  }
};

// Add a video to a course
export const addVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, description, url, order } = req.body;
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    // Validate instructor role
    if (userRole !== UserRole.INSTRUCTOR) {
      res.status(403).json({ message: 'Only instructors can add videos' });
      return;
    }
    
    // Check if course exists and belongs to instructor
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    if (course.instructorId !== userId) {
      res.status(403).json({ message: 'You can only add videos to your own courses' });
      return;
    }
    
    // Validate input
    if (!title || !url) {
      res.status(400).json({ message: 'Title and URL are required' });
      return;
    }
    
    // Validate YouTube URL
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      res.status(400).json({ message: 'Please provide a valid YouTube URL' });
      return;
    }
    
    // Create video
    const video = await prisma.video.create({
      data: {
        title,
        description: description || '',
        url,
        order: order || 0,
        courseId
      }
    });
    
    res.status(201).json({ video });
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ message: 'Failed to add video' });
  }
};

// Get videos for a course
export const getCourseVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = (req as AuthRequest).user?.id;
    
    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollments: {
          where: {
            userId: userId as string
          }
        }
      }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    // Check if user is instructor or enrolled
    const isInstructor = course.instructorId === userId;
    const isEnrolled = course.enrollments.length > 0;
    
    if (!isInstructor && !isEnrolled && !course.published) {
      res.status(403).json({ message: 'You do not have access to this course' });
      return;
    }
    
    // Get videos
    const videos = await prisma.video.findMany({
      where: { courseId },
      orderBy: { order: 'asc' }
    });
    
    res.status(200).json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
};

// Update a video
export const updateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const { title, description, url, order } = req.body;
    const userId = (req as AuthRequest).user?.id;
    
    // Get video with course info
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { course: true }
    });
    
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    
    // Check if user is the instructor of the course
    if (video.course.instructorId !== userId) {
      res.status(403).json({ message: 'You can only update videos in your own courses' });
      return;
    }
    
    // Update video
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        title: title || video.title,
        description: description !== undefined ? description : video.description,
        url: url || video.url,
        order: order !== undefined ? order : video.order
      }
    });
    
    res.status(200).json({ video: updatedVideo });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Failed to update video' });
  }
};

// Delete a video
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const userId = (req as AuthRequest).user?.id;
    
    // Get video with course info
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { course: true }
    });
    
    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }
    
    // Check if user is the instructor of the course
    if (video.course.instructorId !== userId) {
      res.status(403).json({ message: 'You can only delete videos from your own courses' });
      return;
    }
    
    // Delete video
    await prisma.video.delete({
      where: { id: videoId }
    });
    
    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
};

// Get all enrollments for a course (instructor only)
export const getCourseEnrollments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = (req as AuthRequest).user?.id;
    const userRole = (req as AuthRequest).user?.role;
    
    // Validate instructor role
    if (userRole !== UserRole.INSTRUCTOR) {
      res.status(403).json({ message: 'Only instructors can view course enrollments' });
      return;
    }
    
    // Check if course exists and belongs to instructor
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    
    if (!course) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    
    if (course.instructorId !== userId) {
      res.status(403).json({ message: 'You can only view enrollments for your own courses' });
      return;
    }
    
    // Get enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });
    
    res.status(200).json({ enrollments });
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    res.status(500).json({ message: 'Failed to fetch course enrollments' });
  }
}; 