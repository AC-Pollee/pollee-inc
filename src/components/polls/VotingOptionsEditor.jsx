import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function VotingOptionsEditor({ options, onChange, onAdd, onRemove, onUpdate, minOptions = 2, maxOptions = 2 }) {
  const atMax = options.length >= maxOptions;
  const { t } = useTranslation();
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const reordered = Array.from(options);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered);
  };

  return (
    <div className="space-y-3">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="voting-options">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-3"
            >
              <AnimatePresence>
                {options.map((option, index) => (
                  <Draggable key={option.id} draggableId={option.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <motion.div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex items-start gap-2 p-2 rounded-xl border transition-shadow ${
                          snapshot.isDragging
                            ? 'bg-indigo-50 border-indigo-300 shadow-lg'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          title={t('votingOptionsEditor.dragToReorder')}
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <span className="mt-2 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600 flex-shrink-0">
                          {index + 1}
                        </span>

                        <Textarea
                          placeholder={t('votingOptionsEditor.option', { num: index + 1 })}
                          value={option.label}
                          onChange={(e) => onUpdate(option.id, e.target.value)}
                          className="flex-1 rounded-xl resize-none min-h-[48px] max-h-32 leading-snug"
                          rows={1}
                        />

                        {options.length > minOptions && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(option.id)}
                            className="text-slate-400 hover:text-red-500 mt-1 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!atMax && (
        <Button
          variant="outline"
          onClick={onAdd}
          className="w-full h-12 rounded-xl border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('votingOptionsEditor.addOption')}
        </Button>
      )}
    </div>
  );
}