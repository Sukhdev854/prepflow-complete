// Subject color coding for visual differentiation
export const SUBJECT_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', gradient: 'from-indigo-500 to-indigo-600', hex: '#6366f1' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', gradient: 'from-purple-500 to-purple-600', hex: '#8b5cf6' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', gradient: 'from-pink-500 to-pink-600', hex: '#ec4899' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', gradient: 'from-rose-500 to-rose-600', hex: '#f43f5e' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', gradient: 'from-orange-500 to-orange-600', hex: '#f97316' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', gradient: 'from-amber-500 to-amber-600', hex: '#f59e0b' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', gradient: 'from-yellow-500 to-yellow-600', hex: '#eab308' },
  { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300', gradient: 'from-lime-500 to-lime-600', hex: '#84cc16' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', gradient: 'from-green-500 to-green-600', hex: '#10b981' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', gradient: 'from-emerald-500 to-emerald-600', hex: '#059669' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', gradient: 'from-teal-500 to-teal-600', hex: '#14b8a6' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', gradient: 'from-cyan-500 to-cyan-600', hex: '#06b6d4' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', gradient: 'from-sky-500 to-sky-600', hex: '#0ea5e9' },
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', gradient: 'from-blue-500 to-blue-600', hex: '#3b82f6' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', gradient: 'from-violet-500 to-violet-600', hex: '#7c3aed' },
];

// Assign consistent colors to subjects
const subjectColorMap = new Map<string, typeof SUBJECT_COLORS[0]>();

export function getSubjectColor(subjectCode: string) {
  if (!subjectColorMap.has(subjectCode)) {
    const index = subjectColorMap.size % SUBJECT_COLORS.length;
    subjectColorMap.set(subjectCode, SUBJECT_COLORS[index]);
  }
  return subjectColorMap.get(subjectCode)!;
}

// Get completion status color
export function getCompletionColor(completionRate: number, animated = false) {
  const baseClasses = animated ? 'transition-all duration-500' : '';
  
  if (completionRate >= 0.7) {
    return {
      bg: `bg-green-500 ${baseClasses}`,
      text: 'text-green-600',
      glow: animated ? 'shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse' : '',
      label: 'On Track',
      emoji: '🟢',
    };
  } else if (completionRate >= 0.4) {
    return {
      bg: `bg-yellow-500 ${baseClasses}`,
      text: 'text-yellow-600',
      glow: animated ? 'shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse' : '',
      label: 'Behind Schedule',
      emoji: '🟡',
    };
  } else {
    return {
      bg: `bg-red-500 ${baseClasses}`,
      text: 'text-red-600',
      glow: animated ? 'shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse' : '',
      label: 'Far Behind',
      emoji: '🔴',
    };
  }
}

// Difficulty level colors and labels
export const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Very Easy', emoji: '😊', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 2, label: 'Easy', emoji: '🙂', bg: 'bg-lime-100', text: 'text-lime-800' },
  { value: 3, label: 'Medium', emoji: '😐', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { value: 4, label: 'Hard', emoji: '😰', bg: 'bg-orange-100', text: 'text-orange-800' },
  { value: 5, label: 'Very Hard', emoji: '😱', bg: 'bg-red-100', text: 'text-red-800' },
] as const;

export function getDifficultyInfo(difficulty?: number) {
  if (!difficulty) return null;
  return DIFFICULTY_LEVELS.find(d => d.value === difficulty);
}

// Status colors
export const STATUS_OPTIONS = [
  { value: 'done', label: 'Done', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✓' },
  { value: 'in-progress', label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: '⟳' },
  { value: 'to-mark', label: 'To Mark', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', icon: '📝' },
  { value: 'to-review', label: 'To Review', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '👀' },
  { value: 'not-started', label: 'Not Started', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', icon: '○' },
] as const;

export function getStatusInfo(status?: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[2];
}