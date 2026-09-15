import React from 'react';
import type { CourseLessonBlock } from '../debt-rescue/types';
import TextBlock from './blocks/TextBlock';
import BulletsBlock from './blocks/BulletsBlock';
import ChecklistBlock from './blocks/ChecklistBlock';
import QuoteBlock from './blocks/QuoteBlock';
import AnalogyBox from './blocks/AnalogyBox';
import ActionBlock from './blocks/ActionBlock';
import QuizBlock from './blocks/QuizBlock';
import ToolCTA from './blocks/ToolCTA';
import CaseStudyBlock from './blocks/CaseStudyBlock';
import PrincipleBlock from './blocks/PrincipleBlock';

interface Props {
  block: CourseLessonBlock;
  onQuizCompleted?: () => void;
}

const BlockRenderer: React.FC<Props> = ({ block, onQuizCompleted }) => {
  switch (block.type) {
    case 'text':
      return <TextBlock title={block.title} content={block.content} />;

    case 'bullets':
      return <BulletsBlock title={block.title} items={block.items} />;

    case 'checklist':
      return <ChecklistBlock title={block.title} items={block.items} />;

    case 'quote':
      return <QuoteBlock content={block.content} />;

    case 'analogy':
      return <AnalogyBox title={block.title} content={block.content} />;

    case 'action':
      return <ActionBlock title={block.title} content={block.content} />;

    case 'quiz':
      return (
        <QuizBlock
          question={block.question}
          options={block.options}
          correctIndex={block.correctIndex}
          feedbackCorrect={block.feedbackCorrect}
          feedbackIncorrect={block.feedbackIncorrect}
          onCompleted={onQuizCompleted}
        />
      );

    case 'tool-cta':
      return (
        <ToolCTA
          tool={block.tool as any}
          title={block.title}
          content={block.content}
          buttonLabel={block.buttonLabel}
          buttonHref={block.buttonHref}
          prompt={block.prompt}
        />
      );

    case 'case-study':
      return (
        <CaseStudyBlock
          title={block.title}
          subtitle={block.subtitle}
          scenarios={block.scenarios}
          takeaway={block.takeaway}
        />
      );

    case 'principle':
      return (
        <PrincipleBlock
          title={block.title}
          statement={block.statement}
          context={block.context}
          practicalRule={block.practicalRule}
        />
      );

    default:
      return null;
  }
};

export default BlockRenderer;
