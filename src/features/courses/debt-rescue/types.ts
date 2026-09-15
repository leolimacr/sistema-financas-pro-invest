export type CourseLessonBlock =
  | {
      type: 'text';
      title?: string;
      content: string;
    }
  | {
      type: 'bullets';
      title?: string;
      items: string[];
    }
  | {
      type: 'checklist';
      title?: string;
      items: string[];
    }
  | {
      type: 'quote';
      content: string;
    }
  | {
      type: 'analogy';
      title?: string;
      content: string;
    }
  | {
      type: 'action';
      title?: string;
      content: string;
    }
  | {
      type: 'tool-cta';
      tool: 'debt-calculator' | 'nexus-ai' | 'budget-tool' | 'compound-interest' | 'goals' | string;
      title: string;
      content: string;
      buttonLabel: string;
      buttonHref?: string;
      prompt?: string;
    }
  | {
      type: 'quiz';
      question: string;
      options: string[];
      correctIndex: number;
      feedbackCorrect: string;
      feedbackIncorrect: string;
    }
  | {
      type: 'case-study';
      title: string;
      subtitle?: string;
      scenarios: Array<{
        title: string;
        badge?: string;
        badgeType?: 'danger' | 'warning' | 'success' | 'info';
        points: string[];
        highlightedResult?: string;
      }>;
      takeaway?: string;
    }
  | {
      type: 'principle';
      title?: string;
      statement: string;
      context?: string;
      practicalRule?: string;
    };

export interface CourseLesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  objective: string;
  blocks: CourseLessonBlock[];
}

export interface CourseModule {
  id: string;
  title: string;
  slug: string;
  objective: string;
  order: number;
  lessons: CourseLesson[];
  badgeLabel?: string;
}

export interface CourseMeta {
  id: string;
  title: string;
  slug: string;
  headline: string;
  shortDescription: string;
  audience: string;
  level: string;
  estimatedDuration: string;
  modulesCount: number;
}

export interface Course {
  meta: CourseMeta;
  modules: CourseModule[];
}
