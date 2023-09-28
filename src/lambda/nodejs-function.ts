import { type Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import type * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
import { getContextByPath } from "../utils/context-by-path";
import { createAlarms } from "./common";

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type CustomAlarmOptions = Omit<
  cloudwatch.CreateAlarmOptions,
  "alarmDescription"
>;

type CustomLambdaProps = {
  errorsAlarmOptions?: CustomAlarmOptions;
  throttlesAlarmOptions?: CustomAlarmOptions;
  durationAlarmOptions?: CustomAlarmOptions;
  memoryUtilizationAlarmOptions?: CustomAlarmOptions;
  disableAlarmNotifications?: boolean;
  ssmParameterPaths?: string[];
};

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html#construct-props), this construct will additionally configure the following for you:
 * - Function description set to `${id}-${ENVIRONMENT}`
 * - Runtime set to Node v18
 * - Architecture set to arm64
 * - Log retention set to 6 months
 * - X-Ray tracing set to active
 * - Set an environment variable called `ENVIRONMENT` based on the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `ENVIRONMENT`
 * - Set an environment variable called `LOG_LEVEL` based on the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.logLevel` (Default: debug)
 * - An alarm to report when the function errors
 * - An alarm to report when the function execution times are approaching their max timeout (>75% threshold)
 * - An alarm to report when the function is repeatedly throttled
 * - An alarm to report when the function memory utilization is >75% (only available if `insightsVersion` is configured)
 * - Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
 * - You can override the default alarms by providing a 4th parameter to customise their configuration
 * - You can configure access to SSM Parameters by providing the `ssmParameterPaths` property via the 4th parameter
 */
export class NodejsFunction extends nodejs.NodejsFunction {
  public readonly throttlesAlarm: cloudwatch.Alarm;
  public readonly errorsAlarm: cloudwatch.Alarm;
  public readonly durationAlarm: cloudwatch.Alarm;
  public readonly memoryUtilizationAlarm: cloudwatch.Alarm | undefined;

  constructor(
    scope: Construct,
    id: string,
    props: PartialBy<nodejs.NodejsFunctionProps, "runtime">,
    customProps?: CustomLambdaProps
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

    const logLevel =
      (getContextByPath(
        scope,
        `${customer}.${environment}.logLevel`
      ) as string) ?? "debug";

    const defaultEnvironment: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: logLevel,
    };

    const defaultFunctionProps: Partial<nodejs.NodejsFunctionProps> = {
      architecture: lambda.Architecture.ARM_64,
      description: `${id}-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: logs.RetentionDays.SIX_MONTHS,
      tracing: lambda.Tracing.ACTIVE,
    };

    const mergedProps: nodejs.NodejsFunctionProps = {
      ...(defaultFunctionProps as nodejs.NodejsFunctionProps),
      ...props,
      environment: {
        ...defaultEnvironment,
        ...props.environment,
      },
    };

    const timeout = mergedProps.timeout ?? cdk.Duration.seconds(3);

    super(scope, id, mergedProps);

    const {
      errorsAlarm,
      durationAlarm,
      throttlesAlarm,
      memoryUtilizationAlarm,
    } = createAlarms({
      lambdaFunction: this,
      id,
      timeout,
      insightsVersion: mergedProps.insightsVersion,
      customer,
      environment,
      ...customProps,
    });

    this.errorsAlarm = errorsAlarm;
    this.durationAlarm = durationAlarm;
    this.throttlesAlarm = throttlesAlarm;

    if (memoryUtilizationAlarm) {
      this.memoryUtilizationAlarm = memoryUtilizationAlarm;
    }

    const ssmParameterPaths = customProps?.ssmParameterPaths ?? [];

    if (ssmParameterPaths.length > 0) {
      const ssmPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ],
        resources: ssmParameterPaths.map((parameterPath) =>
          cdk.Arn.format(
            {
              service: "ssm",
              resource: "parameter",
              resourceName: parameterPath,
            },
            cdk.Stack.of(scope)
          )
        ),
      });

      this.addToRolePolicy(ssmPolicy);
    }
  }
}
