/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Match, Template } from "aws-cdk-lib/assertions";
import { TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { DeadLetterQueue } from "./dead-letter-queue";

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

describe("dead letter queue", () => {
  it("should setup with expected defaults", () => {
    const app = new cdk.App({ context });

    class UnitTestStack extends cdk.Stack {
      constructor(scope: Construct) {
        super(scope, UnitTestStack.name);

        new DeadLetterQueue(this, "ExampleDlq");
      }
    }

    const template = Template.fromStack(new UnitTestStack(app));

    template.hasResourceProperties("AWS::SQS::Queue", {
      MessageRetentionPeriod: cdk.Duration.days(14).toSeconds(),
    });

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
    it("should setup with expected defaults", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new DeadLetterQueue(this, "ExampleDlq", undefined, {});
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesVisible",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1,
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

          new DeadLetterQueue(this, "ExampleDlq", undefined, {
            messagesVisibleAlarmOptions: {
              threshold: 100,
              datapointsToAlarm: 3,
              evaluationPeriods: 5,
              treatMissingData: TreatMissingData.BREACHING,
            },
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesVisible",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 100,
        EvaluationPeriods: 5,
        DatapointsToAlarm: 3,
        Period: 300, // 5 mins (default)
        TreatMissingData: "breaching",
      });
    });
  });

  describe("alarm notifications", () => {
    it("should setup with expected defaults", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          new DeadLetterQueue(this, "ExampleDlq", undefined, {});
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Dimensions: [
          {
            Name: "QueueName",
            Value: {
              "Fn::GetAtt": Match.arrayWith([
                Match.stringLikeRegexp("ExampleDlq.*"),
              ]),
            },
          },
        ],
        MetricName: "ApproximateNumberOfMessagesVisible",
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

          new DeadLetterQueue(this, "ExampleDlq", undefined, {
            disableAlarmNotifications: true,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesVisible",
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

          new DeadLetterQueue(this, "ExampleDlq");
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ApproximateNumberOfMessagesVisible",
        AlarmActions: Match.absent(),
      });
    });
  });
});
