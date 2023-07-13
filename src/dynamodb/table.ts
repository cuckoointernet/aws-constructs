import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

/**
 * As well as the [usual defaults](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html#construct-props), this construct will additionally configure the following for you:
 * - (Production only) Set `pointInTimeRecovery` to `true`
 */
export class Table extends dynamodb.Table {
  constructor(scope: Construct, id: string, props: dynamodb.TableProps) {
    const environment = scope.node.tryGetContext("ENVIRONMENT") as
      | string
      | undefined;

    if (!environment) {
      throw new Error("CDK context variable ENVIRONMENT was not defined");
    }

    const defaultProps = {
      pointInTimeRecovery: environment === "prod",
    };

    super(scope, id, {
      ...defaultProps,
      ...props,
    });
  }
}
