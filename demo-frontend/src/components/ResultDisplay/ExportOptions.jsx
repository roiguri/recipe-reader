import React from 'react';
import Card from '../ui/Card';

/**
 * ExportOptions component displays export options for recipes
 * @param {Object} props - Component props
 * @param {Object} props.recipe - Recipe data object
 * @param {Function} props.onExport - Export function
 */
const ExportOptions = ({ recipe, onExport }) => {
  const exportFormats = [
    { id: 'json', label: 'JSON', icon: '📄', description: 'Export as JSON data' },
    { id: 'markdown', label: 'Markdown', icon: '📝', description: 'Export as Markdown document' },
    { id: 'pdf', label: 'PDF', icon: '📑', description: 'Export as PDF document' },
    { id: 'txt', label: 'Plain Text', icon: '📋', description: 'Export as plain text' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1b0e0e] mb-2">Export Recipe</h2>
        <p className="text-gray-600">Choose your preferred format to export the recipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportFormats.map((format) => {
          const handleKeyDown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onExport(format.id, recipe);
            }
          };

          return (
            <Card 
              key={format.id}
              className="p-6 hover:shadow-lg transition-shadow"
              onClick={() => onExport(format.id, recipe)}
              role="button"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">{format.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#1b0e0e]">{format.label}</h3>
                <p className="text-sm text-gray-600">{format.description}</p>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ExportOptions; 