import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import {
  CollegePartnershipEnquiry,
  CreateCollegePartnershipPayload,
  UpdateCollegePartnershipPayload,
} from './college-partnership.models';

@Injectable({ providedIn: 'root' })
export class CollegePartnershipService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(params: Record<string, string> = {}): Observable<CollegePartnershipEnquiry[]> {
    return this.api.get<CollegePartnershipEnquiry[]>('/college-partnerships', params);
  }

  getById(id: number): Observable<CollegePartnershipEnquiry> {
    return this.api.get<CollegePartnershipEnquiry>(`/college-partnerships/${id}`);
  }

  update(id: number, payload: UpdateCollegePartnershipPayload): Observable<CollegePartnershipEnquiry> {
    return this.api.patch<CollegePartnershipEnquiry>(`/college-partnerships/${id}`, payload);
  }

  submitPublic(payload: CreateCollegePartnershipPayload): Observable<{ id: number }> {
    const body = {
      enquiryType: 'college',
      fullName:    payload.contactPerson,
      phone:       payload.phone,
      email:       payload.email,
      subject:     `College Partnership — ${payload.collegeName}`,
      message:     payload.message,
      collegeName:        payload.collegeName,
      city:               payload.city,
      state:              payload.state,
      numberOfStudents:   payload.numberOfStudents,
      departments:        payload.departments,
      programsInterested: payload.programsInterested,
      mode:               payload.mode,
      timeline:           payload.timeline,
    };
    return this.http.post<{ id: number }>(`${this.base}/site-enquiries/public`, body);
  }
}
