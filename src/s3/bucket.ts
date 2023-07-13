import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

const BUCKET_TRANSITION_RULES = [
  {
    storageClass: s3.StorageClass.INFREQUENT_ACCESS,
    transitionAfter: Duration.days(90),
  },
  {
    storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
    transitionAfter: Duration.days(180),
  },
];

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html#construct-props), this construct will additionally configure the following for you:
 * - Versioning set to `true`.
 * - Public Access is blocked by default.
 * - Object encryption is on by default and S3 Managed.
 * - Encryption in transit is restricted to HTTPS
 * - Lifecycle rules are set by default on current & non-current object versions:
 *   - After 3 months (90 days) the version will transition to S3 Standard Infrequent Access.
 *   - After 6 months (180 days) the version will transition to Glacier Instant Retrieval.
 */
export class Bucket extends s3.Bucket {
  constructor(scope: Construct, id: string, props?: s3.BucketProps) {
    const defaultProps: s3.BucketProps = {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          noncurrentVersionTransitions: BUCKET_TRANSITION_RULES,
          transitions: BUCKET_TRANSITION_RULES,
        },
      ],
    };

    const mergedProps = {
      ...defaultProps,
      ...props,
    };

    // Note: transition rules for non-current object versions cannot be defined if versioning is turned off
    if (!mergedProps.versioned && mergedProps.lifecycleRules) {
      mergedProps.lifecycleRules[0] = {
        transitions: BUCKET_TRANSITION_RULES,
      };
    }

    super(scope, id, mergedProps);
  }
}
