import { Trans } from '@lingui/react/macro';
import { RecipientRole } from '@prisma/client';
import { match } from 'ts-pattern';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentInviteProps {
  inviterName: string;
  inviterEmail: string;
  documentName: string;
  signDocumentLink: string;
  assetBaseUrl: string;
  role: RecipientRole;
  selfSigner: boolean;
  teamName?: string;
  includeSenderDetails?: boolean;
  organisationType?: OrganisationType;
}

export const TemplateDocumentInvite = ({
  documentName,
  signDocumentLink,
  assetBaseUrl,
  role,
}: TemplateDocumentInviteProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-primary">
          "{documentName}"
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          {match(role)
            .with(RecipientRole.SIGNER, () => <Trans>Continue by signing the document.</Trans>)
            .with(RecipientRole.VIEWER, () => <Trans>Continue by viewing the document.</Trans>)
            .with(RecipientRole.APPROVER, () => <Trans>Continue by approving the document.</Trans>)
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => (
              <Trans>Continue by assisting with the document.</Trans>
            ))
            .exhaustive()}
        </Text>

        <Section className="mb-4 mt-8 text-center">
          <Button
            className="text-sbase inline-flex items-center justify-center rounded-lg bg-documenso-500 px-6 py-3 text-center font-medium text-white no-underline"
            href={signDocumentLink}
          >
            {match(role)
              .with(RecipientRole.SIGNER, () => <Trans>Review and Sign Document</Trans>)
              .with(RecipientRole.VIEWER, () => <Trans>View Document</Trans>)
              .with(RecipientRole.APPROVER, () => <Trans>View Document to approve</Trans>)
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => <Trans>View Document to assist</Trans>)
              .exhaustive()}
          </Button>
        </Section>

        {role === RecipientRole.SIGNER && (
          <Text className="m-0 text-center text-xs text-slate-400">
            <Trans>
              This document is encrypted in transit and at rest. Compliant with applicable
              electronic signature regulations.
            </Trans>
          </Text>
        )}
      </Section>
    </>
  );
};

export default TemplateDocumentInvite;
