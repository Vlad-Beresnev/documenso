import { z } from 'zod';

import { ZDocumentMetaUpdateSchema } from '@documenso/lib/types/document-meta';

import { ZSuccessResponseSchema } from '../schema';
import type { TrpcRouteMeta } from '../trpc';
import { ZRecipientWithSigningUrlSchema } from './schema';

export const distributeEnvelopeMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/envelope/distribute',
    summary: 'Distribute envelope',
    description: 'Send the envelope to recipients based on your distribution method',
    tags: ['Envelope'],
  },
};

export const ZDistributeEnvelopeRequestSchema = z.object({
  envelopeId: z.string().describe('The ID of the envelope to send.'),
  senderName: z
    .string()
    .optional()
    .describe('Override the display name shown in the "Sent by" section of the signing email.'),
  senderEmail: z
    .string()
    .email()
    .optional()
    .describe('Override the display email shown in the "Sent by" section of the signing email.'),
  meta: ZDocumentMetaUpdateSchema.pick({
    subject: true,
    message: true,
    timezone: true,
    dateFormat: true,
    distributionMethod: true,
    redirectUrl: true,
    language: true,
    emailId: true,
    emailReplyTo: true,
    emailSettings: true,
  }).optional(),
});

export const ZDistributeEnvelopeResponseSchema = ZSuccessResponseSchema.extend({
  id: z.string().describe('The ID of the envelope that was sent.'),
  recipients: ZRecipientWithSigningUrlSchema.array(),
});

export type TDistributeEnvelopeRequest = z.infer<typeof ZDistributeEnvelopeRequestSchema>;
export type TDistributeEnvelopeResponse = z.infer<typeof ZDistributeEnvelopeResponseSchema>;
