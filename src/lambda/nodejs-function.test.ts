/* eslint-disable no-new, unicorn/prefer-module */
import path from "path";
import * as cdk from "aws-cdk-lib";
import { type Construct } from "constructs";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { NodejsFunction } from "./nodejs-function";

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

describe("NodejsFunction", () => {
  describe("description", () => {
    it("should default to constructor ID and env", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Description: "Function-prod",
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            description: "unrelated",
            entry: path.join(__dirname, "test/mock-handler.ts"),
            runtime: lambda.Runtime.NODEJS_12_X,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Description: "unrelated",
      });
    });
  });

  describe("runtime", () => {
    it("should default to Node 18", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Runtime: "nodejs18.x",
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            runtime: lambda.Runtime.NODEJS_12_X,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Runtime: "nodejs12.x",
      });
    });
  });

  describe("architecture", () => {
    it("should default to arm64", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Architectures: ["arm64"],
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            architecture: lambda.Architecture.X86_64,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));
      template.hasResourceProperties("AWS::Lambda::Function", {
        Architectures: ["x86_64"],
      });
    });
  });

  describe("logRetention", () => {
    it("should default to six months", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }
      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("Custom::LogRetention", {
        RetentionInDays: 180,
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            logRetention: RetentionDays.ONE_YEAR,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("Custom::LogRetention", {
        RetentionInDays: 365,
      });
    });
  });

  describe("environment variables", () => {
    it("should set ENVIRONMENT based on context value", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            ENVIRONMENT: "prod",
          },
        },
      });
    });

    it("should set LOG_LEVEL based on context value", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            LOG_LEVEL: "debug",
          },
        },
      });
    });

    it("should default LOG_LEVEL to 'debug' if no logLevel configured via context", () => {
      const app = new cdk.App({
        context: {
          ENVIRONMENT: "prod",
          CUSTOMER: "cuckoo",
          cuckoo: {
            prod: {
              alarmNotificationsTopic: "exampleSnsTopic",
              // Deliberately omit logLevel
            },
          },
        },
      });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: {
            LOG_LEVEL: "debug",
          },
        },
      });
    });
  });

  describe("alarms", () => {
    it("should configure an errors alarm", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Errors",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins
        TreatMissingData: "notBreaching",
      });
    });

    it("should configure a duration alarm", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Duration",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 2250, // 75% of default 3 second timeout
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins
        TreatMissingData: "notBreaching",
      });
    });

    it("should configure a throttles alarm", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Throttles",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1,
        EvaluationPeriods: 6,
        DatapointsToAlarm: 4,
        Period: 300, // 5 mins
        TreatMissingData: "notBreaching",
      });
    });

    it("should configure a memory utilization alarm if CloudWatch Lambda Insights is enabled", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "MyFunction", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Metrics: [
          {
            MetricStat: {
              Stat: "Maximum",
              Period: 300, // 5 mins
              Metric: {
                Namespace: "LambdaInsights",
                MetricName: "memory_utilization",
                Dimensions: [
                  {
                    Name: "function_name",
                    Value: { Ref: Match.stringLikeRegexp("^MyFunction.*") },
                  },
                ],
              },
            },
          },
        ],
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 75,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        TreatMissingData: "notBreaching",
      });
    });

    it("should not configure a memory utilization alarm if CloudWatch Lambda Insights is disabled", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "MyFunction", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            // Deliberately omit insightsVersion property
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.resourcePropertiesCountIs(
        "AWS::CloudWatch::Alarm",
        {
          Metrics: Match.arrayWith([
            Match.objectLike({
              MetricStat: {
                Metric: {
                  Namespace: "LambdaInsights",
                  MetricName: "memory_utilization",
                },
              },
            }),
          ]),
        },
        0
      );
    });

    it("should override alarms if options are provided", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(
            this,
            "MyFunction",
            {
              entry: path.join(__dirname, "test/mock-handler.ts"),
              insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            },
            {
              errorsAlarmOptions: {
                threshold: 2,
                evaluationPeriods: 5,
                datapointsToAlarm: 7,
                treatMissingData: TreatMissingData.BREACHING,
              },
              durationAlarmOptions: {
                threshold: cdk.Duration.seconds(3).toMilliseconds() * 0.4,
                evaluationPeriods: 4,
                datapointsToAlarm: 1,
              },
              memoryUtilizationAlarmOptions: {
                threshold: 50,
                evaluationPeriods: 6,
                datapointsToAlarm: 2,
              },
            }
          );
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Errors",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 2,
        EvaluationPeriods: 5,
        DatapointsToAlarm: 7,
        Period: 300, // 5 mins
        TreatMissingData: "breaching",
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Duration",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1200, // 40% of default 3 second timeout
        EvaluationPeriods: 4,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Metrics: [
          {
            MetricStat: {
              Stat: "Maximum",
              Period: 300, // 5 mins
              Metric: {
                Namespace: "LambdaInsights",
                MetricName: "memory_utilization",
                Dimensions: [
                  {
                    Name: "function_name",
                    Value: { Ref: Match.stringLikeRegexp("^MyFunction.*") },
                  },
                ],
              },
            },
          },
        ],
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 50,
        EvaluationPeriods: 6,
        DatapointsToAlarm: 2,
        TreatMissingData: "notBreaching",
      });
    });
  });

  describe("alarm notifications", () => {
    it("should configure notifications by default", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Errors",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Duration",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Throttles",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Metrics: Match.arrayWith([
          Match.objectLike({
            MetricStat: {
              Metric: {
                Namespace: "LambdaInsights",
                MetricName: "memory_utilization",
              },
            },
          }),
        ]),
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });
    });

    it("should not configure notifications when 'alarmNotificationsTopic' is omitted in the context", () => {
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
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Errors",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Duration",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Throttles",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Metrics: Match.arrayWith([
          Match.objectLike({
            MetricStat: {
              Metric: {
                Namespace: "LambdaInsights",
                MetricName: "memory_utilization",
              },
            },
          }),
        ]),
        AlarmActions: Match.absent(),
      });
    });

    it("should not configure notifications when 'disableAlarmNotifications' is true", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(
            this,
            "Function",
            {
              entry: path.join(__dirname, "test/mock-handler.ts"),
              insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_135_0,
            },
            {
              disableAlarmNotifications: true,
            }
          );
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Errors",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Duration",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "Throttles",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Metrics: Match.arrayWith([
          Match.objectLike({
            MetricStat: {
              Metric: {
                Namespace: "LambdaInsights",
                MetricName: "memory_utilization",
              },
            },
          }),
        ]),
        AlarmActions: Match.absent(),
      });
    });
  });

  describe("tracing", () => {
    it("should default to active x-ray tracing", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        TracingConfig: {
          Mode: "Active",
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(this, "Function", {
            entry: path.join(__dirname, "test/mock-handler.ts"),
            tracing: lambda.Tracing.PASS_THROUGH,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::Lambda::Function", {
        TracingConfig: {
          Mode: "PassThrough",
        },
      });
    });
  });

  describe("policies", () => {
    it("should add the SSM Get parameter policy if the SSM parameter path is passed", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          new NodejsFunction(
            this,
            "Function",
            {
              entry: path.join(__dirname, "test/mock-handler.ts"),
            },
            {
              ssmParameterPaths: [
                "example-path/for-ssm-parameter1",
                "example-path/for-ssm-parameter2/*",
              ],
            }
          );
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:GetParametersByPath",
              ],
              Effect: "Allow",
              Resource: [
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition",
                      },
                      ":ssm:",
                      {
                        Ref: "AWS::Region",
                      },
                      ":",
                      {
                        Ref: "AWS::AccountId",
                      },
                      ":parameter/example-path/for-ssm-parameter1",
                    ],
                  ],
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:",
                      {
                        Ref: "AWS::Partition",
                      },
                      ":ssm:",
                      {
                        Ref: "AWS::Region",
                      },
                      ":",
                      {
                        Ref: "AWS::AccountId",
                      },
                      ":parameter/example-path/for-ssm-parameter2/*",
                    ],
                  ],
                },
              ],
            },
          ]),
        },
      });
    });
  });
});
