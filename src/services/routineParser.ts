import { GeneratedRoutine, GeneratedTask } from './ai/schema';

export const parseMarkdownRoutine = (markdown: string): GeneratedRoutine => {
  const lines = markdown.split('\n');
  
  let title = '';
  let goal = '';
  let routine_type = '';
  const tasks: GeneratedTask[] = [];

  let currentWeek = 1;
  let currentDay = 'Monday';
  let currentTask: Partial<GeneratedTask> | null = null;

  const pushCurrentTask = () => {
    if (currentTask && currentTask.title) {
      tasks.push(currentTask as GeneratedTask);
    }
    currentTask = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Routine Title
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim();
    }
    // Tag / Category
    else if (line.toLowerCase().startsWith('tag:')) {
      routine_type = line.substring(4).replace(/^\[|\]$/g, '').trim();
    }
    // Routine Goal
    else if (line.toLowerCase().startsWith('goal:')) {
      goal = line.substring(5).trim();
    }
    // Week
    else if (line.startsWith('## ')) {
      pushCurrentTask();
      const weekMatch = line.match(/Week\s+(\d+)/i);
      if (weekMatch) {
        currentWeek = parseInt(weekMatch[1], 10);
      }
    }
    // Day
    else if (line.startsWith('### ')) {
      pushCurrentTask();
      currentDay = line.replace('### ', '').trim();
    }
    // Task Title
    else if (line.startsWith('#### ')) {
      pushCurrentTask();
      currentTask = {
        title: line.replace('#### ', '').trim(),
        target_week: currentWeek,
        target_day: currentDay,
        priority: 'medium', // Default
        category: 'general', // Default
        estimated_duration_minutes: 30, // Default
        description: '',
        subtasks: []
      };
    }
    // Task properties
    else if (currentTask && line.startsWith('- ')) {
      const propText = line.substring(2).trim();

      // Subtask
      if (propText.startsWith('[ ]') || propText.startsWith('[x]')) {
        const subtaskTitle = propText.replace(/^\[[ x]\]\s*/i, '').trim();
        if (subtaskTitle) {
          currentTask.subtasks?.push(subtaskTitle);
        }
      } 
      // Properties
      else if (propText.toLowerCase().startsWith('time:') || propText.toLowerCase().startsWith('scheduled time:')) {
        const val = propText.replace(/^(time:|scheduled time:)\s*/i, '').trim();
        // Extract just the HH:MM part in case they add extra text
        const timeMatch = val.match(/\d{1,2}:\d{2}/);
        if (timeMatch) {
          currentTask.scheduled_time = timeMatch[0];
        }
      }
      else if (propText.toLowerCase().startsWith('priority:')) {
        const val = propText.substring(9).trim().toLowerCase();
        if (['high', 'medium', 'low'].includes(val)) {
          currentTask.priority = val as any;
        }
      }
      else if (propText.toLowerCase().startsWith('duration:')) {
        currentTask.estimated_duration_minutes = parseInt(propText.substring(9).trim(), 10) || 30;
      }
      else if (propText.toLowerCase().startsWith('category:')) {
        currentTask.category = propText.substring(9).trim();
      }
      else if (propText.toLowerCase().startsWith('description:')) {
        currentTask.description = propText.substring(12).trim();
      }
    }
  }

  pushCurrentTask();

  const sanitizeStr = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!title) title = 'Custom Routine';
  if (!goal) goal = 'Follow the plan to achieve your goals.';

  return {
    routine: {
      title: sanitizeStr(title),
      goal: sanitizeStr(goal),
      routine_type: sanitizeStr(routine_type) || 'General',
    },
    tasks: tasks.map(t => ({
      ...t,
      title: sanitizeStr(t.title),
      description: sanitizeStr(t.description || ''),
      category: sanitizeStr(t.category || ''),
      subtasks: t.subtasks?.map(sanitizeStr) || []
    })),
  };
};
