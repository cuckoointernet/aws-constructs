/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import { type Construct } from "constructs";
import { Match, Template } from "aws-cdk-lib/assertions";
import { TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { Queue } from "./queue";

const context = {
  ENVIRONMENT: "prod",
  CUSTOMER: "cuckoo",
  cuckoo: {
    prod: {
      alarmNotificationsTopic: "exampleSnsTopic",
      logLevel: "debug",
    },
  },
};

describe("queue", () => {
  it("should setup with expected defaults", () => {
    const app = new cdk.App({ context });

    class UnitTestStack extends cdk.Stack {
      constructor(scope: Construct) {
        super(scope, UnitTestStack.name, {
          env: {},
        });

        new Queue(this, "ExampleQueue");
      }
    }

    const template = Template.fromStack(new UnitTestStack(app));

    template.resourceCountIs("AWS::SQS::Queue", 1);

    template.hasResourceProperties("AWS::SQS::QueuePolicy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "sqs:*",
            Condition: {
              Bool: {
                "aws:SecureTransport": "false",
              },
            },
            Effect: "Deny",
          },
        ],
      },
    });
  });

  describe("alarms", () => {
    it("should configure a non-visible messages alarm on the main queue", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Queue(this, "ExampleQueue");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 110_000,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins (default)
        TreatMissingData: "notBreaching",
      });
    });

    it("should override alarms if options are provided", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Queue(this, "ExampleQueue", undefined, {
            messagesNotVisibleAlarmOptions: {
              threshold: 10_000,
              datapointsToAlarm: 5,
              evaluationPeriods: 10,
              treatMissingData: TreatMissingData.MISSING,
            },
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 10_000,
        EvaluationPeriods: 10,
        DatapointsToAlarm: 5,
        Period: 300, // 5 mins (default)
        TreatMissingData: "missing",
      });
    });
  });

  describe("alarm notifications", () => {
    it("should configure notifications by default", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Queue(this, "ExampleQueue");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Dimensions: [
          {
            Name: "QueueName",
            Value: {
              "Fn::GetAtt": Match.arrayWith([
                Match.stringLikeRegexp("ExampleQueue.*"),
              ]),
            },
          },
        ],
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });
    });

    it("should not configure notifications if disabled prop provided", () => {
      const app = new cdk.App({
        context: {
          ...context,
          ENVIRONMENT: "dev",
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Queue(this, "ExampleQueue", undefined, {
            disableAlarmNotifications: true,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        AlarmActions: Match.absent(),
      });
    });

    it("should not configure notifications when 'alarmNotificationsTopic' is omitted in context", () => {
      const app = new cdk.App({
        context: {
          ENVIRONMENT: "prod",
          CUSTOMER: "cuckoo",
          cuckoo: {
            // Deliberately omit alarmNotificationsTopic property
            prod: {
              logLevel: "debug",
            },
          },
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new Queue(this, "ExampleQueue");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesNotVisible",
        AlarmActions: Match.absent(),
      });
    });
  });
});
