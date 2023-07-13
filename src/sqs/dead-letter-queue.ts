import { Construct } from "constructs";
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

interface CustomQueueProps {
  disableAlarmNotifications?: boolean;
  messagesVisibleAlarmOptions?: CustomAlarmOptions;
}

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props), this construct will additionally configure the following for you:
 * - Retention period of 14 days.
 * - Enforce SSL for data in transit.
 * - An alarm on the queue to report on there are messages visible from the referenced Queue.
 * - Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
 * - You can disable alarms by providing a 4th parameter.
 */
export class DeadLetterQueue extends sqs.Queue {
  public readonly numberMsgsVisibleAlarm: cloudwatch.Alarm;

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
      retentionPeriod: cdk.Duration.days(14),
      enforceSSL: true,
    };

    // Ensure 'Dlq' is appended to avoid confusion with resource naming
    const dlqId = id.toLocaleLowerCase().endsWith("dlq") ? id : `${id}Dlq`;

    super(scope, dlqId, {
      ...defaultProps,
      ...props,
    });

    const defaultMessagesVisibleAlarmOptions: cloudwatch.CreateAlarmOptions = {
      alarmDescription: `Messages failed to be processed from ${id}`,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    };

    this.numberMsgsVisibleAlarm =
      this.metricApproximateNumberOfMessagesVisible().createAlarm(
        this,
        "ApproximateNumberOfMessagesVisible",
        {
          ...defaultMessagesVisibleAlarmOptions,
          ...customProps?.messagesVisibleAlarmOptions,
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

      this.numberMsgsVisibleAlarm.addAlarmAction(
        new cw_actions.SnsAction(alarmTopic)
      );
    }
  }
}
