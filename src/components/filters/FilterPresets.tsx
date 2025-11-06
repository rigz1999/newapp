import { useState } from 'react';
import { Save, Trash2, Star } from 'lucide-react';
import type { FilterPreset } from '../../hooks/useAdvancedFilters';

interface FilterPresetsProps {
  presets: FilterPreset[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function FilterPresets({
  presets,
  onSave,
  onLoad,
  onDelete,
  className = '',
}: FilterPresetsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSave = () => {
    if (newPresetName.trim()) {
      onSave(newPresetName.trim());
      setNewPresetName('');
      setIsAdding(false);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Star className="w-4 h-4" />
          Filtres enregistrés
        </label>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
        >
          <Save className="w-3 h-3" />
          Sauvegarder
        </button>
      </div>

      {isAdding && (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Nom du filtre..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            OK
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewPresetName('');
            }}
            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Annuler
          </button>
        </div>
      )}

      {presets.length > 0 ? (
        <div className="space-y-1">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <button
                onClick={() => onLoad(preset.id)}
                className="flex-1 text-left text-sm text-slate-700 hover:text-blue-600"
              >
                {preset.name}
              </button>
              <button
                onClick={() => onDelete(preset.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">
          Aucun filtre enregistré
        </p>
      )}
    </div>
  );
}