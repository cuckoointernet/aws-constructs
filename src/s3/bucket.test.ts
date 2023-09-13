/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Match, Template } from "aws-cdk-lib/assertions";
import { type Construct } from "constructs";
import { Bucket } from "./bucket";

const context = {
  ENVIRONMENT: "prod",
  CUSTOMER: "cuckoo",
  cuckoo: {
    prod: {
      logLevel: "debug",
    },
  },
};

describe("bucket", () => {
  describe("encryption", () => {
    it("should default to server-side encryption with a master key managed by S3", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: "AES256",
              },
            },
          ],
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new Bucket(this, "Bucket", {
            encryption: s3.BucketEncryption.KMS_MANAGED,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);

      template.hasResourceProperties("AWS::S3::Bucket", {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: "aws:kms",
              },
            },
          ],
        },
      });
    });
  });

  describe("enforceSSL", () => {
    it("should default to ensuring all data is transported securely", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: {
          Statement: [
            {
              Effect: "Deny",
              Principal: { AWS: "*" },
              Action: "s3:*",
              Resource: Match.arrayWith([
                { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                {
                  "Fn::Join": [
                    "",
                    [{ "Fn::GetAtt": [Match.anyValue(), "Arn"] }, "/*"],
                  ],
                },
              ]),
              Condition: { Bool: { "aws:SecureTransport": "false" } },
            },
          ],
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket", { enforceSSL: false });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourcePropertiesCountIs(
        "AWS::S3::BucketPolicy",
        {
          PolicyDocument: {
            Statement: [
              {
                Effect: "Deny",
                Principal: { AWS: "*" },
                Action: "s3:*",
                Resource: Match.arrayWith([
                  { "Fn::GetAtt": [Match.anyValue(), "Arn"] },
                ]),
                Condition: { Bool: { "aws:SecureTransport": "false" } },
              },
            ],
          },
        },
        0 // No such policy should be set on the bucket when enforceSSL is false
      );
    });
  });

  describe("blockPublicAccess", () => {
    it("should default to blocking public access to objects", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Bucket(this, "Bucket", {
            blockPublicAccess: undefined,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: Match.absent(),
      });
    });
  });

  describe("lifecycleRules", () => {
    const defaultExpectedLifecycleRules = {
      Rules: [
        {
          NoncurrentVersionTransitions: [
            {
              StorageClass: "STANDARD_IA",
              TransitionInDays: 90,
            },
            {
              StorageClass: "GLACIER_IR",
              TransitionInDays: 180,
            },
          ],
          Status: "Enabled",
          Transitions: [
            {
              StorageClass: "STANDARD_IA",
              TransitionInDays: 90,
            },
            {
              StorageClass: "GLACIER_IR",
              TransitionInDays: 180,
            },
          ],
        },
      ],
    };

    it("should default to configuring lifecycle rules for objects aged 90 and 180 days", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        LifecycleConfiguration: defaultExpectedLifecycleRules,
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new Bucket(this, "Bucket", {
            lifecycleRules: [
              {
                noncurrentVersionTransitions: [
                  {
                    storageClass: s3.StorageClass.GLACIER,
                    transitionAfter: cdk.Duration.days(90),
                  },
                ],
                transitions: [
                  {
                    storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                    transitionAfter: cdk.Duration.days(15),
                  },
                ],
              },
            ],
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        LifecycleConfiguration: {
          Rules: [
            {
              NoncurrentVersionTransitions: [
                {
                  StorageClass: "GLACIER",
                  TransitionInDays: 90,
                },
              ],
              Status: "Enabled",
              Transitions: [
                {
                  StorageClass: "STANDARD_IA",
                  TransitionInDays: 15,
                },
              ],
            },
          ],
        },
      });
    });
  });

  describe("versioned", () => {
    it("should default to enabling versioning", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);
          new Bucket(this, "Bucket");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);
      template.hasResourceProperties("AWS::S3::Bucket", {
        VersioningConfiguration: {
          Status: "Enabled",
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new Bucket(this, "Bucket", {
            versioned: false,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourceCountIs("AWS::S3::Bucket", 1);

      template.hasResourceProperties("AWS::S3::Bucket", {
        VersioningConfiguration: Match.absent(),
      });

      // Non-current object versions shouldn't have lifecycle rules applied when versioning is disabled
      template.hasResourceProperties("AWS::S3::Bucket", {
        LifecycleConfiguration: {
          Rules: [
            Match.not(
              Match.objectLike({
                NoncurrentVersionTransitions: Match.anyValue(),
              })
            ),
          ],
        },
      });
    });
  });
});
