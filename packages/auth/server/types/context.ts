import type { RequestMetadata } from '@documenso/lib/universal/extract-request-metadata';

export type HonoAuthContext = {
  Bindings: object;
  Variables: {
    requestMetadata: RequestMetadata;
  };
};
