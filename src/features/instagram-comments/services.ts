import { api } from '@/lib/api';

export interface IgComment {
  id: string;
  fromUsername: string | null;
  fromExternalId: string;
  text: string;
  mediaId: string | null;
  mediaCaption: string | null;
  mediaPermalink: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  adId: string | null;
  dmSent: boolean;
  repliedPublic: boolean;
  convertedCardId: string | null;
  contactId: string | null;
  status: string; // NEW | HANDLED
  createdAt: string;
}

export interface IgCommentsPage {
  data: IgComment[];
  nextCursor: string | null;
}

export const instagramCommentsService = {
  async list(params?: {
    cursor?: string;
    limit?: number;
    status?: string;
  }): Promise<IgCommentsPage> {
    const { data } = await api.get('/instagram/comments', {
      params: params ?? {},
    });
    return data.data ?? data;
  },
  async replyPublic(id: string, text: string): Promise<IgComment> {
    const { data } = await api.post(`/instagram/comments/${id}/reply-public`, {
      text,
    });
    return data.data ?? data;
  },
  async replyDm(id: string, text?: string): Promise<IgComment> {
    const { data } = await api.post(
      `/instagram/comments/${id}/reply-dm`,
      text ? { text } : {},
    );
    return data.data ?? data;
  },
  async convertLead(id: string): Promise<IgComment> {
    const { data } = await api.post(
      `/instagram/comments/${id}/convert-lead`,
      {},
    );
    return data.data ?? data;
  },
};
