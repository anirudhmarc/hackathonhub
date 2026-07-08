import { RubricPanel } from '@/components/RubricPanel';

const RubricPage = () => {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Judging Rubric</h2>
        <p className="text-sm text-muted-foreground">
          Scoring guidance for evaluating submissions.
        </p>
      </div>
      <RubricPanel defaultOpen className="shadow-sm" />
    </div>
  );
};

export default RubricPage;
