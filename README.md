# AWS Constructs
This repo contains thin wrappers for CDK constructs to ensure a consistent standard is applied to generated cloud resources and to avoid repetitive boilerplate code.

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## Preamble
There are a few conventions when using this library to be aware of.

1. Constructs expect the CDK [context values](https://docs.aws.amazon.com/cdk/v2/guide/cli.html#w53aac33b7c33c11) `ENVIRONMENT` and `CUSTOMER` to be declared via the CLI:
   2. `ENVIRONMENT` - eg: `dev`, `stage`, `prod` etc but you can use whatever you want
   3. `CUSTOMER` - a string representing the end client of your software. This library is built with a SaaS mindset, where each customer can have their own configuration. If this doesn't apply to you we recommend simply using your own business name.
2. Your `cdk.context.json` [file](https://docs.aws.amazon.com/cdk/v2/guide/context.html) should adopt a structure of:

```json
{
  "cuckoo": {               // <--- customer(s)
    "prod": {               // <--- environment(s)
      "logLevel": "debug"   // <--- option(s)
    }
  }
}
```

Where a more complete example might look something like:

```json
{
  "cuckoo": {
    "dev": {
      "logLevel": "debug"
    },
    "prod": {
      "logLevel": "info"
    }
  },
  "acme": {
    "dev": {
      "logLevel": "info",
      "alarmNotificationsTopic": "acme-sns-topic-dev",
      "yourCustomOptions": "foo"
    },
    "prod": {
      "logLevel": "error",
      "alarmNotificationsTopic": "acme-sns-topic-prod",
      "yourCustomOptions": "bar"
    }
  }
}
```

## `lambda.Function`

As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html#construct-props), this construct will additionally configure the following for you:

- Function description set to `${id}-${ENVIRONMENT}`
- Runtime set to Node v18
- Architecture set to arm64
- Log retention set to 6 months
- X-Ray tracing set to active
- Set an environment variable called `ENVIRONMENT` based on the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `ENVIRONMENT`
- Set an environment variable called `LOG_LEVEL` based on the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.logLevel` (Default: debug)
- An alarm to report when the function errors
- An alarm to report when the function execution times are approaching their max timeout (>75% threshold)
- An alarm to report when the function is repeatedly throttled
- An alarm to report when the function memory utilization is >75% (only available if `insightsVersion` is configured)
- Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
- You can override the default alarms by providing a 4th parameter to customise their configuration
- You can configure access to SSM Parameters by providing the `ssmParameterPaths` property via the 4th parameter

### Usage

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleFunction extends AWSConstructs.lambda.Function {
  constructor(scope: Construct, id: string, props: lambda.FunctionProps, customProps?: CustomLambdaProps) {
    super(
      scope,
      ExampleFunction.name,
      {
        handler: "index.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../build")),

        // To override the default behaviour of this construct you can supply your own props here...
        // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Function.html#construct-props
      },
      {
        // Custom AWS Construct options
      }
    );
  }
}
```

## `sqs.Queue`

As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props), this construct will additionally configure the following for you:

- Enforce SSL for data in transit.
- An alarm on the queue to report if the number of in-flight messages is close to the maximum allowed by SQS
- Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
- You can customise or disable alarms by providing a 4th parameter.

### Usage

```typescript
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleQueue extends AWSConstructs.sqs.Queue {
  constructor(scope: Construct) {
    super(
      scope,
      ExampleQueue.name,
      {
        // To override the default behaviour of this construct you can supply your own props here...
        // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props
      },
      {
        // Custom AWS Construct options
      }
    );
  }
}
```

## `sqs.DeadLetterQueue`

The CDK doesn't include a DLQ construct out of the box, this is our take on what one should look like. As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props), this construct will additionally configure the following for you:

- Retention period of 14 days.
- Enforce SSL for data in transit.
- An alarm to report when the DLQ contains any messages
- Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
- You can customise or disable alarms by providing a 4th parameter.

### Usage

```typescript
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleDlq extends AWSConstructs.sqs.DeadLetterQueue {
  constructor(scope: Construct) {
    super(
      scope,
      ExampleDlq.name,
      {
        // To override the default behaviour of this construct you can supply your own props here...
        // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.Queue.html#construct-props
      },
      {
        // Custom AWS Construct options
      }
    );
  }
}
```

## `dynamodb.Table`

As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html#construct-props), this construct will additionally configure the following for you:

- (Production only) Set `pointInTimeRecovery` to `true`

### Usage

```typescript
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleTable extends AWSConstructs.dynamodb.Table {
  constructor(scope: Construct) {
    super(scope, ExampleTable.name, {
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },

      // To override the default behaviour of this construct you can supply your own props here...
      // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html#construct-props
    });
  }
}
```

## `s3.Bucket`

As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html#construct-props), this construct will additionally configure the following for you:

- Versioning set to `true`.
- Public Access is blocked by default.
- Object encryption is on by default and S3 Managed.
- Encryption in transit is restricted to HTTPS
- Lifecycle rules are set by default on current & non-current object versions:
  - After 3 months (90 days) the version will transition to S3 Standard Infrequent Access.
  - After 6 months (180 days) the version will transition to Glacier Instant Retrieval.

### Usage

```typescript
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleBucket extends AWSConstructs.s3.Bucket {
  constructor(scope: Construct) {
    super(scope, ExampleBucket.name, {
      // To override the default behaviour of this construct you can supply your own props here...
      // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html#construct-props
    });
  }
}
```

## `stepfunctions.StateMachine`

As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.StateMachine.html#construct-props), this construct will additionally configure the following for you:

- State machine type set to Express
- Timeout default to 5 minutes
- Creates a log group to capture:
- - All log levels
- - Execution data
- - Note; any overriding log group must be prefixed with '/aws/vendedlogs/states/'. See https://docs.aws.amazon.com/step-functions/latest/dg/bp-cwl.html.
- X-Ray tracing enabled
- An alarm to report when an execution errors
- An alarm to report when an execution times out.
- Alarms that trigger will send notifications to an SNS topic specified via the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html) value `<customer>.<environment>.alarmNotificationsTopic`
- You can override the default alarms by providing a 4th parameter to customise their configuration

