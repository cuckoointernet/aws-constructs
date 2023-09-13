import { type Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { getContextByPath } from "../utils/context-by-path";

type CustomAlarmOptions = Omit<
  cloudwatch.CreateAlarmOptions,
  "alarmDescription"
>;

type CustomQueueProps = {
  disableAlarmNotifications?: boolean;
  messagesNotVisibleAlarmOptions?: CustomAlarmOptions;
};

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props), this construct will additionally configure the following for you:
 * - Enforce SSL for data in transit.
 * - An alarm on the queue to report if the number of in-flight messages is close to the maximum allowed by SQS
 * - Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
 * - You can disable alarms by providing a 4th parameter.
 */
export class Queue extends sqs.Queue {
  public readonly numberMsgsNotVisibleAlarm: cloudwatch.Alarm;

  constructor(
    scope: Construct,
    id: string,
    props?: sqs.QueueProps,
    customProps?: CustomQueueProps
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

    const defaultProps: sqs.QueueProps = {
      enforceSSL: true,
    };

    super(scope, id, {
      ...defaultProps,
      ...props,
    });

    const defaultMessagesNotVisibleAlarmOptions: cloudwatch.CreateAlarmOptions =
      {
        alarmDescription: `In-flight messages close to maximum for ${id}`,
        threshold: 110_000, // Max for SQS is 120k, see: https://aws.amazon.com/sqs/faqs/#Limits_and_restrictions
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      };

    this.numberMsgsNotVisibleAlarm =
      this.metricApproximateNumberOfMessagesNotVisible().createAlarm(
        this,
        "ApproximateNumberOfMessagesNotVisible",
        {
          ...defaultMessagesNotVisibleAlarmOptions,
          ...customProps?.messagesNotVisibleAlarmOptions,
        }
      );

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

      this.numberMsgsNotVisibleAlarm.addAlarmAction(
        new cw_actions.SnsAction(alarmTopic)
      );
    }
  }
}
