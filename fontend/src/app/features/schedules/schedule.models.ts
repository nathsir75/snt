export interface BatchSchedule {
  id: number;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  room: string | null;
  createdAt: string;
  updatedAt: string;
  batch: {
    id: number;
    name: string;
    branch: { id: number; name: string };
  };
}

export interface CreateSchedulePayload {
  batchId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
