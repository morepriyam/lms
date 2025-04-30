export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;        // YouTube URL
  order: number;      // Display order in course
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoFormData {
  title: string;
  description: string;
  url: string;
  order: number;
} 