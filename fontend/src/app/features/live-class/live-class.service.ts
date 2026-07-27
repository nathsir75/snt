import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';

export type PlaybackState = 'playing' | 'paused';
export type LiveSessionType = 'live' | 'recorded';

export type LiveSession = {
  id: number;
  batchId: number;
  title: string;
  youtubeVideoId: string;
  sessionType: LiveSessionType;
  scheduledAt: string;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudentLiveSessionsResponse = {
  batch: { id: number; name: string; course?: { id: number; name: string; code: string } } | null;
  currentLiveSession: LiveSession | null;
  currentTeamsMeeting: {
    batchId: number;
    batchName: string;
    joinUrl: string;
    startTime: string;
    endTime: string;
  } | null;
  recordedSessions: LiveSession[];
};

export type WatchHeartbeat = {
  id: number;
  liveSessionId: number;
  studentId: number;
  receivedAt: string;
  playbackState: PlaybackState;
};

export type MySessionAttendance = {
  id: number;
  liveSessionId: number;
  studentId: number;
  totalWatchSeconds: number;
  isPresent: boolean;
  markedAt: string;
};

export type MySessionAttendanceResponse = {
  liveSession: {
    id: number;
    durationMinutes: number;
  };
  attendance: MySessionAttendance | null;
};

@Injectable({ providedIn: 'root' })
export class LiveClassService {
  private readonly api = inject(ApiService);

  getActiveSession(): Observable<LiveSession | null> {
    return this.api
      .get<StudentLiveSessionsResponse>('/live-sessions/student/my')
      .pipe(map((res) => res.currentLiveSession));
  }

  getStudentSessions(): Observable<StudentLiveSessionsResponse> {
    return this.api.get<StudentLiveSessionsResponse>('/live-sessions/student/my');
  }

  getRecordedSessions(batchId: number): Observable<LiveSession[]> {
    return this.api
      .get<LiveSession[]>(`/live-sessions/batch/${batchId}`)
      .pipe(map((sessions) => sessions.filter((session) => session.sessionType === 'recorded')));
  }

  getMySessionAttendance(liveSessionId: number): Observable<MySessionAttendanceResponse> {
    return this.api.get<MySessionAttendanceResponse>(`/attendance-tracking/my/live-session/${liveSessionId}`);
  }

  sendHeartbeat(liveSessionId: number, playbackState: PlaybackState): Observable<WatchHeartbeat> {
    return this.api.post<WatchHeartbeat>('/attendance-tracking/heartbeat', {
      liveSessionId,
      playbackState,
    });
  }
}
