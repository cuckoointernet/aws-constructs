import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { getContextByPath } from "../utils/context-by-path";

type CustomAlarmOptions = Omit<
  cloudwatch.CreateAlarmOptions,
  "alarmDescription"
>;

interface CustomStateMachineProps {
  failedExecutionsAlarmOptions?: CustomAlarmOptions;
  timedOutExecutionsAlarmOptions?: CustomAlarmOptions;
  disableAlarmNotifications?: boolean;
}

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.StateMachine.html#construct-props), this construct will additionally configure the following for you:
 * - State machine type set to Express
 * - Timeout default to 5 minutes
 * - X-Ray tracing enabled
 * - An alarm to report when an execution errors
 * - An alarm to report when an execution times out.
 * - Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
 * - You can override the default alarms by providing a 4th parameter to customise their configuration
 *
 * When specifying a log group be mindful of the best practice defined here; https://docs.aws.amazon.com/step-functions/latest/dg/bp-cwl.html. This however will fix your log group name which will block new deployments, see https://github.com/aws/aws-cdk/issues/19353 for future fix and workaround.
 */
export class StateMachine extends sfn.StateMachine {
  public readonly failedAlarm: cloudwatch.Alarm;
  public readonly timedOutAlarm: cloudwatch.Alarm;

  constructor(
    scope: Construct,
    id: string,
    props: sfn.StateMachineProps,
    customProps?: CustomStateMachineProps
  ) {
    const customer = scope.node.tryGetContext("CUSTOMER") as string | undefined;
    const environment = scope.node.tryGetContext("ENVIRONMENT") as
      | string
      | undefined;

    if (!customer || !environment) {
      throw new Error(
        "CDK context variables CUSTOMER and/or ENVIRONMENT were not defined"
      );
    }

    const defaultProps: Partial<sfn.StateMachineProps> = {
      timeout: cdk.Duration.minutes(5),
      stateMachineType: sfn.StateMachineType.EXPRESS,
      tracingEnabled: true,
    };

    const mergedProps = {
      ...defaultProps,
      ...props,
    };

    super(scope, id, mergedProps);

    const defaultFailedExecutionAlarmOptions: cloudwatch.CreateAlarmOptions = {
      alarmDescription: `Failed executions reported by ${id}`,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    };

    this.failedAlarm = this.metricFailed({
      statistic: "Maximum",
    }).createAlarm(this, "Failed Executions", {
      ...defaultFailedExecutionAlarmOptions,
      ...customProps?.failedExecutionsAlarmOptions,
    });

    const defaultTimedOutExecutionsAlarmOptions: cloudwatch.CreateAlarmOptions =
      {
        alarmDescription: `Timed out executions reported by ${id}`,
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      };

    this.timedOutAlarm = this.metricTimedOut({
      statistic: "Maximum",
    }).createAlarm(this, "Timed Out Executions", {
      ...defaultTimedOutExecutionsAlarmOptions,
      ...customProps?.timedOutExecutionsAlarmOptions,
    });

    const alarmNotificationsTopic = getContextByPath(
      this,
      `${customer}.${environment}.alarmNotificationsTopic`
    ) as string | undefined;

    if (alarmNotificationsTopic && !customProps?.disableAlarmNotifications) {
      const alarmTopicArn = cdk.Arn.format(
        {
          service: "sns",
          resource: alarmNotificationsTopic,
        },
        cdk.Stack.of(this)
      );

      const alarmTopic = sns.Topic.fromTopicArn(
        this,
        "AlarmNotificationsTopic",
        alarmTopicArn
      );

      this.failedAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
      this.timedOutAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    }
  }
}
