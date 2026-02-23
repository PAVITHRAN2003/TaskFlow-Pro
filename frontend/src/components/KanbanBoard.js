import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Plus, GripVertical, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_STYLES = {
  low: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  high: 'bg-red-500/15 text-red-400 border-red-500/20',
  urgent: 'bg-red-600/20 text-red-500 border-red-600/30',
};

const TaskCard = ({ task, members, onClick, provided, isDragging }) => {
  const assignee = members.find(m => m.id === task.assignee_id);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`bg-card border border-border rounded-md p-3 mb-2 cursor-pointer hover:border-zinc-600 transition-colors duration-150 group ${
        isDragging ? 'task-card-dragging border-indigo-500/50 shadow-lg' : ''
      }`}
      onClick={() => onClick(task)}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div
          {...provided.dragHandleProps}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
          data-testid={`drag-handle-${task.id}`}
        >
          <GripVertical size={14} className="text-muted-foreground" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-5 font-mono ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}
        >
          {task.priority}
        </Badge>
        {task.due_date && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
            <Calendar size={10} strokeWidth={1.5} />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        <div className="flex-1" />
        {assignee && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white"
            style={{ backgroundColor: assignee.avatar_color }}
            title={assignee.name}
          >
            {assignee.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard = ({ columns, tasks, members, onTaskMove, onTaskClick, onAddTask }) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;

    // Same position, no move
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    onTaskMove(draggableId, destination.droppableId, destination.index);
  };

  const getColumnTasks = (columnId) => {
    return tasks
      .filter(t => t.status === columnId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-6 overflow-x-auto h-full" data-testid="kanban-board">
        {columns.map((column) => {
          const columnTasks = getColumnTasks(column.id);
          return (
            <div
              key={column.id}
              className="flex flex-col min-w-[280px] max-w-[320px] flex-1"
              data-testid={`kanban-column-${column.id}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${column.color}`} />
                  <span className="text-sm font-semibold" style={{ fontFamily: 'Manrope' }}>
                    {column.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono bg-muted rounded px-1.5 py-0.5">
                    {columnTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  data-testid={`add-task-${column.id}-btn`}
                  onClick={() => onAddTask(column.id)}
                >
                  <Plus size={14} strokeWidth={2} />
                </Button>
              </div>

              {/* Column Body */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-lg p-2 min-h-[120px] transition-colors duration-150 ${
                      snapshot.isDraggingOver
                        ? 'bg-indigo-500/5 border border-indigo-500/20'
                        : 'bg-muted/30 border border-transparent'
                    }`}
                  >
                    <ScrollArea className="h-full">
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <TaskCard
                              task={task}
                              members={members}
                              onClick={onTaskClick}
                              provided={provided}
                              isDragging={snapshot.isDragging}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
