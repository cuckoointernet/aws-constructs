/* eslint-disable no-new */
import * as cdk from "aws-cdk-lib";
import { type Construct } from "constructs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Match, Template } from "aws-cdk-lib/assertions";
import { TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { StateMachine } from "./state-machine";

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

describe("state machine", () => {
  describe("machine type", () => {
    it("should default to Express", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        StateMachineType: sfn.StateMachineType.EXPRESS,
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
            stateMachineType: sfn.StateMachineType.STANDARD,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        StateMachineType: sfn.StateMachineType.STANDARD,
      });
    });
  });

  describe("timeout", () => {
    it("should default to 5 minutes", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        DefinitionString: Match.stringLikeRegexp('\\"TimeoutSeconds\\":300'),
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
            timeout: cdk.Duration.minutes(4),
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        DefinitionString: Match.stringLikeRegexp('\\"TimeoutSeconds\\":240'),
      });
    });
  });

  describe("tracing", () => {
    it("should default to on", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        TracingConfiguration: {
          Enabled: true,
        },
      });
    });

    it("should be overridable via props", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
            tracingEnabled: false,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::StepFunctions::StateMachine", {
        TracingConfiguration: Match.absent(),
      });
    });
  });

  describe("alarms", () => {
    it("should configure a failed alarm", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsFailed",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins
        TreatMissingData: "notBreaching",
      });
    });

    it("should configure a timed out alarm", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name);

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsTimedOut",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 1,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        Period: 300, // 5 mins
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

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(
            this,
            "StateMachine",
            {
              definition,
            },
            {
              failedExecutionsAlarmOptions: {
                threshold: 2,
                evaluationPeriods: 5,
                datapointsToAlarm: 7,
                treatMissingData: TreatMissingData.BREACHING,
              },
              timedOutExecutionsAlarmOptions: {
                threshold: 2,
                evaluationPeriods: 5,
                datapointsToAlarm: 7,
                treatMissingData: TreatMissingData.BREACHING,
              },
            }
          );
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsFailed",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 2,
        EvaluationPeriods: 5,
        DatapointsToAlarm: 7,
        Period: 300, // 5 mins
        TreatMissingData: "breaching",
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsTimedOut",
        Statistic: "Maximum",
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        Threshold: 2,
        EvaluationPeriods: 5,
        DatapointsToAlarm: 7,
        Period: 300, // 5 mins
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

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsFailed",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsTimedOut",
        AlarmActions: [
          {
            "Fn::Join": ["", Match.arrayWith([":sns:", ":exampleSnsTopic"])],
          },
        ],
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

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(this, "StateMachine", {
            definition,
          });
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsFailed",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsTimedOut",
        AlarmActions: Match.absent(),
      });
    });

    it("should not configure notifications when 'disableAlarmNotifications' is true", () => {
      const app = new cdk.App({ context });

      class UnitTestStack extends cdk.Stack {
        constructor(scope: Construct) {
          super(scope, UnitTestStack.name, {
            env: {},
          });

          const definition = new sfn.Pass(this, "InitialPass");

          new StateMachine(
            this,
            "StateMachine",
            {
              definition,
            },
            {
              disableAlarmNotifications: true,
            }
          );
        }
      }

      const template = Template.fromStack(new UnitTestStack(app));

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsFailed",
        AlarmActions: Match.absent(),
      });

      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        MetricName: "ExecutionsTimedOut",
        AlarmActions: Match.absent(),
      });
    });
  });
});
