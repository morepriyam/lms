import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuthToken, requireInstructor } from '../middlewares/auth.middleware';

// Add a new quiz to a course
export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, questions, order } = req.body;
    
    // Check if user is an instructor
    const userId = requireInstructor(req, res);
    if (!userId) return; // Response already sent by helper

    if (!title) {
      return res.status(400).json({ message: 'Quiz title is required' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Verify the course exists and belongs to the instructor
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== userId) {
      return res.status(403).json({ message: 'You can only add quizzes to your own courses' });
    }

    // Create quiz with questions and options
    const quiz = await prisma.quiz.create({
      data: {
        title,
        order: order || 0,
        course: {
          connect: { id: courseId },
        },
        creator: {
          connect: { id: userId },
        },
        questions: {
          create: questions.map((q: any) => ({
            text: q.text,
            options: {
              create: q.options.map((o: any) => ({
                text: o.text,
                isCorrect: o.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    return res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Course not found' });
      }
    }
    
    return res.status(500).json({ message: 'Failed to create quiz' });
  }
};

// Get all quizzes for a course
export const getCourseQuizzes = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify the course exists
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // For students, only show quizzes if the course is published
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'INSTRUCTOR' && !course.published) {
      return res.status(403).json({ message: 'Course is not published' });
    }

    // Get all quizzes for the course
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
      orderBy: {
        order: 'asc'
      },
    });

    return res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
};

// Get a specific quiz by ID
export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = requireAuthToken(req).id;

    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      include: {
        course: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // For students, only show quiz if the course is published
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'INSTRUCTOR' && !quiz.course.published) {
      return res.status(403).json({ message: 'Course is not published' });
    }

    return res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return res.status(500).json({ message: 'Failed to fetch quiz' });
  }
};

// Delete a quiz
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get the quiz with the course to check ownership
    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      include: {
        course: true,
        questions: {
          include: {
            options: true
          }
        }
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the instructor of the course
    if (quiz.course.instructorId !== userId) {
      return res.status(403).json({ message: 'You can only delete quizzes from your own courses' });
    }

    // Delete quiz and related data using a transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      // 1. Delete quiz results
      await tx.quizResult.deleteMany({
        where: { quizId }
      });

      // 2. Delete options for all questions in the quiz
      for (const question of quiz.questions) {
        await tx.option.deleteMany({
          where: { questionId: question.id }
        });
      }

      // 3. Delete all questions
      await tx.question.deleteMany({
        where: { quizId }
      });

      // 4. Finally delete the quiz
      await tx.quiz.delete({
        where: { id: quizId }
      });
    });

    return res.status(200).json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return res.status(500).json({ message: 'Failed to delete quiz' });
  }
};

// Update a quiz
export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { title, order } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get the quiz with the course to check ownership
    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },
      include: {
        course: true
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the instructor of the course
    if (quiz.course.instructorId !== userId) {
      return res.status(403).json({ message: 'You can only update quizzes from your own courses' });
    }

    // Update the quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: title !== undefined ? title : quiz.title,
        order: order !== undefined ? order : quiz.order
      }
    });

    return res.status(200).json(updatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    return res.status(500).json({ message: 'Failed to update quiz' });
  }
};

// Submit a quiz answer and calculate score
export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = requireAuthToken(req).id;

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return res.status(400).json({ message: 'Quiz answers are required' });
    }

    // Get the quiz with questions and correct options
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if the user is enrolled in the course (if not the creator)
    if (quiz.creatorId !== userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: quiz.courseId,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({ message: 'You must be enrolled in this course to submit a quiz' });
      }
    }

    // Check if user has already submitted this quiz
    const existingResult = await prisma.quizResult.findUnique({
      where: {
        userId_quizId: {
          userId,
          quizId,
        },
      },
    });

    if (existingResult) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // Calculate score
    let correctAnswers = 0;
    const questionMap = new Map();
    
    quiz.questions.forEach(question => {
      const correctOption = question.options.find(option => option.isCorrect);
      if (correctOption) {
        questionMap.set(question.id, correctOption.id);
      }
    });

    // Check user answers against correct answers
    for (const [questionId, selectedOptionId] of Object.entries(answers)) {
      if (questionMap.get(questionId) === selectedOptionId) {
        correctAnswers++;
      }
    }

    const totalQuestions = quiz.questions.length;
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Save quiz result
    const quizResult = await prisma.quizResult.create({
      data: {
        user: { connect: { id: userId } },
        quiz: { connect: { id: quizId } },
        score,
        answers: answers as Prisma.JsonObject,
      },
      include: {
        quiz: {
          select: {
            title: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: quizResult.id,
      score: quizResult.score,
      correctAnswers,
      totalQuestions,
      quizTitle: quizResult.quiz.title,
      submittedAt: quizResult.submittedAt,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return res.status(500).json({ message: 'Failed to submit quiz' });
  }
};

// Get quiz results for a user
export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = requireAuthToken(req).id;

    const quizResult = await prisma.quizResult.findUnique({
      where: {
        userId_quizId: {
          userId,
          quizId,
        },
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!quizResult) {
      return res.status(404).json({ message: 'Quiz result not found' });
    }

    // For instructors or the user who took the quiz
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.role !== 'INSTRUCTOR' && quizResult.userId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view these results' });
    }

    // Return formatted results with details about correct/incorrect answers
    const formattedResult = {
      id: quizResult.id,
      score: quizResult.score,
      submittedAt: quizResult.submittedAt,
      quiz: quizResult.quiz.title,
      answers: quizResult.quiz.questions.map(question => {
        const selectedOptionId = (quizResult.answers as any)[question.id];
        const selectedOption = question.options.find(o => o.id === selectedOptionId);
        const correctOption = question.options.find(o => o.isCorrect);
        
        return {
          questionId: question.id,
          questionText: question.text,
          selectedOption: selectedOption ? {
            id: selectedOption.id,
            text: selectedOption.text,
          } : null,
          correctOption: correctOption ? {
            id: correctOption.id,
            text: correctOption.text,
          } : null,
          isCorrect: selectedOption?.isCorrect || false,
        };
      }),
    };

    return res.json(formattedResult);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return res.status(500).json({ message: 'Failed to fetch quiz results' });
  }
};

// Get all quiz results for a course (instructors only)
export const getCourseQuizResults = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    // Check if user is an instructor
    const userId = requireInstructor(req, res);
    if (!userId) return; // Response already sent by helper

    // Verify user is instructor of the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== userId) {
      return res.status(403).json({ 
        message: 'Only the course instructor can view all quiz results' 
      });
    }

    // Get all quiz results for the course's quizzes
    const quizResults = await prisma.quizResult.findMany({
      where: {
        quiz: {
          courseId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { quiz: { title: 'asc' } },
        { submittedAt: 'desc' },
      ],
    });

    // Group by quiz
    const resultsByQuiz = quizResults.reduce((acc, result) => {
      const quizId = result.quiz.id;
      if (!acc[quizId]) {
        acc[quizId] = {
          quizId,
          quizTitle: result.quiz.title,
          results: [],
        };
      }
      
      acc[quizId].results.push({
        resultId: result.id,
        student: result.user,
        score: result.score,
        submittedAt: result.submittedAt,
      });
      
      return acc;
    }, {} as Record<string, any>);

    return res.json(Object.values(resultsByQuiz));
  } catch (error) {
    console.error('Error fetching course quiz results:', error);
    return res.status(500).json({ message: 'Failed to fetch course quiz results' });
  }
}; 