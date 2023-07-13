/* eslint-disable no-new */
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { Capture, Match, Template } from "aws-cdk-lib/assertions";
import { Table } from "./table";

describe("table", () => {
  describe("pointInTimeRecovery", () => {
    it("should be set to true in production environments", () => {
      const app = new cdk.App({
        context: {
          ENVIRONMENT: "prod",
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Table(this, "Table", {
            partitionKey: {
              name: "foo",
              type: AttributeType.STRING,
            },
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    it("should be set to false in stage environments", () => {
      const app = new cdk.App({
        context: {
          ENVIRONMENT: "stage",
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Table(this, "Table", {
            partitionKey: {
              name: "foo",
              type: AttributeType.STRING,
            },
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
    });

    it("should be set to false in dev environments", () => {
      const app = new cdk.App({
        context: {
          ENVIRONMENT: "dev",
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Table(this, "Table", {
            partitionKey: {
              name: "foo",
              type: AttributeType.STRING,
            },
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::DynamoDB::Table", {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: false,
        },
      });
    });
  });
});
