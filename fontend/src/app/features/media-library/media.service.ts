import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MediaAsset, UploadResult, MediaType, OwnerScope, UploadCategory } from './media.models';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  list(filters?: { mediaType?: MediaType; search?: string; isActive?: boolean }): Observable<MediaAsset[]> {
    let params = new HttpParams();
    if (filters?.mediaType)            params = params.set('mediaType', filters.mediaType);
    if (filters?.search)               params = params.set('search', filters.search);
    if (filters?.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    return this.http.get<MediaAsset[]>(`${this.base}/media-library`, { params });
  }

  upload(
    file: File,
    opts: {
      title?: string;
      uploadCategory: UploadCategory;
      ownerScope: OwnerScope;
      branchId?: number;
    },
  ): Observable<UploadResult> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploadCategory', opts.uploadCategory);
    fd.append('ownerScope', opts.ownerScope);
    if (opts.title)    fd.append('title', opts.title);
    if (opts.branchId) fd.append('branchId', String(opts.branchId));
    return this.http.post<UploadResult>(`${this.base}/upload-gateway/file`, fd);
  }

  // Soft deactivate via media-library endpoint
  deactivate(id: number): Observable<MediaAsset> {
    return this.http.patch<MediaAsset>(`${this.base}/media-library/${id}/deactivate`, {});
  }

  // Hard delete (disk + soft deactivate) via upload gateway
  deleteFile(mediaAssetId: number): Observable<{ asset: MediaAsset; diskDeleted: boolean }> {
    return this.http.delete<{ asset: MediaAsset; diskDeleted: boolean }>(
      `${this.base}/upload-gateway/file/${mediaAssetId}`,
    );
  }
}
