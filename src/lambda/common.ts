import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import { getContextByPath } from "../utils";

type CustomAlarmOptions = Omit<
  cloudwatch.CreateAlarmOptions,
  "alarmDescription"
>;

export type CustomLambdaProps = {
  errorsAlarmOptions?: CustomAlarmOptions;
  throttlesAlarmOptions?: CustomAlarmOptions;
  durationAlarmOptions?: CustomAlarmOptions;
  memoryUtilizationAlarmOptions?: CustomAlarmOptions;
  disableAlarmNotifications?: boolean;
  ssmParameterPaths?: string[];
  runtime?: lambda.Runtime;
};

type AlarmOptions = {
  lambdaFunction: lambda.Function;
  id: string;
  timeout: cdk.Duration;
  insightsVersion: lambda.LambdaInsightsVersion | undefined;
  customer: string;
  environment: string;
} & CustomLambdaProps;

type Alarms = {
  throttlesAlarm: cloudwatch.Alarm;
  errorsAlarm: cloudwatch.Alarm;
  durationAlarm: cloudwatch.Alarm;
  memoryUtilizationAlarm: cloudwatch.Alarm | undefined;
};

export const createAlarms = ({
  lambdaFunction,
  id,
  timeout,
  insightsVersion,
  customer,
  environment,
  errorsAlarmOptions,
  durationAlarmOptions,
  throttlesAlarmOptions,
  memoryUtilizationAlarmOptions,
  disableAlarmNotifications,
}: AlarmOptions): Alarms => {
  // Error Alarm
  const defaultErrorAlarmOptions: cloudwatch.CreateAlarmOptions = {
    alarmDescription: `Lambda errors reported by ${id}`,
    threshold: 1,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  };

  const errorsAlarm = lambdaFunction
    .metricErrors({
      statistic: "Sum",
    })
    .createAlarm(lambdaFunction, "Errors", {
      ...defaultErrorAlarmOptions,
      ...errorsAlarmOptions,
    });

  // Duration alarm
  const defaultDurationAlarmOptions: cloudwatch.CreateAlarmOptions = {
    alarmDescription: `Lambda invocations close to reaching max timeout for ${id}`,
    threshold: timeout.toMilliseconds() * 0.75,
    evaluationPeriods: 1,
    datapointsToAlarm: 1,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  };

  const durationAlarm = lambdaFunction
    .metricDuration({
      statistic: "Maximum",
    })
    .createAlarm(lambdaFunction, "Duration", {
      ...defaultDurationAlarmOptions,
      ...durationAlarmOptions,
    });

  // Throttles alarm
  const defaultThrottlesAlarmOptions: cloudwatch.CreateAlarmOptions = {
    alarmDescription: `Lambda invocations consistently being throttled for ${id}`,
    threshold: 1,
    evaluationPeriods: 6,
    datapointsToAlarm: 4,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  };

  const throttlesAlarm = lambdaFunction
    .metricThrottles({
      statistic: "Maximum",
    })
    .createAlarm(lambdaFunction, "Throttles", {
      ...defaultThrottlesAlarmOptions,
      ...throttlesAlarmOptions,
    });

  // Memory utilization alarm
  let memoryUtilizationAlarm: cloudwatch.Alarm | undefined;
  if (insightsVersion) {
    const defaultMemoryUtilizationAlarmOptions: cloudwatch.CreateAlarmOptions =
      {
        alarmDescription: `Lambda memory utilization high for ${id}`,
        threshold: 75,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      };

    memoryUtilizationAlarm = new cloudwatch.Metric({
      namespace: "LambdaInsights",
      metricName: "memory_utilization",
      statistic: "Maximum",
      label: "Memory Utilization Percentage",
      dimensionsMap: {
        function_name: lambdaFunction.functionName,
      },
    })
      .attachTo(lambdaFunction)
      .createAlarm(lambdaFunction, "MemoryUtilization", {
        ...defaultMemoryUtilizationAlarmOptions,
        ...memoryUtilizationAlarmOptions,
      });
  }

  const alarmNotificationsTopic = getContextByPath(
    lambdaFunction,
    `${customer}.${environment}.alarmNotificationsTopic`
  ) as string | undefined;

  if (alarmNotificationsTopic && !disableAlarmNotifications) {
    const alarmTopicArn = cdk.Arn.format(
      {
        service: "sns",
        resource: alarmNotificationsTopic,
      },
      cdk.Stack.of(lambdaFunction)
    );

    const alarmTopic = sns.Topic.fromTopicArn(
      lambdaFunction,
      "AlarmNotificationsTopic",
      alarmTopicArn
    );

    errorsAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    errorsAlarm.addOkAction(new cw_actions.SnsAction(alarmTopic));
    durationAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    durationAlarm.addOkAction(new cw_actions.SnsAction(alarmTopic));
    throttlesAlarm.addAlarmAction(new cw_actions.SnsAction(alarmTopic));
    throttlesAlarm.addOkAction(new cw_actions.SnsAction(alarmTopic));

    if (memoryUtilizationAlarm) {
      memoryUtilizationAlarm.addAlarmAction(
        new cw_actions.SnsAction(alarmTopic)
      );
      memoryUtilizationAlarm.addOkAction(new cw_actions.SnsAction(alarmTopic));
    }
  }

  return {
    errorsAlarm,
    durationAlarm,
    throttlesAlarm,
    memoryUtilizationAlarm,
  };
};