### Usage

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as AWSConstructs from "@cuckoointernet/aws-constructs";

class ExampleStateMachine extends AWSConstructs.stepfunctions.StateMachine {
  constructor(scope: Constructid: string, props: sfn.StateMachineProps, customProps?: CustomStateMachineProps) {
    const definition = new sfn.Pass(scope, "InitialPass");

    super(
      scope,
      ExampleStateMachine.name,
      {
        definition,

        // To override the default behaviour of this construct you can supply your own props here...
        // See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.StateMachine.html#construct-props
      },
      {
        // Custom AWS Construct options
      }
    );
  }
}
```

## `utils.getContextByPath`

A utility function that can be used to retrieve a _nested_ value from the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html):

### Usage

Example `cdk.context.json`:

```json
{
  "cuckoo": {
    "prod": {
      "logLevel": "debug"
    }
  }
}
```

```typescript
import { utils } from "@cuckoointernet/aws-constructs";

const logLevel = utils.getContextByPath(
  scope,
  `cuckoo.prod.logLevel`
) as string; // => debug
```

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sekhavati"><img src="https://avatars.githubusercontent.com/u/16732873?v=4?s=100" width="100px;" alt="Amir Sekhavati"/><br /><sub><b>Amir Sekhavati</b></sub></a><br /><a href="https://github.com/cuckoointernet/aws-constructs/commits?author=sekhavati" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/elliotcmassey"><img src="https://avatars.githubusercontent.com/u/30092137?v=4?s=100" width="100px;" alt="Elliot Massey"/><br /><sub><b>Elliot Massey</b></sub></a><br /><a href="https://github.com/cuckoointernet/aws-constructs/commits?author=elliotcmassey" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
