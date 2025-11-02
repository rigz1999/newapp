import React from 'react';

interface Tranche {
  id: string;
  tranche_name: string;
  Date_d_echeance: string;
}

interface ProjectDetailProps {
  projectName: string;
  tranches: Tranche[];
  onEdit: (tranche: Tranche) => void;
  formatDate?: (date: string) => string;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectName,
  tranches,
  onEdit,
  formatDate,
}) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{projectName}</h1>

      <div className="space-y-4">
        {tranches.map((t) => (
          <div
            key={t.id}
            className="flex justify-between items-center p-4 border rounded-lg shadow-sm hover:shadow-md transition"
          >
            <div>
              <div className="text-sm font-medium">{t.tranche_name}</div>
              <div className="text-xs text-slate-500">
                Échéance:{' '}
                {formatDate ? formatDate(t.Date_d_echeance) : t.Date_d_echeance}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(t)}
                className="px-2 py-1 border rounded hover:bg-slate-100 transition"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectDetail;
