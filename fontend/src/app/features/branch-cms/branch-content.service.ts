import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  CollectionItem, CollectionType,
  CreateCollectionItemPayload, UpdateCollectionItemPayload,
} from './branch-cms.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BranchContentService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(type?: CollectionType): Observable<CollectionItem[]> {
    const params: Record<string, string> | undefined = type ? { type } : undefined;
    return this.api.get<CollectionItem[]>('/branch-content', params);
  }

  getById(id: number): Observable<CollectionItem> {
    return this.api.get<CollectionItem>(`/branch-content/${id}`);
  }

  create(payload: CreateCollectionItemPayload): Observable<CollectionItem> {
    return this.api.post<CollectionItem>('/branch-content', payload);
  }

  update(id: number, payload: UpdateCollectionItemPayload): Observable<CollectionItem> {
    return this.api.patch<CollectionItem>(`/branch-content/${id}`, payload);
  }

  delete(id: number): Observable<{ deleted: boolean; id: number }> {
    return this.api.delete<{ deleted: boolean; id: number }>(`/branch-content/${id}`);
  }

  // Public — no auth
  listPublic(branchCode: string, type: CollectionType): Observable<CollectionItem[]> {
    return this.http.get<CollectionItem[]>(`${this.base}/branch-content/public/${branchCode}/${type}`);
  }
}
