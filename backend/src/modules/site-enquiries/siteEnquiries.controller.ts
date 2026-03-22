import { Request, Response } from 'express';
import { siteEnquiriesService } from './siteEnquiries.service';

export const siteEnquiriesController = {
  submit: async (req: Request, res: Response) => {
    try {
      const { enquiryType, fullName, phone, email, subject, message, ...rest } = req.body;
      if (!enquiryType || !fullName || !phone) {
        return res.status(400).json({ error: 'enquiryType, fullName, phone are required' });
      }
      const item = await siteEnquiriesService.submit({
        enquiryType, fullName, phone, email, subject, message,
        metaJson: rest,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error('[SiteEnquiries] submit error:', err);
      res.status(500).json({ error: 'Failed to submit enquiry' });
    }
  },

  list: async (req: Request, res: Response) => {
    try {
      res.json(await siteEnquiriesService.list(
        req.query.type as string,
        req.query.status as string,
      ));
    } catch (err) { res.status(500).json({ error: 'Failed to list enquiries' }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const item = await siteEnquiriesService.getById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(item);
    } catch (err) { res.status(500).json({ error: 'Failed to get enquiry' }); }
  },

  update: async (req: Request, res: Response) => {
    try { res.json(await siteEnquiriesService.update(Number(req.params.id), req.body)); }
    catch (err) { res.status(500).json({ error: 'Failed to update enquiry' }); }
  },
};
